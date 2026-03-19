import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ChangeType = 
  | 'temperature' 
  | 'humidity' 
  | 'co2' 
  | 'occupancy' 
  | 'equipment' 
  | 'alert' 
  | 'status'
  | 'system';

export interface DataChangeLog {
  id: string;
  timestamp: Date;
  roomId?: string;
  roomName?: string;
  changeType: ChangeType;
  field: string;
  oldValue: string | number;
  newValue: string | number;
  user?: string;
  description: string;
}

interface DataLogContextType {
  logs: DataChangeLog[];
  addLog: (log: Omit<DataChangeLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  getLogsByRoom: (roomId: string) => DataChangeLog[];
  getLogsByType: (type: ChangeType) => DataChangeLog[];
}

const DataLogContext = createContext<DataLogContextType | undefined>(undefined);

export function DataLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<DataChangeLog[]>([]);

  const addLog = useCallback((log: Omit<DataChangeLog, 'id' | 'timestamp'>) => {
    const newLog: DataChangeLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 1000)); // Keep last 1000 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getLogsByRoom = useCallback((roomId: string) => {
    return logs.filter(log => log.roomId === roomId);
  }, [logs]);

  const getLogsByType = useCallback((type: ChangeType) => {
    return logs.filter(log => log.changeType === type);
  }, [logs]);

  return (
    <DataLogContext.Provider
      value={{
        logs,
        addLog,
        clearLogs,
        getLogsByRoom,
        getLogsByType,
      }}
    >
      {children}
    </DataLogContext.Provider>
  );
}

export function useDataLog() {
  const context = useContext(DataLogContext);
  if (context === undefined) {
    throw new Error('useDataLog must be used within a DataLogProvider');
  }
  return context;
}
