import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { labRooms, type LabRoom, type Alert, type IoTDevice, type Equipment, type Actuator } from '../data/labData';
import { appApi } from '../services/appApi';
import { publishMqttCommand } from '../services/mqttTelemetry';
import { useDataLog } from './DataLogContext';
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
const hasTemperatureReading = (value: number) => Number.isFinite(value) && value > 0;
const hasHumidityReading = (value: number) => Number.isFinite(value) && value > 0;
const hasCO2Reading = (value: number) => Number.isFinite(value) && value > 0;
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
  if (Number.isFinite(value)) return value;

  try {
    const parsed = JSON.parse(payload) as { value?: unknown; data?: unknown; v?: unknown };
    const candidates = [parsed?.value, parsed?.data, parsed?.v];
    for (const candidate of candidates) {
      const next = Number(candidate);
      if (Number.isFinite(next)) return next;
    }
  } catch {
    // ignore invalid JSON payloads and fall through
  }

  return null;
};

const parseBooleanPayload = (payload: string): boolean | null => {
  const normalized = payload.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'detected'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'none', 'clear'].includes(normalized)) return false;

  try {
    const parsed = JSON.parse(payload) as { value?: unknown; data?: unknown; active?: unknown };
    const source = String(parsed?.value ?? parsed?.data ?? parsed?.active ?? '').trim().toLowerCase();
    if (['1', 'true', 'on', 'yes', 'detected'].includes(source)) return true;
    if (['0', 'false', 'off', 'no', 'none', 'clear'].includes(source)) return false;
  } catch {
    // ignore invalid JSON payloads and fall through
  }

  return null;
};

const parseModePayload = (payload: string): 'auto' | 'manual' | null => {
  const normalized = payload.trim().toLowerCase();
  if (normalized === 'auto') return 'auto';
  if (normalized === 'manual') return 'manual';

  try {
    const parsed = JSON.parse(payload) as { mode?: unknown; value?: unknown };
    const source = String(parsed?.mode ?? parsed?.value ?? '').trim().toLowerCase();
    if (source === 'auto') return 'auto';
    if (source === 'manual') return 'manual';
  } catch {
    // ignore invalid JSON payloads and fall through
  }

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
  if (['online', 'ok', 'healthy', 'connected', 'on', '1', 'true'].includes(normalized)) return 'online';
  if (['warning', 'degraded'].includes(normalized)) return 'warning';
  if (['offline', 'disconnected', 'off', '0', 'false'].includes(normalized)) return 'offline';
  if (['error', 'failed'].includes(normalized)) return 'error';
  return null;
};

type ExternalPowerOffCommand = {
  appliesToAll: boolean;
  targetType: 'any' | 'equipment' | 'actuator';
  targetIds: Set<string>;
  targetNames: Set<string>;
};

const normalizeDeviceKey = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '');

const isPowerOffToken = (value: string) =>
  ['off', 'false', '0', 'disable', 'disabled', 'turnoff', 'poweroff', 'shutdown', 'stop'].includes(
    value,
  );

