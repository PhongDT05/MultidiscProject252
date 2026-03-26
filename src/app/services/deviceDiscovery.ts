import { IoTDevice, Equipment } from '../data/labData';

/**
 * Simulates a network scan to discover IoT devices and equipment nearby
 * Returns a mock list of devices with realistic properties
 */

export interface DiscoveredDevice {
  type: 'sensor' | 'gateway' | 'actuator' | 'equipment';
  name: string;
  location: string;
  signalStrength?: number; // 0-100
  batteryLevel?: number; // 0-100
  firmwareVersion?: string;
  dataRate?: number; // readings per minute
  status?: 'online' | 'offline' | 'warning';
  lastMaintenance?: string; // ISO date
  mode?: 'auto' | 'manual';
  isEssential?: boolean;
}

/**
 * Simulates discovering 5-8 random devices on the network
 * In a real system, this would scan the actual network
 */
export function simulateNetworkScan(): DiscoveredDevice[] {
  const devicePool: DiscoveredDevice[] = [
    // IoT Sensors
    {
      type: 'sensor',
      name: 'Temperature Sensor - Wall Mount',
      location: 'North Wall',
      signalStrength: 92,
      firmwareVersion: '2.1.5',
      dataRate: 6,
      status: 'online',
    },
    {
      type: 'sensor',
      name: 'Humidity Monitor',
      location: 'South Wall',
      signalStrength: 88,
      firmwareVersion: '2.1.3',
      dataRate: 6,
      status: 'online',
    },
    {
      type: 'sensor',
      name: 'CO₂ Sensor - Ceiling',
      location: 'Ceiling Center',
      signalStrength: 95,
      firmwareVersion: '3.0.1',
      dataRate: 2,
      status: 'online',
    },
    {
      type: 'sensor',
      name: 'Motion Detector',
      location: 'Corner A',
      signalStrength: 82,
      batteryLevel: 76,
      firmwareVersion: '1.5.2',
      dataRate: 1,
      status: 'online',
    },
    // IoT Gateways
    {
      type: 'gateway',
      name: 'IoT Gateway - Main',
      location: 'Server Rack',
      signalStrength: 100,
      firmwareVersion: '4.2.0',
      dataRate: 60,
      status: 'online',
    },
    {
      type: 'gateway',
      name: 'IoT Gateway - Backup',
      location: 'Cabinet B',
      signalStrength: 98,
      firmwareVersion: '4.2.0',
      dataRate: 60,
      status: 'online',
    },
    // Actuators
    {
      type: 'actuator',
      name: 'HVAC Controller',
      location: 'Roof',
      signalStrength: 89,
      firmwareVersion: '3.1.7',
      dataRate: 10,
      status: 'online',
    },
    {
      type: 'actuator',
      name: 'Exhaust Fan Control',
      location: 'Ceiling Ductwork',
      signalStrength: 91,
      firmwareVersion: '2.8.4',
      dataRate: 5,
      status: 'online',
    },
    // Equipment
    {
      type: 'equipment',
      name: 'Fume Hood - New Model',
      location: 'Lab Bench 1',
      status: 'online',
      lastMaintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mode: 'auto',
      isEssential: true,
    },
    {
      type: 'equipment',
      name: 'Centrifuge Station',
      location: 'Lab Bench 2',
      status: 'online',
      lastMaintenance: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mode: 'manual',
      isEssential: false,
    },
  ];

  // Random selection: 5-8 devices
  const count = Math.floor(Math.random() * 4) + 5; // 5-8
  const shuffled = [...devicePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates a unique device ID based on type and timestamp
 */
export function generateDeviceId(type: 'iot' | 'equipment'): string {
  const prefix = type === 'iot' ? 'iot' : 'eq';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Converts a discovered device to an IoTDevice interface
 */
export function discoveredDeviceToIoTDevice(discovered: DiscoveredDevice): IoTDevice {
  return {
    id: generateDeviceId('iot'),
    name: discovered.name,
    type: discovered.type as 'sensor' | 'gateway' | 'actuator',
    status: (discovered.status || 'online') as 'online' | 'offline' | 'error' | 'warning',
    lastSeen: new Date().toISOString(),
    signalStrength: discovered.signalStrength || 85,
    batteryLevel: discovered.batteryLevel,
    firmwareVersion: discovered.firmwareVersion || '1.0.0',
    dataRate: discovered.dataRate || 5,
    location: discovered.location,
    installedAt: new Date().toISOString(),
    estimatedMaintenanceHours: getMaintenanceHoursByType(discovered.type as 'sensor' | 'gateway' | 'actuator'),
  };
}

/**
 * Converts a discovered device to an Equipment interface
 */
export function discoveredDeviceToEquipment(discovered: DiscoveredDevice): Equipment {
  return {
    id: generateDeviceId('equipment'),
    name: discovered.name,
    status: (discovered.status || 'online') as 'online' | 'offline' | 'maintenance',
    lastMaintenance: discovered.lastMaintenance || new Date().toISOString().split('T')[0],
    mode: (discovered.mode || 'auto') as 'auto' | 'manual',
    isEssential: discovered.isEssential ?? false,
    cumulativeRuntimeHours: 0,
    lastRuntimeUpdateAt: new Date().toISOString(),
  };
}

/**
 * Returns estimated maintenance hours based on device type
 */
function getMaintenanceHoursByType(type: 'sensor' | 'gateway' | 'actuator'): number {
  switch (type) {
    case 'gateway':
      return 8000; // ~1 year
    case 'actuator':
      return 6000; // ~8-9 months
    default: // sensor
      return 4000; // ~6 months
  }
}
