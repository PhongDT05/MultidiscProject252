# Smart Lab Dashboard - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Component Modules](#component-modules)
5. [Features & Functionality](#features--functionality)
6. [State Management](#state-management)
7. [UI/UX Patterns](#uiux-patterns)
8. [Implementation Guidelines](#implementation-guidelines)

---

## System Overview

**Purpose**: Real-time monitoring and management dashboard for laboratory environments

**Key Capabilities**:
- Monitor environmental conditions (temperature, humidity, CO₂) across multiple labs
- Track equipment status and maintenance schedules
- View and manage alerts
- Visualize 24-hour historical trends
- Control equipment modes (auto/manual)
- Real-time status indicators with color coding

**Technology Stack** (React Implementation):
- React 18+ with TypeScript
- React Router v7 (Data Mode)
- Recharts (for data visualization)
- Lucide React (icons)
- Tailwind CSS v4 (styling)

---

## Architecture

### Routing Structure

```
/ (Root Layout)
├── / (Main Dashboard - Index)
├── /room/:roomId (Room Detail View)
└── /* (404 Not Found)
```

**Navigation Pattern**: 
- Nested routing with shared Root layout
- Root layout provides persistent header/navigation
- Child routes render in `<Outlet />` component

---

## Data Models

### 1. LabRoom Interface
```typescript
{
  id: string;                    // Unique identifier (e.g., "lab-01")
  name: string;                  // Display name (e.g., "Chemistry Lab A")
  status: "optimal" | "warning" | "critical";  // Overall room status
  temperature: number;           // Current temperature in Celsius
  humidity: number;              // Current humidity percentage
  co2Level: number;              // CO₂ level in parts per million (ppm)
  occupancy: number;             // Current number of people
  maxOccupancy: number;          // Maximum capacity
  equipment: Equipment[];        // Array of equipment in this lab
  alerts: Alert[];               // Active alerts for this lab
}
```

### 2. Equipment Interface
```typescript
{
  id: string;                    // Unique identifier (e.g., "eq-01")
  name: string;                  // Equipment name (e.g., "Fume Hood 1")
  status: "online" | "offline" | "maintenance";
  lastMaintenance: string;       // ISO date string (e.g., "2026-02-15")
}
```

### 3. Alert Interface
```typescript
{
  id: string;                    // Unique identifier (e.g., "alert-01")
  type: "warning" | "critical" | "info";
  message: string;               // Alert description
  timestamp: string;             // ISO 8601 timestamp
}
```

### 4. HistoricalData Interface
```typescript
{
  time: string;                  // Formatted time (e.g., "10:30 AM")
  temperature: number;           // Temperature reading
  humidity: number;              // Humidity reading
  co2Level: number;              // CO₂ reading
}
```

---

## Component Modules

### Module 1: Root Layout Component (`Root.tsx`)

**Purpose**: Provides shared header navigation and layout wrapper

**Key Features**:
- Sticky header with app branding
- Live clock display (updates every second)
- User profile display (name + role)
- Refresh button with loading animation
- Conditional navigation (Back to Overview on detail pages)
- Context-aware header elements (only show time/user on main dashboard)

**State Management**:
- `currentTime`: Date object updated every 1000ms via setInterval
- `isRefreshing`: Boolean for refresh button loading state
- `location`: Current route path from React Router

**Functions**:
- `formatTime(date)`: Formats time as "HH:MM:SS AM/PM"
- `formatDate(date)`: Formats date as "Weekday, Mon DD, YYYY"
- `handleRefresh()`: Triggers page reload

**Layout Structure**:
```
<div className="min-h-screen bg-slate-50">
  <header>
    - Logo + Title
    - Time Display (main dashboard only)
    - Refresh Button (main dashboard only)
    - User Profile (main dashboard only)
    - Back Button (detail pages only)
  </header>
  <main>
    <Outlet /> <!-- Child routes render here -->
  </main>
</div>
```

---

### Module 2: Main Dashboard Component (`MainDashboard.tsx`)

**Purpose**: Overview of all labs with aggregate metrics and individual lab cards

**Key Sections**:

#### A. Overview Section with Metrics

**Total Labs Card (Toggleable/Horizontal)**:
- Displays total count with status breakdown
- Click to expand/collapse detailed room lists
- Shows rooms grouped by status (Optimal, Warning, Critical)
- Each room name is clickable link to detail view
- Horizontal layout with icons and color-coded indicators

**Aggregate Metrics** (4 cards in grid):
1. **Average Temperature**
   - Color-coded value (green/amber/red)
   - Status dot indicator
   - Optimal range: 20-24°C
   
2. **Average Humidity**
   - Color-coded value
   - Status dot indicator
   - Optimal range: 40-60%
   
3. **Average CO₂**
   - Color-coded value
   - Status dot indicator
   - Optimal range: <500 ppm
   
4. **Total Occupancy**
   - Shows current/max across all labs
   - Displays percentage capacity
   - No color coding (always slate color)

**Status Determination Logic**:

```javascript
// Temperature Status
if (20°C ≤ temp ≤ 24°C) → "optimal" (green)
else if (18°C ≤ temp < 20°C || 24°C < temp ≤ 26°C) → "warning" (amber)
else → "critical" (red)

// Humidity Status
if (40% ≤ humidity ≤ 60%) → "optimal" (green)
else if (35% ≤ humidity < 40% || 60% < humidity ≤ 65%) → "warning" (amber)
else → "critical" (red)

// CO₂ Status
if (co2 < 500 ppm) → "optimal" (green)
else if (500 ppm ≤ co2 < 700 ppm) → "warning" (amber)
else → "critical" (red)
```

#### B. Lab Rooms Section

**Grid Layout**: 2 columns on large screens, 1 column on mobile

**Each Lab Card Contains**:
1. **Header**:
   - Lab name
   - Status badge (Optimal/Warning/Critical with icon)
   - Occupancy count

2. **Metrics Grid** (3 columns):
   - Temperature (°C)
   - Humidity (%)
   - CO₂ (ppm)

3. **Equipment Summary**:
   - Count of online equipment
   - Count of maintenance equipment
   - Count of offline equipment

4. **Recent Alerts** (if any):
   - Shows up to 2 most recent alerts
   - Color-coded by alert type

5. **Footer**:
   - "View Details →" link

**Interactivity**:
- Entire card is clickable link to room detail
- Hover effect: shadow increases

**State Management**:
- `showLabDetails`: Boolean to toggle Total Labs expansion

---

### Module 3: Room Detail Component (`RoomDetail.tsx`)

**Purpose**: In-depth view of a single lab room

---

## Consolidated Functional Notes

The following sections consolidate previously separate documentation for use cases and manager lab assignments.

### Use Cases Summary

- UC1 Threshold Configuration: Admin-configurable thresholds per room.
- UC2 Real-time Monitoring: Dashboard and room views with live environmental metrics.
- UC3 Hazard Response and Alerting: Severity-based alerts and automated actuator triggers.
- UC4 Energy Saving: Presence-based auto-off behavior for non-essential equipment.
- UC5 Manual Override: Technician+ manual control with mode switching.
- UC6 Reports and History: Change logs, trends, and filterable event history.
- UC7 Authentication and Roles: Role-based route and feature access.
- UC8 Device Health: IoT health, connectivity, and diagnostics monitoring.

### Manager Lab Assignment

Managers can be restricted to specific labs through an `assignedLabs` list on user records.

- `manager@smartlab.com` manages labs 1-3.
- `manager2@smartlab.com` manages labs 4-6.
- Admin, Technician, and Viewer accounts are not lab-restricted by default.

Access control behavior:

- Dashboard data and lab cards are filtered by accessible labs.
- Manager users receive a lab access summary banner.
- Lab-level access checks are enforced through authentication context permission helpers.

**Route Parameter**: `roomId` from URL (e.g., `/room/lab-01`)

**Key Sections**:

#### A. Room Header
- Room name (large heading)
- Status badge (Optimal/Warning/Critical)

#### B. Active Alerts Section
- Only displayed if alerts exist
- Full-width alert cards
- Color-coded background and border
- Shows alert icon, message, and timestamp
- Formatted timestamp (locale-specific)

#### C. Current Conditions (4 metric cards)
1. Temperature (°C)
2. Humidity (%)
3. CO₂ Level (ppm)
4. Occupancy (current/max with percentage)

Each card shows:
- Icon (color-coded)
- Large value display
- Optimal range reference

#### D. 24-Hour Trends Chart

**Chart Type**: Multi-line chart using Recharts

**Data Lines**:
- Temperature (orange line)
- Humidity (blue line)
- CO₂ Level (green line)

**Chart Features**:
- Responsive container (width: 100%, height: 300px)
- Grid lines for easier reading
- Interactive tooltip on hover
- Legend to identify lines
- X-axis: Time labels (HH:MM format)
- Y-axis: Numeric values

**Historical Data Generation**:
```javascript
generateHistoricalData(roomId) {
  // Creates 24 data points (one per hour)
  // Each point has:
  //   - time: formatted timestamp
  //   - temperature: base ± random variation (±1.5°C)
  //   - humidity: base ± random variation (±5%)
  //   - co2Level: base ± random variation (±50 ppm)
  // Returns array sorted chronologically
}
```

#### E. Equipment Status Section

**Grid Layout**: 2 columns on medium+ screens, 1 on mobile

**Each Equipment Card Contains**:

1. **Header**:
   - Equipment name
   - Status badge (Online/Offline/Maintenance)
   - Last maintenance date

2. **Control Mode Toggle**:
   - Custom toggle switch component
   - Visual states: Auto (blue) vs Manual (gray)
   - Labels on both sides
   - Stores mode in component state

3. **Mode-Specific Indicators**:
   
   **Auto Mode** (when enabled):
   - Blue background panel
   - Pulsing dot animation
   - Text: "Automatic control enabled"
   
   **Manual Mode** (when enabled + equipment online):
   - Gray background panel
   - Text: "Manual Controls Active"
   - Two action buttons: "Adjust Settings" and "Override"

**State Management**:
- `equipmentModes`: Object mapping equipment IDs to modes
  ```typescript
  {
    "eq-01": "auto",
    "eq-02": "manual",
    // ...
  }
  ```
- `toggleEquipmentMode(equipmentId)`: Switches mode for specific equipment

**Not Found Handling**:
- If roomId doesn't match any lab, displays centered error card
- Shows alert icon, heading, and message

---

### Module 4: Not Found Component (`NotFound.tsx`)

**Purpose**: 404 error page for invalid routes

**Features**:
- Centered layout
- Error icon
- Clear messaging
- Link back to main dashboard

---

### Module 5: Data Layer (`labData.ts`)

**Purpose**: Centralized data source and utilities

**Exports**:

1. **Type Definitions**: All interfaces (LabRoom, Equipment, Alert, HistoricalData)

2. **labRooms Array**: Static data for 6 lab rooms
   - Lab 01: Chemistry Lab A (Optimal)
   - Lab 02: Biology Lab B (Warning - high humidity & CO₂)
   - Lab 03: Physics Lab C (Optimal)
   - Lab 04: Computer Lab D (Critical - high temp & CO₂)
   - Lab 05: Research Lab E (Optimal)
   - Lab 06: Materials Lab F (Warning - elevated CO₂)

3. **generateHistoricalData(roomId) Function**:
   - Generates 24 hours of mock historical data
   - Uses current room values as baseline
   - Adds random variance for realistic trends
   - Returns array of HistoricalData objects

---

## Features & Functionality

### 1. Real-Time Monitoring

**Environmental Metrics**:
- Temperature (Celsius)
- Humidity (Percentage)
- CO₂ Levels (ppm)
- Occupancy (people count)

**Update Mechanism** (in current implementation):
- Static data (no real-time updates)
- Refresh button triggers full page reload
- **For real implementation**: Would use WebSocket, polling, or Server-Sent Events

### 2. Status System

**Three-Tier Status Model**:
- **Optimal (Green)**: All metrics within ideal ranges
- **Warning (Amber)**: One or more metrics approaching limits
- **Critical (Red)**: One or more metrics exceed safe thresholds

**Visual Indicators**:
- Color-coded badges
- Status dots
- Colored text for values
- Background colors for alerts

### 3. Alert System

**Alert Types**:
- **Critical**: Immediate attention required (red)
- **Warning**: Monitor closely (amber)
- **Info**: Informational updates (blue)

**Alert Display**:
- Main Dashboard: Up to 2 recent alerts per lab
- Room Detail: All alerts in dedicated section
- Each alert shows: icon, message, timestamp

### 4. Equipment Management

**Equipment States**:
- **Online**: Fully operational (green)
- **Offline**: Not functioning (red)
- **Maintenance**: Scheduled or ongoing maintenance (amber)

**Control Modes**:
- **Auto**: System-controlled operation
- **Manual**: User-controlled operation

**Mode Switching**:
- Toggle switch UI component
- Visual feedback for current mode
- Mode-specific controls appear/disappear

### 5. Data Visualization

**Chart Features**:
- Multi-line comparison
- 24-hour time window
- Interactive tooltips
- Responsive sizing
- Color-coded lines matching metric icons

### 6. Navigation

**Routing**:
- Main Dashboard → Room Detail (click any lab card)
- Room Detail → Main Dashboard (Back to Overview button)
- Breadcrumb-style navigation

**URL Structure**:
- Main: `/`
- Room Detail: `/room/{roomId}`

### 7. User Interface Elements

**Interactive Components**:
- Toggleable cards (Total Labs)
- Clickable lab cards
- Toggle switches (equipment mode)
- Buttons (Refresh, Back, Manual controls)

**Responsive Design**:
- Mobile: Single column layouts
- Tablet: 2-column layouts
- Desktop: 4-column metric grids

---

## State Management

### Component-Level State

**Root Component**:
```javascript
const [currentTime, setCurrentTime] = useState(new Date());
const [isRefreshing, setIsRefreshing] = useState(false);
```

**MainDashboard Component**:
```javascript
const [showLabDetails, setShowLabDetails] = useState(false);
```

**RoomDetail Component**:
```javascript
const [equipmentModes, setEquipmentModes] = useState<Record<string, "auto" | "manual">>({
  "eq-01": "auto",
  "eq-02": "auto",
  // ... initialized for all equipment
});
```

### Derived State

**Computed Values** (recalculated on each render):
- Total room counts
- Status-filtered room lists
- Average metrics across all labs
- Status determination for averages
- Percentage calculations

### Data Flow

```
labData.ts (source of truth)
    ↓
MainDashboard / RoomDetail (read data)
    ↓
Calculate derived values
    ↓
Render UI components
    ↓
User interactions update local state
```

**Note**: Current implementation has no data persistence. All state resets on page reload.

---

## UI/UX Patterns

### Color Coding System

**Status Colors**:
- Green (#10b981): Optimal, Online, Success
- Amber (#f59e0b): Warning, Maintenance, Caution
- Red (#ef4444): Critical, Offline, Error
- Blue (#3b82f6): Info, Auto mode, Primary actions
- Slate (#64748b): Neutral, Default text
- Purple (#a855f7): Occupancy indicator

**Application**:
- Text colors for values
- Background colors for badges
- Border colors for alerts
- Dot indicators for status

### Typography Hierarchy

**Headings**:
- Page Title: 3xl (30px) - Room name
- Section Title: 2xl (24px) - Overview, Lab Rooms
- Subsection: lg (18px) - Active Alerts, Current Conditions
- Card Title: base/semibold (16px) - Lab names in cards

**Body Text**:
- Large values: 3xl (30px) - Metric displays
- Regular: sm (14px) - Labels, descriptions
- Small: xs (12px) - Timestamps, helper text

### Spacing System

**Margins**:
- Section spacing: mb-8 (32px)
- Card spacing: mb-4/mb-6 (16px/24px)
- Element spacing: mb-2 (8px)

**Padding**:
- Card padding: p-6 (24px)
- Compact card: p-4 (16px)
- Button padding: px-3 py-2 (12px horizontal, 8px vertical)

### Card Design Pattern

**Standard Card Structure**:
```jsx
<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
  <header> <!-- Label + Icon -->
  <main>   <!-- Large value display -->
  <footer> <!-- Helper text or range -->
</div>
```

**Hover States**:
- Clickable cards: `hover:shadow-md`
- Buttons: `hover:bg-slate-50`

### Icon Usage

**Icon Library**: Lucide React

**Common Icons**:
- Thermometer: Temperature
- Droplets: Humidity
- Wind: CO₂/Air quality
- Users: Occupancy
- FlaskConical: Lab/Science
- CheckCircle: Optimal status
- AlertTriangle: Warning status
- AlertCircle: Critical/Error status
- Power/PowerOff: Equipment online/offline
- Wrench: Maintenance
- Settings: Configuration
- Clock: Time/Maintenance date
- Activity: Activity/Total labs
- ChevronDown/Up: Expand/Collapse

**Icon Sizing**:
- Header icons: w-8 h-8 (32px)
- Metric icons: w-5 h-5 (20px)
- Badge icons: w-3 h-3 (12px)
- Button icons: w-4 h-4 (16px)

### Animation & Transitions

**Subtle Animations**:
- Refresh icon: `animate-spin` when loading
- Auto mode indicator: `animate-pulse` (pulsing dot)
- Toggle switch: `transition-transform` for sliding knob
- Hover effects: `transition-shadow`, `transition-colors`

**Timing**: Most transitions use default Tailwind timing (150ms ease)

### Responsive Breakpoints

**Grid Adjustments**:
- Mobile (default): 1 column
- Medium (`md:` 768px+): 2 columns
- Large (`lg:` 1024px+): 3-4 columns

**Hidden Elements**:
- Time/User profile: `hidden md:flex` (show on medium+)
- "Refresh" text: `hidden sm:inline` (show on small+)

---

## Implementation Guidelines

### For Platform Migration

#### 1. **Choose Your Technology Stack**

**Frontend Framework Options**:
- React (current implementation)
- Vue.js
- Angular
- Svelte
- Plain JavaScript with Web Components

**Backend Requirements**:
- REST API or GraphQL for data fetching
- WebSocket for real-time updates (optional but recommended)
- Database for storing lab data, alerts, equipment status

**Chart Library Options**:
- Recharts (React)
- Chart.js (framework-agnostic)
- D3.js (low-level, powerful)
- ApexCharts (feature-rich)

#### 2. **Database Schema**

**Tables/Collections Needed**:

```sql
-- Labs Table
labs (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  status VARCHAR CHECK (status IN ('optimal', 'warning', 'critical')),
  temperature DECIMAL,
  humidity INTEGER,
  co2_level INTEGER,
  occupancy INTEGER,
  max_occupancy INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Equipment Table
equipment (
  id VARCHAR PRIMARY KEY,
  lab_id VARCHAR FOREIGN KEY REFERENCES labs(id),
  name VARCHAR,
  status VARCHAR CHECK (status IN ('online', 'offline', 'maintenance')),
  control_mode VARCHAR CHECK (control_mode IN ('auto', 'manual')),
  last_maintenance DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Alerts Table
alerts (
  id VARCHAR PRIMARY KEY,
  lab_id VARCHAR FOREIGN KEY REFERENCES labs(id),
  type VARCHAR CHECK (type IN ('info', 'warning', 'critical')),
  message TEXT,
  timestamp TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)

-- Historical Data Table
historical_data (
  id SERIAL PRIMARY KEY,
  lab_id VARCHAR FOREIGN KEY REFERENCES labs(id),
  temperature DECIMAL,
  humidity INTEGER,
  co2_level INTEGER,
  recorded_at TIMESTAMP,
  INDEX idx_lab_time (lab_id, recorded_at)
)
```

#### 3. **API Endpoints**

**Required Endpoints**:

```
GET    /api/labs                    # List all labs
GET    /api/labs/:id                # Get specific lab details
GET    /api/labs/:id/history        # Get historical data (24hr)
GET    /api/labs/:id/alerts         # Get lab alerts
POST   /api/labs/:id/alerts         # Create new alert
PATCH  /api/labs/:id/alerts/:alertId  # Update/resolve alert

GET    /api/equipment               # List all equipment
GET    /api/equipment/:id           # Get equipment details
PATCH  /api/equipment/:id/mode      # Update control mode
POST   /api/equipment/:id/control   # Send manual control command

GET    /api/stats/averages          # Get average metrics across all labs
```

**WebSocket Events** (for real-time updates):
```
// Subscribe to lab updates
ws.emit('subscribe:lab', { labId: 'lab-01' })

// Receive updates
ws.on('lab:update', { labId, temperature, humidity, co2Level, ... })
ws.on('alert:new', { labId, alertId, type, message, ... })
ws.on('equipment:status', { equipmentId, status, ... })
```

#### 4. **Real-Time Data Integration**

**Sensor Integration** (hardware to software):
- IoT sensors send data to backend via MQTT, HTTP, or direct serial connection
- Backend processes and validates sensor data
- Data stored in database
- WebSocket broadcasts updates to connected clients

**Update Frequency Recommendations**:
- Environmental sensors: Every 30-60 seconds
- Equipment status: On state change
- Historical data storage: Every 5-15 minutes
- Alert evaluation: On every new sensor reading

#### 5. **Status Calculation Logic**

**Implement Server-Side**:
```javascript
function calculateLabStatus(temperature, humidity, co2Level) {
  const tempCritical = temperature < 18 || temperature > 26;
  const tempWarning = (temperature >= 18 && temperature < 20) || 
                      (temperature > 24 && temperature <= 26);
  
  const humidityCritical = humidity < 35 || humidity > 65;
  const humidityWarning = (humidity >= 35 && humidity < 40) || 
                          (humidity > 60 && humidity <= 65);
  
  const co2Critical = co2Level >= 700;
  const co2Warning = co2Level >= 500 && co2Level < 700;
  
  if (tempCritical || humidityCritical || co2Critical) {
    return 'critical';
  }
  if (tempWarning || humidityWarning || co2Warning) {
    return 'warning';
  }
  return 'optimal';
}
```

**Auto-generate alerts based on status**:
```javascript
function checkAndCreateAlerts(labId, temperature, humidity, co2Level) {
  const alerts = [];
  
  if (temperature > 26) {
    alerts.push({
      type: 'critical',
      message: 'Temperature exceeds safe operating range',
      timestamp: new Date().toISOString()
    });
  }
  
  if (humidity > 60) {
    alerts.push({
      type: 'warning',
      message: 'Humidity level above optimal range',
      timestamp: new Date().toISOString()
    });
  }
  
  if (co2Level >= 700) {
    alerts.push({
      type: 'critical',
      message: 'CO2 level critically high - ventilation needed',
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
}
```

#### 6. **Equipment Control Implementation**

**Auto Mode**:
- Equipment receives commands from automated control system
- System maintains optimal conditions based on sensor readings
- Example: HVAC auto-adjusts to maintain 22°C

**Manual Mode**:
- User sends commands via API
- Backend forwards to equipment controller
- Equipment executes command
- Status update broadcasted to all clients

**Safety Considerations**:
- Implement permission checks (who can control what)
- Add confirmation for critical operations
- Log all manual interventions
- Implement timeouts (auto-revert to auto mode after X hours)

#### 7. **Performance Optimization**

**Frontend**:
- Implement data caching (React Query, SWR, or custom)
- Debounce frequent updates
- Use virtual scrolling for large lists
- Lazy load chart library
- Memoize expensive calculations

**Backend**:
- Index database tables properly
- Implement query result caching (Redis)
- Use pagination for historical data
- Aggregate metrics in background job
- Rate limit API endpoints

#### 8. **Security Considerations**

**Authentication & Authorization**:
- User login system (JWT, session-based, or OAuth)
- Role-based access control (RBAC)
  - Viewer: Read-only access
  - Operator: Can control equipment
  - Admin: Full access including configuration

**Data Validation**:
- Validate all sensor data (reject impossible values)
- Sanitize user inputs
- Implement CSRF protection
- Use HTTPS for all communications

**API Security**:
- Rate limiting
- API key authentication for sensor devices
- Audit logging for all actions

#### 9. **Testing Strategy**

**Unit Tests**:
- Status calculation functions
- Data transformation utilities
- Component rendering

**Integration Tests**:
- API endpoint responses
- Database operations
- WebSocket connections

**E2E Tests**:
- User workflows (view dashboard → click lab → view details)
- Equipment control flow
- Alert creation and display

#### 10. **Deployment Considerations**

**Frontend Hosting**:
- Static site hosting (Vercel, Netlify, S3)
- CDN for global distribution
- Environment-specific builds (dev, staging, prod)

**Backend Hosting**:
- Cloud platforms (AWS, Azure, GCP)
- Container orchestration (Docker, Kubernetes)
- Load balancing for scalability

**Database**:
- Managed database service (RDS, Aurora, etc.)
- Regular automated backups
- Replication for high availability

**Monitoring**:
- Application performance monitoring (APM)
- Error tracking (Sentry, Rollbar)
- Server health monitoring
- Alert for system issues

---

## Mock Data Structure

### Example Lab Data

```javascript
{
  id: "lab-01",
  name: "Chemistry Lab A",
  status: "optimal",
  temperature: 22.5,
  humidity: 45,
  co2Level: 420,
  occupancy: 8,
  maxOccupancy: 20,
  equipment: [
    {
      id: "eq-01",
      name: "Fume Hood 1",
      status: "online",
      lastMaintenance: "2026-02-15"
    },
    {
      id: "eq-04",
      name: "Autoclave",
      status: "maintenance",
      lastMaintenance: "2026-02-10"
    }
  ],
  alerts: []  // No alerts (optimal status)
}
```

```javascript
{
  id: "lab-04",
  name: "Computer Lab D",
  status: "critical",
  temperature: 27.5,  // Too high
  humidity: 38,
  co2Level: 720,      // Too high
  occupancy: 18,
  maxOccupancy: 20,
  equipment: [
    {
      id: "eq-14",
      name: "HVAC System",
      status: "maintenance",
      lastMaintenance: "2026-02-25"
    }
  ],
  alerts: [
    {
      id: "alert-03",
      type: "critical",
      message: "Temperature exceeds safe operating range",
      timestamp: "2026-02-28T11:15:00"
    },
    {
      id: "alert-04",
      type: "critical",
      message: "CO2 level critically high - ventilation needed",
      timestamp: "2026-02-28T11:20:00"
    }
  ]
}
```

---

## Summary Checklist for Implementation

- [ ] Set up routing system (3 routes: main, detail, 404)
- [ ] Create shared layout with persistent header
- [ ] Implement data models/interfaces
- [ ] Build Main Dashboard with overview metrics
- [ ] Build Room Detail view with charts
- [ ] Implement status calculation logic
- [ ] Create color-coding system for statuses
- [ ] Add equipment control toggle functionality
- [ ] Implement historical data visualization
- [ ] Set up API endpoints (if backend needed)
- [ ] Integrate real sensor data (if applicable)
- [ ] Add WebSocket for real-time updates (optional)
- [ ] Implement authentication/authorization
- [ ] Add error handling and loading states
- [ ] Make responsive for mobile/tablet/desktop
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Write tests for critical functionality
- [ ] Set up monitoring and logging
- [ ] Deploy to production environment

---

## Contact & Support

This documentation describes the complete Smart Lab Dashboard system as implemented in React. For specific implementation questions or platform-specific guidance, refer to your chosen framework's documentation and adapt these patterns accordingly.

**Key Principles**:
1. Real-time data is critical for lab safety
2. Clear visual indicators help users quickly identify issues
3. Responsive design ensures access from any device
4. Equipment control requires careful safety considerations
5. Historical trends help identify patterns and prevent issues

Good luck with your implementation!
