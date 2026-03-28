import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { labRooms, type LabRoom, type Alert, type IoTDevice, type Equipment, type Actuator } from '../data/labData';
import { appApi } from '../services/appApi';
import {
  mqttTelemetryEnabled,
  subscribeMqttTelemetry,
  type MqttTelemetryMessage,
} from '../services/mqttTelemetry';
import type { ManagedUser } from '../types/auth';

export type { ManagedUser };

interface AppDataContextType {
  labs: LabRoom[];
  setLabs: React.Dispatch<React.SetStateAction<LabRoom[]>>;
  users: ManagedUser[];
  addUser: (user: ManagedUser) => void;
  updateUser: (userId: string, updates: Partial<ManagedUser>) => void;
  deleteUser: (userId: string) => void;
  updateRoom: (roomId: string, updater: (room: LabRoom) => LabRoom) => void;
  toggleEquipmentMode: (roomId: string, equipmentId: string) => void;
  acknowledgeAlert: (alertId: string, actorName: string) => boolean;
  acknowledgeAllAlerts: (actorName: string, options?: { roomId?: string; severity?: Alert['severity'] }) => number;
  addIoTDevice: (roomId: string, device: Partial<IoTDevice>) => { success: boolean; error?: string };
  addEquipment: (roomId: string, equipment: Partial<Equipment>) => { success: boolean; error?: string };
  addActuator: (roomId: string, actuator: Partial<Actuator>) => { success: boolean; error?: string };
  resetLabs: () => void;
  isLoading: boolean;
  error: string | null;
}

const isTemperatureOptimal = (value: number) => value >= 20 && value <= 24;
const isHumidityOptimal = (value: number) => value >= 40 && value <= 60;
const isCO2Optimal = (value: number) => value < 500;
const mqttLabId = import.meta.env.VITE_MQTT_LAB_ID?.toString() ?? 'lab-01';
const mqttTemperatureEpsilon = Number(import.meta.env.VITE_MQTT_TEMP_EPSILON ?? '0.1');
const mqttHumidityEpsilon = Number(import.meta.env.VITE_MQTT_HUMIDITY_EPSILON ?? '1');
const mqttLightEpsilon = Number(import.meta.env.VITE_MQTT_LIGHT_EPSILON ?? '5');
const mqttAirEpsilon = Number(import.meta.env.VITE_MQTT_AIR_EPSILON ?? '5');

const hasSignificantChange = (
  currentValue: number,
  nextValue: number,
  epsilon: number,
) => Math.abs(currentValue - nextValue) >= Math.max(0, epsilon);

const parseNumberPayload = (payload: string): number | null => {
  const value = Number(payload);
  return Number.isFinite(value) ? value : null;
};

const parseBooleanPayload = (payload: string): boolean | null => {
  const normalized = payload.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'detected'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'none', 'clear'].includes(normalized)) return false;
  return null;
};

const parseModePayload = (payload: string): 'auto' | 'manual' | null => {
  const normalized = payload.trim().toLowerCase();
  if (normalized === 'auto') return 'auto';
  if (normalized === 'manual') return 'manual';
  return null;
};

const alertTopicMap: Record<string, { reasonCode: string; field: string }> = {
  'esp32SLG4/alertst': { reasonCode: 'TEMP_THRESHOLD', field: 'temperature' },
  'esp32SLG4/alertsh': { reasonCode: 'HUMIDITY_THRESHOLD', field: 'humidity' },
  'esp32SLG4/alertsl': { reasonCode: 'LIGHT_THRESHOLD', field: 'light' },
  'esp32SLG4/alertsa': { reasonCode: 'AIR_THRESHOLD', field: 'air' },
};

