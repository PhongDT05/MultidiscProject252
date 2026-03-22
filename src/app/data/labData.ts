export interface LabRoom {
  id: string;
  name: string;
  status: "optimal" | "warning" | "critical";
  temperature: number;
  humidity: number;
  co2Level: number;
  lightLevel: number; // Lux
  occupancy: number;
  maxOccupancy: number;
  presenceDetected: boolean; // For UC4 - Energy Saving
  equipment: Equipment[];
  alerts: Alert[];
  iotDevices: IoTDevice[]; // For UC8 - System Health
  actuators: Actuator[]; // For UC3 - Automated Response
}

export interface Equipment {
  id: string;
  name: string;
  status: "online" | "offline" | "maintenance";
  lastMaintenance: string;
  mode: "auto" | "manual"; // For UC5 - Manual Override
  isEssential: boolean; // For UC4 - Energy Saving (essential devices stay on)
  cumulativeRuntimeHours?: number;
  lastRuntimeUpdateAt?: string;
}

// UC8 - IoT Device Health Monitoring
export interface IoTDevice {
  id: string;
  name: string;
  type: "sensor" | "gateway" | "actuator";
  status: "online" | "offline" | "error" | "warning";
  lastSeen: string; // ISO timestamp
  signalStrength: number; // 0-100
  batteryLevel?: number; // 0-100 for battery-powered devices
  firmwareVersion: string;
  dataRate: number; // readings per minute
  location: string;
}

// UC3 - Actuators for Automated Response
export interface Actuator {
  id: string;
  name: string;
  type: "hvac" | "exhaust_fan" | "lighting" | "ventilation";
  status: "on" | "off" | "auto";
  mode: "auto" | "manual";
  lastActivated?: string;
}

// UC3 - Enhanced Alert with Severity and Acknowledgment
export interface Alert {
  id: string;
  type: "info" | "warning" | "critical" | "danger";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  reasonCode: string; // e.g., "TEMP_HIGH", "CO2_CRITICAL"
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  autoResolved: boolean;
  roomId: string;
}

// UC1 - Threshold Configuration
export interface ThresholdConfig {
  roomId: string;
  temperature: {
    min: number;
    max: number;
    warningMin: number;
    warningMax: number;
  };
  humidity: {
    min: number;
    max: number;
    warningMin: number;
    warningMax: number;
  };
  co2Level: {
    max: number;
    warningMax: number;
  };
  lightLevel: {
    min: number;
    max: number;
  };
}

// UC6 - Historical Data
export interface HistoricalData {
  time: string;
  temperature: number;
  humidity: number;
  co2Level: number;
  lightLevel?: number;
  occupancy?: number;
}

// UC3 - Automated Action Log
export interface AutomatedAction {
  id: string;
  roomId: string;
  timestamp: string;
  trigger: string; // What caused the action
  action: string; // What action was taken
  actuator: string; // Which actuator was used
  success: boolean;
  reasonCode: string;
}

// Default threshold configurations per room
export const defaultThresholds: Record<string, ThresholdConfig> = {
  "lab-01": {
    roomId: "lab-01",
    temperature: { min: 18, max: 24, warningMin: 20, warningMax: 23 },
    humidity: { min: 30, max: 60, warningMin: 35, warningMax: 55 },
    co2Level: { max: 1000, warningMax: 800 },
    lightLevel: { min: 300, max: 1000 },
  },
  "lab-02": {
    roomId: "lab-02",
    temperature: { min: 20, max: 25, warningMin: 21, warningMax: 24 },
    humidity: { min: 40, max: 60, warningMin: 42, warningMax: 58 },
    co2Level: { max: 1000, warningMax: 800 },
    lightLevel: { min: 400, max: 1000 },
  },
  "lab-03": {
    roomId: "lab-03",
    temperature: { min: 18, max: 24, warningMin: 20, warningMax: 23 },
    humidity: { min: 30, max: 50, warningMin: 35, warningMax: 45 },
    co2Level: { max: 1000, warningMax: 800 },
    lightLevel: { min: 500, max: 1200 },
  },
  "lab-04": {
    roomId: "lab-04",
    temperature: { min: 18, max: 22, warningMin: 19, warningMax: 21 },
    humidity: { min: 35, max: 50, warningMin: 38, warningMax: 48 },
    co2Level: { max: 1000, warningMax: 800 },
    lightLevel: { min: 400, max: 1000 },
  },
  "lab-05": {
    roomId: "lab-05",
    temperature: { min: 20, max: 24, warningMin: 21, warningMax: 23 },
    humidity: { min: 40, max: 55, warningMin: 42, warningMax: 52 },
    co2Level: { max: 1000, warningMax: 800 },
    lightLevel: { min: 350, max: 900 },
  },
  "lab-06": {
    roomId: "lab-06",
    temperature: { min: 19, max: 26, warningMin: 20, warningMax: 25 },
    humidity: { min: 35, max: 65, warningMin: 40, warningMax: 60 },
    co2Level: { max: 1200, warningMax: 1000 },
    lightLevel: { min: 500, max: 1500 },
  },
};

