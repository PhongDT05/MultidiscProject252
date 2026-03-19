# Smart Lab IoT System - Use Cases Implementation

## Overview
This document details the implementation of all 8 use cases for the Smart Lab IoT monitoring and control system.

---

## ✅ Implemented Use Cases

### **UC1 – Threshold Configuration**
**Route:** `/thresholds`  
**Component:** `ThresholdConfig.tsx`  
**Primary Users:** Lab Administrators (Admin role only)

**Features:**
- Room-by-room threshold configuration interface
- Environmental parameter controls:
  - Temperature (min, max, warning min, warning max)
  - Humidity (min, max, warning min, warning max)
  - CO₂ levels (warning max, critical max)
  - Light levels (min, max)
- Real-time status display showing current values vs. thresholds
- Color-coded status badges (Optimal/Warning/Critical)
- Save/Reset functionality
- Persistent storage in localStorage
- Role-based access control (Admin only can modify)

**Business Requirements Fulfilled:** No. 2 Admin Threshold Control

**Access:**
- Navigate to user menu → "Threshold Config" (Admin only)

---

### **UC2 – Real-time Monitoring & Control**
**Routes:** `/` (Main Dashboard), `/room/:roomId` (Room Detail)  
**Components:** `MainDashboard.tsx`, `RoomDetail.tsx`  
**Primary Actors:** All Users (view-only for Students/Viewers, full access for Admins/Managers/Technicians)

**Features:**
- Real-time environmental metrics display:
  - Temperature, Humidity, CO₂ levels, Light levels
  - Occupancy tracking with presence detection
- Live data updates every 8-15 seconds via DataSimulator
- 24-hour trend charts with historical data
- Equipment status monitoring
- Manual equipment control (role-based)
- Auto/Manual mode switching
- Color-coded status indicators

**Business Requirements Fulfilled:** No. 1 Continuous Monitoring, No. 6 Centralized Visualization

**Access:**
- Main dashboard: Home page after login
- Room details: Click on any room card

---

### **UC3 – Automated Hazard Response & Alerting**
**Route:** `/alerts`  
**Component:** `AlertCenter.tsx`  
**Primary Actors:** System (executor), All Users (receivers)

**Features:**
- Centralized alert management dashboard
- Alert severity levels: Critical, High, Medium, Low
- Reason codes for each alert (e.g., TEMP_CRITICAL_HIGH, CO2_WARNING)
- Automated actuator triggering:
  - HVAC system activation for temperature violations
  - Exhaust fan activation for CO₂ violations
  - Ventilation system control
- Alert acknowledgment system (Technician+)
- Alert filtering by severity and room
- Tabs: Active / Acknowledged / All alerts
- Timestamp tracking and "time ago" display
- Automated response notifications
- Alert statistics dashboard

**Business Requirements Fulfilled:** No. 3 Automated Alert & Trigger

**Access:**
- Navigate to user menu → "Alert Center" (All roles)

**Alert Flow:**
1. Threshold violation detected
2. System generates alert with severity and reason code
3. Automated actuators triggered based on violation type
4. Notification sent to all users
5. Authorized users can acknowledge alerts
6. System logs all alert activities

---

### **UC4 – Automated Energy Saving (Auto-Off)**
**Implementation:** Integrated into room data structure  
**Primary Actors:** System (executor)

**Features:**
- Presence detection via IoT sensors (`presenceDetected` field)
- Essential vs. non-essential equipment classification
- Automatic power management:
  - Essential equipment stays on (e.g., Fume Hoods, Incubators)
  - Non-essential equipment powered down when room is empty
- Timeout-based automation (configurable)
- Visual indicators for presence status
- Equipment mode tracking (auto/manual)

**Business Requirements Fulfilled:** No. 3 Automated Alert & Trigger

**Data Structure:**
```typescript
{
  presenceDetected: boolean,
  equipment: [{
    isEssential: boolean,
    mode: "auto" | "manual"
  }]
}
```

---

### **UC5 – Manual Hardware Override**
**Routes:** `/` (Main Dashboard), `/room/:roomId` (Room Detail)  
**Components:** Integrated in `MainDashboard.tsx` and `RoomDetail.tsx`  
**Primary Actors:** Lab Administrators, Technicians

**Features:**
- Manual control interface for equipment
- Auto/Manual mode toggle switches
- Actuator control:
  - HVAC systems
  - Exhaust fans
  - Lighting systems
  - Ventilation
- Real-time status feedback
- Role-based permissions (Technician+ can control)
- Change logging for all manual overrides
- Visual mode indicators (Auto/Manual badges)

