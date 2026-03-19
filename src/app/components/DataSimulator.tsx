import { useEffect, useRef } from 'react';
import { useDataLog } from '../contexts/DataLogContext';
import { type LabRoom } from '../data/labData';
import { useAppData } from '../contexts/AppDataContext';

// This component simulates realistic lab data changes for demonstration purposes
export function DataSimulator() {
  const { addLog } = useDataLog();
  const { labs, updateRoom } = useAppData();
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();
  const labsRef = useRef<LabRoom[]>(labs);

  useEffect(() => {
    labsRef.current = labs;
  }, [labs]);

  useEffect(() => {
    // Start simulation after a short delay
    const startDelay = setTimeout(() => {
      // Generate changes every 8-15 seconds
      const scheduleNextChange = () => {
        const delay = 8000 + Math.random() * 7000; // 8-15 seconds
        intervalRef.current = setTimeout(() => {
          generateRandomChange();
          scheduleNextChange();
        }, delay);
      };

      scheduleNextChange();
    }, 3000); // Initial 3 second delay

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  const generateRandomChange = () => {
    const changeTypes = [
      'temperature',
      'humidity',
      'co2',
      'occupancy',
      'equipment',
      'status',
    ];
    
    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
    const currentLabs = labsRef.current;
    if (currentLabs.length === 0) return;

    const room = currentLabs[Math.floor(Math.random() * currentLabs.length)];

    switch (changeType) {
      case 'temperature':
        simulateTemperatureChange(room);
        break;
      case 'humidity':
        simulateHumidityChange(room);
        break;
      case 'co2':
        simulateCO2Change(room);
        break;
      case 'occupancy':
        simulateOccupancyChange(room);
        break;
      case 'equipment':
        simulateEquipmentChange(room);
        break;
      case 'status':
        simulateStatusChange(room);
        break;
    }
  };

  const simulateTemperatureChange = (room: LabRoom) => {
    const oldTemp = room.temperature;
    const change = (Math.random() - 0.5) * 2; // ±1°C
    const newTemp = parseFloat((oldTemp + change).toFixed(1));

    // Only log if the new temperature is outside optimal range (20-24°C)
    const isOutsideOptimal = newTemp < 20 || newTemp > 24;
    
    if (isOutsideOptimal) {
      updateRoom(room.id, (targetRoom) => ({
        ...targetRoom,
        temperature: newTemp,
      }));

      addLog({
        roomId: room.id,
        roomName: room.name,
        changeType: 'temperature',
        field: 'Temperature',
        oldValue: oldTemp,
        newValue: newTemp,
        description: `Temperature ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}°C`,
      });
    }
  };

  const simulateHumidityChange = (room: LabRoom) => {
    const oldHumidity = room.humidity;
    const change = Math.floor((Math.random() - 0.5) * 10); // ±5%
    const newHumidity = oldHumidity + change;

    // Only log if the new humidity is outside optimal range (40-60%)
    const isOutsideOptimal = newHumidity < 40 || newHumidity > 60;
    
    if (isOutsideOptimal) {
      updateRoom(room.id, (targetRoom) => ({
        ...targetRoom,
        humidity: newHumidity,
      }));

      addLog({
        roomId: room.id,
        roomName: room.name,
        changeType: 'humidity',
        field: 'Humidity',
        oldValue: oldHumidity,
        newValue: newHumidity,
        description: `Humidity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}%`,
      });
    }
  };

  const simulateCO2Change = (room: LabRoom) => {
    const oldCO2 = room.co2Level;
    const change = Math.floor((Math.random() - 0.5) * 80); // ±40 ppm
    const newCO2 = oldCO2 + change;

    // Only log if the new CO2 level is outside optimal range (<500 ppm)
    const isOutsideOptimal = newCO2 >= 500;
    
    if (isOutsideOptimal) {
      updateRoom(room.id, (targetRoom) => ({
        ...targetRoom,
        co2Level: newCO2,
      }));

      addLog({
        roomId: room.id,
        roomName: room.name,
        changeType: 'co2',
        field: 'CO₂ Level',
        oldValue: oldCO2,
        newValue: newCO2,
        description: `CO₂ level ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} ppm`,
      });
    }
  };

  const simulateOccupancyChange = (room: LabRoom) => {
    const oldOccupancy = room.occupancy;
    const change = Math.random() > 0.5 ? 1 : -1;
    const newOccupancy = Math.max(0, Math.min(room.maxOccupancy, oldOccupancy + change));
    
    if (newOccupancy === oldOccupancy) return; // No change if at limits

    updateRoom(room.id, (targetRoom) => ({
      ...targetRoom,
      occupancy: newOccupancy,
    }));

    addLog({
      roomId: room.id,
      roomName: room.name,
      changeType: 'occupancy',
      field: 'Occupancy',
      oldValue: oldOccupancy,
      newValue: newOccupancy,
      description: `${change > 0 ? 'Person entered' : 'Person exited'} the lab`,
    });
  };

  const simulateEquipmentChange = (room: LabRoom) => {
    if (room.equipment.length === 0) return;
    
    const equipment = room.equipment[Math.floor(Math.random() * room.equipment.length)];
    const statuses = ['online', 'offline', 'maintenance'] as const;
    const oldStatus = equipment.status;
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    if (oldStatus === newStatus) return;

    updateRoom(room.id, (targetRoom) => ({
      ...targetRoom,
      equipment: targetRoom.equipment.map((eq) =>
        eq.id === equipment.id ? { ...eq, status: newStatus } : eq,
      ),
    }));

    addLog({
      roomId: room.id,
      roomName: room.name,
      changeType: 'equipment',
      field: equipment.name,
      oldValue: oldStatus,
      newValue: newStatus,
      description: `${equipment.name} status changed from ${oldStatus} to ${newStatus}`,
    });
  };

  const simulateStatusChange = (room: LabRoom) => {
    const statuses = ['optimal', 'warning', 'critical'] as const;
    const oldStatus = room.status;
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    if (oldStatus === newStatus) return;

    updateRoom(room.id, (targetRoom) => ({
      ...targetRoom,
      status: newStatus,
    }));

    addLog({
      roomId: room.id,
      roomName: room.name,
      changeType: 'status',
      field: 'Room Status',
      oldValue: oldStatus,
      newValue: newStatus,
      description: `Room status changed from ${oldStatus} to ${newStatus}`,
    });
  };

  // This component doesn't render anything
  return null;
}