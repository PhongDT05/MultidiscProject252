import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { labRooms, type LabRoom, type Alert } from '../data/labData';
import { appApi } from '../services/appApi';
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
  resetLabs: () => void;
  isLoading: boolean;
  error: string | null;
}

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
        setLabs(loadedLabs);
        setUsers(loadedUsers);
      } catch {
        if (!isMounted) return;
        setError('Failed to load application data. Using fallback state.');
        setLabs(cloneInitialLabs());
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
      nextLabs = prev.map((room) => (room.id === roomId ? updater(room) : room));
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

  const resetLabs = () => {
    setError(null);
    void appApi
      .resetLabs()
      .then((resetData) => setLabs(resetData))
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