const collectTargets = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (raw === null || raw === undefined) {
    return [];
  }

  return String(raw)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseExternalPowerOffCommand = (payload: string): ExternalPowerOffCommand | null => {
  const normalizedPayload = payload.trim().toLowerCase();
  if (!normalizedPayload) {
    return null;
  }

  const parseTargetType = (rawType: unknown): ExternalPowerOffCommand['targetType'] => {
    const normalizedType = String(rawType ?? '')
      .trim()
      .toLowerCase();
    if (normalizedType === 'equipment') return 'equipment';
    if (normalizedType === 'actuator' || normalizedType === 'actuators') return 'actuator';
    return 'any';
  };

  try {
    const parsed = JSON.parse(payload) as {
      action?: unknown;
      command?: unknown;
      cmd?: unknown;
      status?: unknown;
      state?: unknown;
      power?: unknown;
      value?: unknown;
      target?: unknown;
      device?: unknown;
      id?: unknown;
      name?: unknown;
      type?: unknown;
      deviceType?: unknown;
      all?: unknown;
    };

    const tokens = [
      parsed.action,
      parsed.command,
      parsed.cmd,
      parsed.status,
      parsed.state,
      parsed.power,
      parsed.value,
    ]
      .map((item) => String(item ?? '').trim().toLowerCase())
      .filter(Boolean)
      .map((item) => item.replace(/[\s_-]+/g, ''));

    const isPowerOff = tokens.some((token) => isPowerOffToken(token));
    if (!isPowerOff) {
      return null;
    }

    const targetType = parseTargetType(parsed.deviceType ?? parsed.type);
    const targetCandidates = [parsed.target, parsed.device, parsed.id, parsed.name]
      .flatMap((item) => collectTargets(item))
      .filter(Boolean);

    const targetIds = new Set<string>();
    const targetNames = new Set<string>();
    targetCandidates.forEach((target) => {
      const normalizedTarget = normalizeDeviceKey(target);
      if (!normalizedTarget) return;
      targetIds.add(normalizedTarget);
      targetNames.add(normalizedTarget);
    });

    const appliesToAll =
      parsed.all === true || targetCandidates.length === 0 || ['all', '*'].includes(normalizedPayload);

    return {
      appliesToAll,
      targetType,
      targetIds,
      targetNames,
    };
  } catch {
    // Ignore invalid JSON and attempt plain-text command parsing.
  }

  const compact = normalizedPayload.replace(/[\s_-]+/g, '');
  const isPowerOff =
    isPowerOffToken(compact) ||
    compact.startsWith('turnoff') ||
    compact.startsWith('poweroff') ||
    compact.startsWith('disable');

  if (!isPowerOff) {
    return null;
  }

  const targetType: ExternalPowerOffCommand['targetType'] = compact.includes('actuator')
    ? 'actuator'
    : compact.includes('equipment')
      ? 'equipment'
      : 'any';

  const targetIds = new Set<string>();
  const targetNames = new Set<string>();
  const namedTargetMatch = payload
    .toLowerCase()
    .match(/(?:turn\s*off|power\s*off|disable)\s+(.+)$/i);
  const inlineOffMatch = payload.toLowerCase().match(/^(.+?)\s*[:=]\s*(?:off|0|false|disabled?)$/i);
  const rawTarget = namedTargetMatch?.[1] ?? inlineOffMatch?.[1] ?? '';

  if (rawTarget) {
    collectTargets(rawTarget).forEach((target) => {
      const normalizedTarget = normalizeDeviceKey(target);
      if (!normalizedTarget || normalizedTarget === 'all' || normalizedTarget === '*') return;
      targetIds.add(normalizedTarget);
      targetNames.add(normalizedTarget);
    });
  }

  return {
    appliesToAll: targetIds.size === 0,
    targetType,
    targetIds,
    targetNames,
  };
};

const applyExternalPowerOffToRoom = (
  room: LabRoom,
  command: ExternalPowerOffCommand,
): { room: LabRoom; disabledCount: number } => {
  const isTargeted = (
    kind: 'equipment' | 'actuator',
    id: string,
    name: string,
  ) => {
    if (command.targetType !== 'any' && command.targetType !== kind) {
      return false;
    }
    if (command.appliesToAll) {
      return true;
    }

    const normalizedId = normalizeDeviceKey(id);
    const normalizedName = normalizeDeviceKey(name);
    return command.targetIds.has(normalizedId) || command.targetNames.has(normalizedName);
  };

  let disabledCount = 0;
  const nextEquipment = room.equipment.map((item) => {
    if (!isTargeted('equipment', item.id, item.name)) {
      return item;
    }
    if (item.status === 'offline') {
      return item;
    }

    disabledCount += 1;
    return {
      ...item,
      status: 'offline',
      mode: 'manual',
      lastMaintenance: new Date().toISOString().split('T')[0],
    } as Equipment;
  });

  const nextActuators = room.actuators.map((item) => {
    if (!isTargeted('actuator', item.id, item.name)) {
      return item;
    }
    if (item.status === 'off') {
      return item;
    }

    disabledCount += 1;
    return {
      ...item,
      status: 'off',
      mode: 'manual',
      lastActivated: new Date().toISOString(),
    } as Actuator;
  });

  if (disabledCount === 0) {
    return { room, disabledCount: 0 };
  }

  return {
    room: {
      ...room,
      equipment: nextEquipment,
      actuators: nextActuators,
    },
    disabledCount,
  };
};