export const labRooms: LabRoom[] = [
  {
    id: "lab-01",
    name: "Chemistry Lab A",
    status: "optimal",
    temperature: 22.5,
    humidity: 45,
    co2Level: 420,
    lightLevel: 650,
    occupancy: 8,
    maxOccupancy: 20,
    presenceDetected: true,
    equipment: [
      { id: "eq-01", name: "Fume Hood 1", status: "online", lastMaintenance: "2026-02-15", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-02", name: "Fume Hood 2", status: "online", lastMaintenance: "2026-02-15", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-03", name: "Centrifuge", status: "online", lastMaintenance: "2026-01-20", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-04", name: "Autoclave", status: "maintenance", lastMaintenance: "2026-02-10", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [],
    iotDevices: [
      { id: "iot-01", name: "Temperature Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 95, firmwareVersion: "2.1.3", dataRate: 6, location: "Ceiling Center" },
      { id: "iot-02", name: "Humidity Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 92, firmwareVersion: "2.1.3", dataRate: 6, location: "Ceiling Center" },
      { id: "iot-03", name: "CO2 Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 88, firmwareVersion: "1.9.2", dataRate: 2, location: "Wall Mount" },
      { id: "iot-04", name: "Presence Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 90, batteryLevel: 85, firmwareVersion: "1.5.0", dataRate: 1, location: "Door Frame" },
      { id: "iot-05", name: "Main Gateway", type: "gateway", status: "online", lastSeen: new Date().toISOString(), signalStrength: 100, firmwareVersion: "3.2.1", dataRate: 30, location: "Equipment Room" },
    ],
    actuators: [
      { id: "act-01", name: "HVAC System", type: "hvac", status: "auto", mode: "auto", lastActivated: new Date(Date.now() - 3600000).toISOString() },
      { id: "act-02", name: "Exhaust Fan", type: "exhaust_fan", status: "off", mode: "auto" },
      { id: "act-03", name: "LED Lights", type: "lighting", status: "on", mode: "manual", lastActivated: new Date(Date.now() - 7200000).toISOString() },
    ],
  },
  {
    id: "lab-02",
    name: "Biology Lab B",
    status: "warning",
    temperature: 24.8,
    humidity: 62,
    co2Level: 580,
    lightLevel: 720,
    occupancy: 15,
    maxOccupancy: 20,
    presenceDetected: true,
    equipment: [
      { id: "eq-05", name: "Incubator 1", status: "online", lastMaintenance: "2026-02-01", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-06", name: "Incubator 2", status: "online", lastMaintenance: "2026-02-01", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-07", name: "PCR Machine", status: "online", lastMaintenance: "2026-01-25", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-08", name: "Microscope", status: "offline", lastMaintenance: "2026-01-10", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [
      {
        id: "alert-01",
        type: "warning",
        severity: "medium",
        message: "Humidity level above optimal range",
        reasonCode: "HUMIDITY_HIGH",
        timestamp: "2026-03-18T10:30:00",
        acknowledged: false,
        autoResolved: false,
        roomId: "lab-02",
      },
      {
        id: "alert-02",
        type: "info",
        severity: "low",
        message: "Microscope offline for scheduled maintenance",
        reasonCode: "MAINTENANCE_SCHEDULED",
        timestamp: "2026-03-18T09:00:00",
        acknowledged: true,
        acknowledgedBy: "Emily Watson",
        acknowledgedAt: "2026-03-18T09:05:00",
        autoResolved: false,
        roomId: "lab-02",
      },
    ],
    iotDevices: [
      { id: "iot-06", name: "Temp/Humidity Combo", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 87, firmwareVersion: "2.0.1", dataRate: 6, location: "Ceiling" },
      { id: "iot-07", name: "CO2 Monitor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 91, firmwareVersion: "1.9.2", dataRate: 2, location: "Wall" },
      { id: "iot-08", name: "Occupancy Sensor", type: "sensor", status: "warning", lastSeen: new Date(Date.now() - 180000).toISOString(), signalStrength: 65, batteryLevel: 25, firmwareVersion: "1.4.8", dataRate: 1, location: "Ceiling" },
      { id: "iot-09", name: "Light Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 93, firmwareVersion: "1.7.0", dataRate: 4, location: "Window" },
    ],
    actuators: [
      { id: "act-04", name: "Climate Control", type: "hvac", status: "auto", mode: "auto", lastActivated: new Date(Date.now() - 1800000).toISOString() },
      { id: "act-05", name: "Ventilation Fan", type: "ventilation", status: "on", mode: "auto", lastActivated: new Date(Date.now() - 600000).toISOString() },
      { id: "act-06", name: "Smart Lighting", type: "lighting", status: "on", mode: "auto", lastActivated: new Date(Date.now() - 10800000).toISOString() },
    ],
  },
  {
    id: "lab-03",
    name: "Physics Lab C",
    status: "optimal",
    temperature: 21.2,
    humidity: 40,
    co2Level: 400,
    lightLevel: 880,
    occupancy: 5,
    maxOccupancy: 15,
    presenceDetected: true,
    equipment: [
      { id: "eq-09", name: "Oscilloscope 1", status: "online", lastMaintenance: "2026-02-20", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-10", name: "Oscilloscope 2", status: "online", lastMaintenance: "2026-02-20", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-11", name: "Signal Generator", status: "online", lastMaintenance: "2026-02-18", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [],
    iotDevices: [
      { id: "iot-10", name: "Environmental Monitor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 98, firmwareVersion: "3.0.0", dataRate: 10, location: "Central" },
      { id: "iot-11", name: "Presence Detector", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 94, batteryLevel: 92, firmwareVersion: "1.5.0", dataRate: 1, location: "Entrance" },
      { id: "iot-12", name: "Gateway Hub", type: "gateway", status: "online", lastSeen: new Date().toISOString(), signalStrength: 100, firmwareVersion: "3.2.1", dataRate: 25, location: "Server Closet" },
    ],
    actuators: [
      { id: "act-07", name: "Air Handler", type: "hvac", status: "auto", mode: "auto" },
      { id: "act-08", name: "Lab Lighting", type: "lighting", status: "on", mode: "manual", lastActivated: new Date(Date.now() - 14400000).toISOString() },
    ],
  },
  {
    id: "lab-04",
    name: "Computer Lab D",
    status: "critical",
    temperature: 27.5,
    humidity: 38,
    co2Level: 720,
    lightLevel: 600,
    occupancy: 18,
    maxOccupancy: 20,
    presenceDetected: true,
    equipment: [
      { id: "eq-12", name: "Server Rack 1", status: "online", lastMaintenance: "2026-02-10", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-13", name: "Server Rack 2", status: "online", lastMaintenance: "2026-02-10", mode: "auto", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-14", name: "HVAC System", status: "maintenance", lastMaintenance: "2026-02-25", mode: "manual", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [
      {
        id: "alert-03",
        type: "critical",
        severity: "critical",
        message: "Temperature exceeds safe operating range",
        reasonCode: "TEMP_CRITICAL_HIGH",
        timestamp: "2026-03-18T11:15:00",
        acknowledged: false,
        autoResolved: false,
        roomId: "lab-04",
      },
      {
        id: "alert-04",
        type: "critical",
        severity: "critical",
        message: "CO2 level critically high - ventilation needed",
        reasonCode: "CO2_CRITICAL",
        timestamp: "2026-03-18T11:20:00",
        acknowledged: false,
        autoResolved: false,
        roomId: "lab-04",
      },
    ],
    iotDevices: [
      { id: "iot-13", name: "Precision Temp Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 96, firmwareVersion: "2.1.5", dataRate: 12, location: "Server Rack 1" },
      { id: "iot-14", name: "Backup Temp Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 94, firmwareVersion: "2.1.5", dataRate: 12, location: "Server Rack 2" },
      { id: "iot-15", name: "Air Quality Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 89, firmwareVersion: "1.9.2", dataRate: 2, location: "Ceiling" },
      { id: "iot-16", name: "HVAC Controller", type: "actuator", status: "error", lastSeen: new Date(Date.now() - 300000).toISOString(), signalStrength: 45, firmwareVersion: "2.3.1", dataRate: 0, location: "Mechanical Room" },
    ],
    actuators: [
      { id: "act-09", name: "Primary HVAC", type: "hvac", status: "off", mode: "manual" },
      { id: "act-10", name: "Emergency Exhaust", type: "exhaust_fan", status: "on", mode: "auto", lastActivated: new Date(Date.now() - 180000).toISOString() },
      { id: "act-11", name: "Ceiling Fans", type: "ventilation", status: "on", mode: "manual", lastActivated: new Date(Date.now() - 120000).toISOString() },
    ],
  },
  {
    id: "lab-05",
    name: "Research Lab E",
    status: "optimal",
    temperature: 22.0,
    humidity: 48,
    co2Level: 450,
    lightLevel: 550,
    occupancy: 3,
    maxOccupancy: 10,
    presenceDetected: true,
    equipment: [
      { id: "eq-15", name: "Spectrometer", status: "online", lastMaintenance: "2026-02-22", mode: "manual", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-16", name: "Chromatograph", status: "online", lastMaintenance: "2026-02-20", mode: "manual", isEssential: true, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [],
    iotDevices: [
      { id: "iot-17", name: "Climate Monitor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 99, firmwareVersion: "3.0.0", dataRate: 10, location: "Ceiling" },
      { id: "iot-18", name: "Motion Sensor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 96, batteryLevel: 78, firmwareVersion: "1.5.0", dataRate: 1, location: "Corner" },
      { id: "iot-19", name: "Edge Gateway", type: "gateway", status: "online", lastSeen: new Date().toISOString(), signalStrength: 100, firmwareVersion: "3.3.0", dataRate: 20, location: "Wall Mount" },
    ],
    actuators: [
      { id: "act-12", name: "Climate System", type: "hvac", status: "auto", mode: "auto", lastActivated: new Date(Date.now() - 5400000).toISOString() },
      { id: "act-13", name: "Task Lighting", type: "lighting", status: "on", mode: "manual", lastActivated: new Date(Date.now() - 9000000).toISOString() },
    ],
  },
  {
    id: "lab-06",
    name: "Materials Lab F",
    status: "warning",
    temperature: 23.5,
    humidity: 55,
    co2Level: 520,
    lightLevel: 920,
    occupancy: 12,
    maxOccupancy: 18,
    presenceDetected: true,
    equipment: [
      { id: "eq-17", name: "3D Printer 1", status: "online", lastMaintenance: "2026-02-12", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-18", name: "3D Printer 2", status: "online", lastMaintenance: "2026-02-12", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-19", name: "CNC Machine", status: "maintenance", lastMaintenance: "2026-02-08", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
      { id: "eq-20", name: "Laser Cutter", status: "online", lastMaintenance: "2026-02-15", mode: "manual", isEssential: false, cumulativeRuntimeHours: 0, lastRuntimeUpdateAt: new Date().toISOString() },
    ],
    alerts: [
      {
        id: "alert-05",
        type: "warning",
        severity: "medium",
        message: "CO2 level elevated",
        reasonCode: "CO2_WARNING",
        timestamp: "2026-03-18T10:45:00",
        acknowledged: false,
        autoResolved: false,
        roomId: "lab-06",
      },
    ],
    iotDevices: [
      { id: "iot-20", name: "Combo Sensor 1", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 90, firmwareVersion: "2.0.1", dataRate: 6, location: "Zone A" },
      { id: "iot-21", name: "Combo Sensor 2", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 88, firmwareVersion: "2.0.1", dataRate: 6, location: "Zone B" },
      { id: "iot-22", name: "Air Quality Monitor", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 85, firmwareVersion: "1.9.5", dataRate: 2, location: "Center" },
      { id: "iot-23", name: "Occupancy Counter", type: "sensor", status: "online", lastSeen: new Date().toISOString(), signalStrength: 92, batteryLevel: 68, firmwareVersion: "1.6.2", dataRate: 1, location: "Doorway" },
    ],
    actuators: [
      { id: "act-14", name: "Main HVAC", type: "hvac", status: "auto", mode: "auto", lastActivated: new Date(Date.now() - 2700000).toISOString() },
      { id: "act-15", name: "Exhaust System", type: "exhaust_fan", status: "on", mode: "auto", lastActivated: new Date(Date.now() - 900000).toISOString() },
      { id: "act-16", name: "Workshop Lighting", type: "lighting", status: "on", mode: "manual", lastActivated: new Date(Date.now() - 12600000).toISOString() },
    ],
  },
];

// Generate historical data for the last 24 hours
export const generateHistoricalData = (roomId: string): HistoricalData[] => {
  const data: HistoricalData[] = [];
  const room = labRooms.find((r) => r.id === roomId);
  
  if (!room) return data;

  const baseTemp = room.temperature;
  const baseHumidity = room.humidity;
  const baseCO2 = room.co2Level;
  const baseLightLevel = room.lightLevel;

  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    
    data.push({
      time: `${hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}-${i}`,
      temperature: parseFloat((baseTemp + (Math.random() - 0.5) * 3).toFixed(1)),
      humidity: Math.round(baseHumidity + (Math.random() - 0.5) * 10),
      co2Level: Math.round(baseCO2 + (Math.random() - 0.5) * 100),
      lightLevel: Math.round(baseLightLevel + (Math.random() - 0.5) * 150),
      occupancy: Math.round(room.occupancy + (Math.random() - 0.5) * 5),
    });
  }

  return data;
};