const parseSensorHealthStatus = (
  payload: string,
): IoTDevice['status'] | null => {
  const normalized = payload.trim().toLowerCase();
  if (['online', 'ok', 'healthy', '1', 'true'].includes(normalized)) return 'online';
  if (['warning', 'degraded'].includes(normalized)) return 'warning';
  if (['offline', '0', 'false'].includes(normalized)) return 'offline';
  if (['error', 'failed'].includes(normalized)) return 'error';
  return null;
};

const sensorTopicNameMap: Record<string, string> = {
  oled: 'OLED Display',
  dht: 'DHT Sensor',
  bh1750: 'BH1750 Light Sensor',
  radar: 'Radar Presence Sensor',
  mq135: 'MQ135 Air Sensor',
};

const MAX_ALERTS_PER_ROOM = 100;
const EVENT_LIKE_TOPICS = new Set<string>([
  'esp32SLG4/commands',
  'esp32SLG4/alertst',
  'esp32SLG4/alertsh',
  'esp32SLG4/alertsl',
  'esp32SLG4/alertsa',
]);

const upsertAlertFromTopic = (room: LabRoom, topic: string, payload: string): LabRoom => {
  const alertMeta = alertTopicMap[topic];
  if (!alertMeta) return room;

  const active = parseBooleanPayload(payload);
  const shouldRaise = active ?? payload.length > 0;

  if (!shouldRaise) {
    return room;
  }

  const existing = room.alerts.find(
    (alert) => alert.reasonCode === alertMeta.reasonCode && !alert.acknowledged,
  );

  if (existing) {
    return room;
  }

  const now = new Date().toISOString();
  const newAlert: Alert = {
    id: `mqtt-alert-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: 'warning',
    severity: 'medium',
    message: `Threshold alert on ${alertMeta.field}${payload ? `: ${payload}` : ''}`,
    reasonCode: alertMeta.reasonCode,
    timestamp: now,
    acknowledged: false,
    autoResolved: false,
    roomId: room.id,
  };

  return {
    ...room,
    alerts: [newAlert, ...room.alerts].slice(0, MAX_ALERTS_PER_ROOM),
  };
};

const applyMqttMessageToRoom = (room: LabRoom, message: MqttTelemetryMessage): LabRoom => {
  let nextRoom = room;

  switch (message.topic) {
    case 'esp32SLG4/presence': {
      const value = parseBooleanPayload(message.payload);
      if (value === null) return room;
      if (nextRoom.presenceDetected === value) return room;
      nextRoom = { ...nextRoom, presenceDetected: value };
      break;
    }
    case 'esp32SLG4/mode': {
      const mode = parseModePayload(message.payload);
      if (!mode) return room;
      const hasEquipmentModeChange = nextRoom.equipment.some((item) => item.mode !== mode);
      const hasActuatorModeChange = nextRoom.actuators.some((item) => item.mode !== mode);
      if (!hasEquipmentModeChange && !hasActuatorModeChange) return room;
      nextRoom = {
        ...nextRoom,
        equipment: nextRoom.equipment.map((item) => ({ ...item, mode })),
        actuators: nextRoom.actuators.map((item) => ({ ...item, mode })),
      };
      break;
    }
    case 'esp32SLG4/temperate': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.temperature, value, mqttTemperatureEpsilon)) return room;
      nextRoom = { ...nextRoom, temperature: value };
      break;
    }
    case 'esp32SLG4/humidity': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.humidity, value, mqttHumidityEpsilon)) return room;
      nextRoom = { ...nextRoom, humidity: value };
      break;
    }
    case 'esp32SLG4/light': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.lightLevel, value, mqttLightEpsilon)) return room;
      nextRoom = { ...nextRoom, lightLevel: value };
      break;
    }
    case 'esp32SLG4/air': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.co2Level, value, mqttAirEpsilon)) return room;
      nextRoom = { ...nextRoom, co2Level: value };
      break;
    }
    case 'esp32SLG4/counter': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      const rounded = Math.max(0, Math.round(value));
      const nextOccupancy = Math.min(nextRoom.maxOccupancy, rounded);
      if (nextRoom.occupancy === nextOccupancy) return room;
      nextRoom = {
        ...nextRoom,
        occupancy: nextOccupancy,
      };
      break;
    }
    case 'esp32SLG4/commands': {
      const commandAlert: Alert = {
        id: `mqtt-cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: 'info',
        severity: 'low',
        message: `Command received: ${message.payload || 'n/a'}`,
        reasonCode: 'MQTT_COMMAND',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        autoResolved: false,
        roomId: nextRoom.id,
      };

      nextRoom = {
        ...nextRoom,
        alerts: [
          commandAlert,
          ...nextRoom.alerts,
        ].slice(0, MAX_ALERTS_PER_ROOM),
      };
      break;
    }
    default:
      if (message.topic.startsWith('esp32SLG4/status/')) {
        const sensorKey = message.topic.split('/').pop() ?? '';
        const mappedName = sensorTopicNameMap[sensorKey] ?? sensorKey.toUpperCase();
        const nextStatus = parseSensorHealthStatus(message.payload);
        if (!nextStatus) return room;

        const existingDevice = nextRoom.iotDevices.find((item) => item.name === mappedName);
        if (existingDevice) {
          if (existingDevice.status === nextStatus) {
            return room;
          }
          nextRoom = {
            ...nextRoom,
            iotDevices: nextRoom.iotDevices.map((item) =>
              item.name === mappedName
                ? { ...item, status: nextStatus, lastSeen: message.receivedAt }
                : item,
            ),
          };
        } else {
          nextRoom = {
            ...nextRoom,
            iotDevices: [
              ...nextRoom.iotDevices,
              {
                id: `iot-${sensorKey}-${Date.now()}`,
                name: mappedName,
                type: 'sensor',
                status: nextStatus,
                lastSeen: message.receivedAt,
                signalStrength: 100,
                firmwareVersion: 'mqtt-live',
                dataRate: 1,
                location: 'MQTT source',
              },
            ],
          };
        }
      }
      break;
  }

  nextRoom = upsertAlertFromTopic(nextRoom, message.topic, message.payload);
  return applyDerivedStatus(nextRoom);
};