const sensorTopicNameMap: Record<string, string> = {
  oled: 'OLED Display',
  dht: 'DHT Sensor',
  bh1750: 'BH1750 Light Sensor',
  radar: 'Radar Presence Sensor',
  mq135: 'MQ135 Air Sensor',
};

const telemetryTopicSensorMap: Record<string, string> = {
  'esp32SLG4/temperate': 'Temperature Sensor',
  'esp32SLG4/temperature': 'Temperature Sensor',
  'esp32SLG4/humidity': 'Humidity Sensor',
  'esp32SLG4/light': 'Light Sensor',
  'esp32SLG4/air': 'CO2 Sensor',
  'esp32SLG4/co2': 'CO2 Sensor',
  'esp32SLG4/counter': 'Presence Sensor',
  'esp32SLG4/occupancy': 'Presence Sensor',
  'esp32SLG4/presence': 'Presence Sensor',
};

const telemetryTopicCanonicalKeyMap: Record<string, string> = {
  'esp32SLG4/temperate': 'temperature',
  'esp32SLG4/temperature': 'temperature',
  'esp32SLG4/humidity': 'humidity',
  'esp32SLG4/light': 'light',
  'esp32SLG4/air': 'co2',
  'esp32SLG4/co2': 'co2',
  'esp32SLG4/counter': 'presence',
  'esp32SLG4/occupancy': 'presence',
  'esp32SLG4/presence': 'presence',
};

const sanitizeTopicKey = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const telemetryTopicToStableId = (topic: string): string => {
  const canonical = telemetryTopicCanonicalKeyMap[topic];
  if (canonical) {
    return `iot-telemetry-${canonical}`;
  }
  return `iot-telemetry-${sanitizeTopicKey(topic)}`;
};

const genericIgnoredTopicKeys = new Set([
  'mode',
  'commands',
  'alertst',
  'alertsh',
  'alertsl',
  'alertsa',
]);

const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const topicToSensorName = (topic: string): string => {
  const topicKey = topic.split('/').pop() ?? 'sensor';
  const normalized = topicKey.replace(/[._-]+/g, ' ').trim();
  return `${toTitleCase(normalized || 'Sensor')} Sensor`;
};

const upsertSensorFromUnmappedTopic = (room: LabRoom, topic: string, receivedAt: string): LabRoom => {
  if (!topic.startsWith('esp32SLG4/')) return room;
  if (topic.startsWith('esp32SLG4/status/')) return room;
  if (telemetryTopicSensorMap[topic]) return room;

  const topicKey = topic.split('/').pop() ?? '';
  if (!topicKey || genericIgnoredTopicKeys.has(topicKey)) return room;

  const sensorName = topicToSensorName(topic);
  const stableId = `iot-generic-${sanitizeTopicKey(topic)}`;
  const existing = room.iotDevices.find((item) => item.id === stableId);

  if (existing) {
    return {
      ...room,
      iotDevices: room.iotDevices.map((item) =>
        item.id === stableId
          ? { ...item, status: 'online', lastSeen: receivedAt }
          : item,
      ),
    };
  }

  return {
    ...room,
    iotDevices: [
      ...room.iotDevices,
      {
        id: stableId,
        name: sensorName,
        type: 'sensor',
        status: 'online',
        lastSeen: receivedAt,
        signalStrength: 100,
        firmwareVersion: 'mqtt-live',
        dataRate: 1,
        location: 'MQTT source',
      },
    ],
  };
};