**Business Requirements Fulfilled:** No. 4 Hybrid Control Modes

**Permissions:**
- Viewers: Read-only (controls locked)
- Technicians+: Full control access

---

### **UC6 – Viewing Reports & History**
**Route:** `/` (Data Logs section)  
**Component:** `ChangeLog.tsx`, Historical charts  
**Primary Actors:** Lab Administrators, Facility Management, Maintenance Personnel

**Features:**
- Comprehensive data change logging
- Filter by:
  - Change type (Environmental, Equipment, Alert)
  - Severity level
  - Room
- Historical trend charts (24-hour view)
- Automated action logs
- Manual override audit trail
- Timestamps for all events
- Color-coded entries
- Trend indicators (↑/↓/→)
- Export-ready data structure

**Business Requirements Fulfilled:** No. 5 Universal Logging

**Log Types:**
1. **Environmental Changes:** Temperature, humidity, CO₂, light level changes
2. **Equipment Changes:** Status changes, mode switches, maintenance updates
3. **Alert Events:** New alerts, acknowledgments, auto-resolutions

---

### **UC7 – User Authentication & Role Management**
**Route:** `/login`, `/users`  
**Components:** `Login.tsx`, `AuthContext.tsx`, `UserManagement.tsx`  
**Primary Actors:** IT/System Operators (Managers), All Users

**Features:**
- Secure authentication system
- Four role levels with hierarchy:
  - **Admin:** Full system access, threshold configuration, user management
  - **Manager:** View + acknowledge alerts, user oversight
  - **Technician:** Equipment control, alert acknowledgment
  - **Viewer:** Read-only access
- Role-based access control (RBAC) throughout app
- Permission checking functions
- User profile display
- Session persistence (localStorage)
- Logout functionality

**Business Requirements Fulfilled:** No. 7 Role-Based Access (RBAC)

**Test Accounts:**
```
Admin: admin@smartlab.com / admin123
Manager: manager@smartlab.com / manager123
Technician: tech@smartlab.com / tech123
Viewer: viewer@smartlab.com / viewer123
```

---

### **UC8 – System Health Monitoring & Diagnostics**
**Route:** `/devices`  
**Component:** `DeviceHealth.tsx`  
**Primary Actors:** IT/System Operators, System (executor)

**Features:**
- Comprehensive IoT device monitoring
- Device types: Sensors, Gateways, Actuators
- Real-time device metrics:
  - **Connection Status:** Online/Offline/Error/Warning
  - **Signal Strength:** 0-100% with color coding
  - **Battery Level:** For battery-powered devices
  - **Data Rate:** Readings per minute
  - **Last Seen:** Heartbeat timestamp tracking
  - **Firmware Version:** Version tracking
- Device health statistics dashboard
- Filter by room and device type
- Fault indications and warnings
- Connectivity loss handling
- Local safety behavior preservation
- Data synchronization status

**Business Requirements Fulfilled:** No. 8 System Diagnostics

**Health Indicators:**
- 🟢 **Online:** Normal operation, recent heartbeat
- 🟡 **Warning:** Low battery or weak signal
- 🔴 **Error:** Device malfunction detected
- 🔴 **Offline:** No heartbeat within timeout window

**Device Details:**
- Location mapping
- Firmware version
- Time since last communication
- Signal strength visualization
- Battery level (if applicable)
- Data transmission rate

---

## 🎯 Data Models

### Enhanced LabRoom Interface
```typescript
interface LabRoom {
  id: string;
  name: string;
  status: "optimal" | "warning" | "critical";
  temperature: number;
  humidity: number;
  co2Level: number;
  lightLevel: number;
  occupancy: number;
  maxOccupancy: number;
  presenceDetected: boolean; // UC4
  equipment: Equipment[];
  alerts: Alert[];
  iotDevices: IoTDevice[]; // UC8
  actuators: Actuator[]; // UC3
}
```

### IoT Device Monitoring
```typescript
interface IoTDevice {
  id: string;
  name: string;
  type: "sensor" | "gateway" | "actuator";
  status: "online" | "offline" | "error" | "warning";
  lastSeen: string;
  signalStrength: number;
  batteryLevel?: number;
  firmwareVersion: string;
  dataRate: number;
  location: string;
}
```

### Threshold Configuration
```typescript
interface ThresholdConfig {
  roomId: string;
  temperature: { min, max, warningMin, warningMax };
  humidity: { min, max, warningMin, warningMax };
  co2Level: { max, warningMax };
  lightLevel: { min, max };
}
```