const applyMqttMessagesToRoom = (
  room: LabRoom,
  messages: MqttTelemetryMessage[],
): LabRoom => messages.reduce((nextRoom, message) => applyMqttMessageToRoom(nextRoom, message), room);

const applyDerivedStatus = (room: LabRoom): LabRoom => {
  const warningCount = [
    !isTemperatureOptimal(room.temperature),
    !isHumidityOptimal(room.humidity),
    !isCO2Optimal(room.co2Level),
  ].filter(Boolean).length;

  const nextStatus: LabRoom['status'] =
    warningCount > 1 ? 'critical' : warningCount > 0 ? 'warning' : 'optimal';

  return {
    ...room,
    status: nextStatus,
  };
};

const applyDerivedStatusToLabs = (rooms: LabRoom[]): LabRoom[] =>
  rooms.map((room) => applyDerivedStatus(room));

const cloneInitialLabs = (): LabRoom[] =>
  labRooms.map((room) => ({
    ...room,
    equipment: room.equipment.map((eq) => ({ ...eq })),
    alerts: room.alerts.map((alert) => ({ ...alert })),
    iotDevices: room.iotDevices.map((device) => ({ ...device })),
    actuators: room.actuators.map((actuator) => ({ ...actuator })),
  }));

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [labs, setLabs] = useState<LabRoom[]>(cloneInitialLabs());
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mqttMessageQueueRef = useRef<MqttTelemetryMessage[]>([]);
  const mqttFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mqttLastPayloadByTopicRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setError(null);
      try {
        const [loadedLabs, loadedUsers] = await Promise.all([
          appApi.getLabs(),
          appApi.getManagedUsers(),
        ]);

        if (!isMounted) return;
        setLabs(applyDerivedStatusToLabs(loadedLabs.length > 0 ? loadedLabs : cloneInitialLabs()));
        setUsers(loadedUsers);
      } catch {
        if (!isMounted) return;
        setError('Failed to load application data. Using fallback state.');
        setLabs(applyDerivedStatusToLabs(cloneInitialLabs()));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mqttTelemetryEnabled()) {
      return;
    }

    const unsubscribe = subscribeMqttTelemetry({
      onConnect: () => {
        setError(null);
      },
      onError: (nextError) => {
        setError(nextError);
      },
      onMessage: (message) => {
        const shouldAlwaysProcess =
          EVENT_LIKE_TOPICS.has(message.topic) || message.topic.startsWith('esp32SLG4/status/');
        if (!shouldAlwaysProcess) {
          const previousPayload = mqttLastPayloadByTopicRef.current[message.topic];
          if (previousPayload === message.payload) {
            return;
          }
          mqttLastPayloadByTopicRef.current[message.topic] = message.payload;
        }

        mqttMessageQueueRef.current.push(message);

        if (mqttFlushTimerRef.current) {
          return;
        }

        mqttFlushTimerRef.current = setTimeout(() => {
          const queuedMessages = mqttMessageQueueRef.current;
          mqttMessageQueueRef.current = [];
          mqttFlushTimerRef.current = null;

          if (queuedMessages.length === 0) {
            return;
          }

          setLabs((prev) =>
            prev.map((room) =>
              room.id === mqttLabId ? applyMqttMessagesToRoom(room, queuedMessages) : room,
            ),
          );
        }, 200);
      },
    });

    return () => {
      if (mqttFlushTimerRef.current) {
        clearTimeout(mqttFlushTimerRef.current);
        mqttFlushTimerRef.current = null;
      }
      mqttMessageQueueRef.current = [];
      mqttLastPayloadByTopicRef.current = {};
      unsubscribe();
    };
  }, []);

  const addUser = (user: ManagedUser) => {
    let previousUsers: ManagedUser[] = [];
    setUsers((prev) => {
      previousUsers = prev;
      return [...prev, user];
    });
    setError(null);
    void appApi.createManagedUser(user).catch(() => {
      setError('Failed to save new user. Please retry.');
      setUsers(previousUsers);
    });
  };

  const updateUser = (userId: string, updates: Partial<ManagedUser>) => {
    let previousUsers: ManagedUser[] = [];
    setUsers((prev) => {
      previousUsers = prev;
      return prev.map((user) => (user.id === userId ? { ...user, ...updates } : user));
    });
    setError(null);
    void appApi.updateManagedUser(userId, updates).catch(() => {
      setError('Failed to update user.');
      setUsers(previousUsers);
    });
  };

  const deleteUser = (userId: string) => {
    let previousUsers: ManagedUser[] = [];
    setUsers((prev) => {
      previousUsers = prev;
      return prev.filter((user) => user.id !== userId);
    });
    setError(null);
    void appApi.deleteManagedUser(userId).catch(() => {
      setError('Failed to delete user.');
      setUsers(previousUsers);
    });
  };

  const updateRoom = (roomId: string, updater: (room: LabRoom) => LabRoom) => {
    let previousLabs: LabRoom[] = [];
    let nextLabs: LabRoom[] = [];

    setLabs((prev) => {
      previousLabs = prev;
      nextLabs = prev.map((room) =>
        room.id === roomId ? applyDerivedStatus(updater(room)) : room,
      );
      return nextLabs;
    });
    setError(null);
    void appApi.saveLabs(nextLabs).catch(() => {
      setError('Failed to save lab changes.');
      setLabs(previousLabs);
    });
  };

  const toggleEquipmentMode = (roomId: string, equipmentId: string) => {
    updateRoom(roomId, (room) => ({
      ...room,
      equipment: room.equipment.map((eq) =>
        eq.id === equipmentId
          ? { ...eq, mode: eq.mode === 'auto' ? 'manual' : 'auto' }
          : eq,
      ),
    }));
  };

  const acknowledgeAlert = (alertId: string, actorName: string): boolean => {
    let updated = false;

    setLabs((prev) =>
      prev.map((room) => ({
        ...room,
        alerts: room.alerts.map((alert) => {
          if (alert.id !== alertId || alert.acknowledged) return alert;
          updated = true;
          return {
            ...alert,
            acknowledged: true,
            acknowledgedBy: actorName,
            acknowledgedAt: new Date().toISOString(),
          };
        }),
      })),
    );

    return updated;
  };

  const acknowledgeAllAlerts = (
    actorName: string,
    options?: { roomId?: string; severity?: Alert['severity'] },
  ): number => {
    let count = 0;

    setLabs((prev) =>
      prev.map((room) => {
        if (options?.roomId && room.id !== options.roomId) return room;

        return {
          ...room,
          alerts: room.alerts.map((alert) => {
            const severityMatch = !options?.severity || alert.severity === options.severity;
            if (alert.acknowledged || !severityMatch) return alert;

            count += 1;
            return {
              ...alert,
              acknowledged: true,
              acknowledgedBy: actorName,
              acknowledgedAt: new Date().toISOString(),
            };
          }),
        };
      }),
    );

    return count;
  };

  const addIoTDevice = (roomId: string, device: Partial<IoTDevice>): { success: boolean; error?: string } => {
    try {
      let nextLabs: LabRoom[] = [];
      setLabs((prev) => {
        nextLabs = prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                iotDevices: [...room.iotDevices, appApi.createIoTDeviceWithDefaults(device)],
              }
            : room,
        );
        return nextLabs;
      });
      setError(null);
      void appApi.saveLabs(nextLabs).catch(() => {
        setError('Failed to save IoT device.');
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add IoT device';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const addEquipment = (roomId: string, equipment: Partial<Equipment>): { success: boolean; error?: string } => {
    try {
      let nextLabs: LabRoom[] = [];
      setLabs((prev) => {
        nextLabs = prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                equipment: [...room.equipment, appApi.createEquipmentWithDefaults(equipment)],
              }
            : room,
        );
        return nextLabs;
      });
      setError(null);
      void appApi.saveLabs(nextLabs).catch(() => {
        setError('Failed to save equipment.');
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add equipment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const addActuator = (roomId: string, actuator: Partial<Actuator>): { success: boolean; error?: string } => {
    try {
      const id = actuator.id || appApi.generateDeviceId('equipment');
      const newActuator: Actuator = {
        id,
        name: actuator.name || 'Unnamed Actuator',
        type: actuator.type || 'hvac',
        status: actuator.status || 'off',
        mode: actuator.mode || 'auto',
        lastActivated: actuator.lastActivated,
      };

      let nextLabs: LabRoom[] = [];
      setLabs((prev) => {
        nextLabs = prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                actuators: [...room.actuators, newActuator],
              }
            : room,
        );
        return nextLabs;
      });
      setError(null);
      void appApi.saveLabs(nextLabs).catch(() => {
        setError('Failed to save actuator.');
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add actuator';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetLabs = () => {
    setError(null);
    void appApi
      .resetLabs()
      .then((resetData) => setLabs(applyDerivedStatusToLabs(resetData)))
      .catch(() => setError('Failed to reset labs.'));
  };

  const value = useMemo(
    () => ({
      labs,
      setLabs,
      users,
      addUser,
      updateUser,
      deleteUser,
      updateRoom,
      toggleEquipmentMode,
      acknowledgeAlert,
      acknowledgeAllAlerts,
      addIoTDevice,
      addEquipment,
      addActuator,
      resetLabs,
      isLoading,
      error,
    }),
    [labs, users, isLoading, error],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }

  return context;
}