const upsertSensorFromTelemetryTopic = (room: LabRoom, topic: string, receivedAt: string): LabRoom => {
  const sensorName = telemetryTopicSensorMap[topic];
  if (!sensorName) return room;

  const stableId = telemetryTopicToStableId(topic);

  const existing = room.iotDevices.find((item) => item.id === stableId);
  if (existing) {
    if (existing.status === 'online' && existing.lastSeen === receivedAt) {
      return room;
    }

    return {
      ...room,
      iotDevices: room.iotDevices.map((item) =>
        item.id === stableId
          ? { ...item, status: 'online', lastSeen: receivedAt }
          : item,
      ),
    };
  }

  const sensorKey = topic.split('/').pop() ?? 'sensor';
  return {
    ...room,
    iotDevices: [
      ...room.iotDevices,
      {
        id: stableId,
        name: sensorName,
        type: 'sensor',
        status: 'online',
        lastSeen: receivedAt,
        signalStrength: 100,
        firmwareVersion: 'mqtt-live',
        dataRate: 1,
        location: 'MQTT source',
      },
    ],
  };
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

const upsertThresholdAlertsFromCurrentReadings = (room: LabRoom): LabRoom => {
  const thresholdViolations = [
    {
      reasonCode: 'TEMP_THRESHOLD',
      field: 'temperature',
      hasReading: hasTemperatureReading(room.temperature),
      violated: !isTemperatureOptimal(room.temperature),
      formattedValue: `${room.temperature.toFixed(1)} C`,
    },
    {
      reasonCode: 'HUMIDITY_THRESHOLD',
      field: 'humidity',
      hasReading: hasHumidityReading(room.humidity),
      violated: !isHumidityOptimal(room.humidity),
      formattedValue: `${room.humidity.toFixed(1)} %`,
    },
    {
      reasonCode: 'AIR_THRESHOLD',
      field: 'air',
      hasReading: hasCO2Reading(room.co2Level),
      violated: !isCO2Optimal(room.co2Level),
      formattedValue: `${room.co2Level.toFixed(0)} ppm`,
    },
  ] as const;

  const newAlerts: Alert[] = thresholdViolations
    .filter(({ hasReading, violated, reasonCode }) => {
      if (!hasReading || !violated) return false;
      return !room.alerts.some((alert) => alert.reasonCode === reasonCode && !alert.acknowledged);
    })
    .map(({ reasonCode, field, formattedValue }) => ({
      id: `mqtt-alert-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type: 'warning',
      severity: 'medium',
      message: `Threshold alert on ${field}: ${formattedValue}`,
      reasonCode,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      autoResolved: false,
      roomId: room.id,
    }));

  if (newAlerts.length === 0) {
    return room;
  }

  return {
    ...room,
    alerts: [...newAlerts, ...room.alerts].slice(0, MAX_ALERTS_PER_ROOM),
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
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
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
    case 'esp32SLG4/temperate':
    case 'esp32SLG4/temperature': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.temperature, value, mqttTemperatureEpsilon)) return room;
      nextRoom = { ...nextRoom, temperature: value };
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
      break;
    }
    case 'esp32SLG4/humidity': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.humidity, value, mqttHumidityEpsilon)) return room;
      nextRoom = { ...nextRoom, humidity: value };
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
      break;
    }
    case 'esp32SLG4/light': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.lightLevel, value, mqttLightEpsilon)) return room;
      nextRoom = { ...nextRoom, lightLevel: value };
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
      break;
    }
    case 'esp32SLG4/air':
    case 'esp32SLG4/co2': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      if (!hasSignificantChange(nextRoom.co2Level, value, mqttAirEpsilon)) return room;
      nextRoom = { ...nextRoom, co2Level: value };
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
      break;
    }
    case 'esp32SLG4/counter':
    case 'esp32SLG4/occupancy': {
      const value = parseNumberPayload(message.payload);
      if (value === null) return room;
      const nextPresence = value > 0;
      if (nextRoom.presenceDetected === nextPresence) return room;
      nextRoom = {
        ...nextRoom,
        presenceDetected: nextPresence,
      };
      nextRoom = upsertSensorFromTelemetryTopic(nextRoom, message.topic, message.receivedAt);
      break;
    }
    case 'esp32SLG4/commands': {
      const externalPowerOffCommand = parseExternalPowerOffCommand(message.payload);
      let disabledCount = 0;

      if (externalPowerOffCommand) {
        const externalPowerOffResult = applyExternalPowerOffToRoom(nextRoom, externalPowerOffCommand);
        nextRoom = externalPowerOffResult.room;
        disabledCount = externalPowerOffResult.disabledCount;
      }

      const commandAlert: Alert = {
        id: `mqtt-cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: 'info',
        severity: 'low',
        message:
          disabledCount > 0
            ? `External OFF command applied: ${disabledCount} device(s) disabled.`
            : `Command received: ${message.payload || 'n/a'}`,
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
        const stableId = `iot-status-${sanitizeTopicKey(sensorKey || 'sensor')}`;
        const nextStatus = parseSensorHealthStatus(message.payload);
        if (!nextStatus) return room;
        let didSensorConnect = false;

        const existingDevice = nextRoom.iotDevices.find((item) => item.id === stableId);
        if (existingDevice) {
          if (existingDevice.status === nextStatus) {
            return room;
          }
          didSensorConnect = existingDevice.status !== 'online' && nextStatus === 'online';
          nextRoom = {
            ...nextRoom,
            iotDevices: nextRoom.iotDevices.map((item) =>
              item.id === stableId
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
                id: stableId,
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
          didSensorConnect = nextStatus === 'online';
        }

        if (didSensorConnect) {
          nextRoom = upsertThresholdAlertsFromCurrentReadings(nextRoom);
        }
      } else {
        nextRoom = upsertSensorFromUnmappedTopic(nextRoom, message.topic, message.receivedAt);
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

const applyThresholdAlertsToLabs = (rooms: LabRoom[]): LabRoom[] =>
  rooms.map((room) => upsertThresholdAlertsFromCurrentReadings(room));

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
  const { addLog } = useDataLog();
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
        setLabs(
          applyThresholdAlertsToLabs(
            applyDerivedStatusToLabs(loadedLabs.length > 0 ? loadedLabs : cloneInitialLabs()),
          ),
        );
        setUsers(loadedUsers);
      } catch {
        if (!isMounted) return;
        setError('Failed to load application data. Using fallback state.');
        setLabs(applyThresholdAlertsToLabs(applyDerivedStatusToLabs(cloneInitialLabs())));
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
        const isGenericTopic =
          message.topic.startsWith('esp32SLG4/') &&
          !message.topic.startsWith('esp32SLG4/status/') &&
          !telemetryTopicSensorMap[message.topic] &&
          !EVENT_LIKE_TOPICS.has(message.topic) &&
          !genericIgnoredTopicKeys.has(message.topic.split('/').pop() ?? '');

        const shouldAlwaysProcess =
          EVENT_LIKE_TOPICS.has(message.topic) ||
          message.topic.startsWith('esp32SLG4/status/') ||
          isGenericTopic;
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

  useEffect(() => {
    if (labs.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      const recordedAt = new Date().toISOString();
      const snapshots = labs.map((room) => ({
        id: room.id,
        temperature: room.temperature,
        humidity: room.humidity,
        co2Level: room.co2Level,
        lightLevel: room.lightLevel,
        presenceDetected: room.presenceDetected,
      }));

      void appApi.recordTelemetrySnapshots(snapshots, recordedAt).catch(() => {
        setError((prev) => prev || 'Telemetry snapshot sync is unavailable.');
      });

      for (const room of labs) {
        addLog({
          roomId: room.id,
          roomName: room.name,
          labId: room.id,
          changeType: 'system',
          field: 'telemetry_snapshot',
          oldValue: '-',
          newValue: `${room.temperature.toFixed(1)}C / ${room.humidity.toFixed(0)}% / ${room.co2Level.toFixed(0)}ppm`,
          user: 'system',
          description: '10-second telemetry snapshot recorded',
        });
      }
    }, 10000);

    return () => {
      clearInterval(timer);
    };
  }, [labs, addLog]);

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
    // Determine new mode so we can publish a command
    const room = labs.find((r) => r.id === roomId);
    const equipment = room?.equipment.find((eq) => eq.id === equipmentId);
    const newMode = equipment ? (equipment.mode === 'auto' ? 'manual' : 'auto') : undefined;

    updateRoom(roomId, (room) => ({
      ...room,
      equipment: room.equipment.map((eq) =>
        eq.id === equipmentId
          ? { ...eq, mode: eq.mode === 'auto' ? 'manual' : 'auto' }
          : eq,
      ),
    }));

    // Publish MQTT command to request mode change on the device (fire-and-forget)
    if (newMode) {
      const payload = JSON.stringify({
        type: 'set_mode',
        equipmentId,
        mode: newMode,
        issuedAt: new Date().toISOString(),
      });
      const topic = `devices/${equipmentId}/commands`;
      void publishMqttCommand(topic, payload).catch(() => {
        // ignore errors here
      });
    }
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
      .then((resetData) =>
        setLabs(applyThresholdAlertsToLabs(applyDerivedStatusToLabs(resetData))),
      )
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