### Enhanced Alerts
```typescript
interface Alert {
  id: string;
  type: "info" | "warning" | "critical" | "danger";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  reasonCode: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  autoResolved: boolean;
  roomId: string;
}
```

---

## 🔐 Role-Based Access Control

| Feature | Viewer | Technician | Manager | Admin |
|---------|--------|------------|---------|-------|
| View Dashboards | ✅ | ✅ | ✅ | ✅ |
| View Alerts | ✅ | ✅ | ✅ | ✅ |
| Acknowledge Alerts | ❌ | ✅ | ✅ | ✅ |
| Control Equipment | ❌ | ✅ | ✅ | ✅ |
| View Device Health | ✅ | ✅ | ✅ | ✅ |
| View Data Logs | ✅ | ✅ | ✅ | ✅ |
| Configure Thresholds | ❌ | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| System Configuration | ❌ | ❌ | ❌ | ✅ |

---

## 📊 Navigation Structure

```
Smart Lab Dashboard
│
├── Main Dashboard (/)
│   ├── Total Labs Overview
│   ├── Environmental Metrics
│   ├── Equipment Status
│   ├── Data Change Logs
│   └── Room Cards
│
├── Room Detail (/room/:roomId)
│   ├── Real-time Metrics
│   ├── 24-hour Trend Charts
│   ├── Equipment Controls
│   ├── Actuator Management
│   ├── IoT Device List
│   └── Room-specific Logs
│
├── Alert Center (/alerts) - All Roles
│   ├── Active Alerts
│   ├── Acknowledged Alerts
│   ├── Alert Statistics
│   └── Alert Acknowledgment
│
├── Device Health (/devices) - All Roles
│   ├── Device Status Overview
│   ├── Signal Strength Monitoring
│   ├── Battery Level Tracking
│   └── Connectivity Diagnostics
│
└── Admin Section
    ├── Threshold Configuration (/thresholds)
    ├── User Management (/users)
    └── System Configuration (/config)
```

---

## 🚀 Quick Start Guide

### For Administrators:
1. Login with admin credentials
2. Configure thresholds: User menu → "Threshold Config"
3. Review device health: User menu → "Device Health"
4. Monitor alerts: User menu → "Alert Center"
5. Manage users: User menu → "User Management"

### For Technicians:
1. Login with technician credentials
2. Monitor real-time data on main dashboard
3. Control equipment via room detail pages
4. Acknowledge alerts in Alert Center
5. View device health status

### For Viewers/Students:
1. Login with viewer credentials
2. View real-time environmental data
3. Access historical charts
4. Monitor alerts (read-only)
5. Check device health status

---

## 🔧 Automated System Behavior

### Threshold Violations → Automated Response

**Temperature Violations:**
- Warning: HVAC system adjusts
- Critical: Emergency cooling activated

**CO₂ Violations:**
- Warning: Increased ventilation
- Critical: Emergency exhaust fans activated

**Humidity Violations:**
- Warning: Dehumidification system engaged
- Critical: Climate control optimization

**Occupancy + Energy Saving:**
- Room empty (presence = false) → Non-essential equipment powered down after timeout
- Room occupied → All systems resume normal operation

---

## 📱 Features Summary

✅ **UC1:** Admin threshold configuration with real-time status  
✅ **UC2:** Real-time monitoring with continuous data updates  
✅ **UC3:** Automated hazard response with actuator triggering  
✅ **UC4:** Energy-saving automation via presence detection  
✅ **UC5:** Manual hardware override with role-based control  
✅ **UC6:** Comprehensive logging and historical reports  
✅ **UC7:** RBAC authentication with 4 role levels  
✅ **UC8:** IoT device health monitoring and diagnostics  

---

## 🎨 Color Coding System

- 🟢 **Green (Optimal):** All parameters within optimal range
- 🟡 **Amber (Warning):** Parameters approaching thresholds
- 🔴 **Red (Critical):** Thresholds violated, immediate action required

---

## 📈 Future Enhancements (Not Yet Implemented)

- Real-time WebSocket connections (currently using simulation)
- Export reports to PDF/CSV
- Advanced analytics and predictive maintenance
- Mobile responsive design improvements
- Push notifications for critical alerts
- Integration with external IoT platforms (AWS IoT, Azure IoT Hub)
- Historical data range selector (beyond 24 hours)
- Multi-site/multi-building support

---

**Last Updated:** March 18, 2026  
**System Version:** 1.0.0  
**Documentation Status:** Complete
