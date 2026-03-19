# Quick Start Guide - Smart Lab Dashboard

## Demo Accounts

Below are test accounts you can use to explore the system with different role-based permissions:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@smartlab.com | admin123 | Full system access, user management & system settings |
| **Manager** | manager@smartlab.com | manager123 | Labs 1-3 (Chemistry, Biology, Physics) |
| **Manager 2** | manager2@smartlab.com | manager123 | Labs 4-6 (Computer, Research, Materials) |
| **Technician** | tech@smartlab.com | tech123 | Equipment control & maintenance updates |
| **Viewer** | viewer@smartlab.com | viewer123 | Read-only dashboard access |

## Role Permissions

### Admin
- Full access including user management & system settings
- Configure thresholds for all labs
- Manage all users
- View all alerts and reports
- Manual equipment override (all labs)

### Manager
- Lab & equipment management, reporting
- View and acknowledge alerts
- Manual equipment override (assigned labs only)
- User oversight for assigned labs
- Access to Labs 1-3 or Labs 4-6 (depending on account)

### Technician
- Equipment control & maintenance updates
- Alert acknowledgment
- Manual equipment override
- Read access to all lab data

### Viewer
- Read-only dashboard access
- View all labs and real-time data
- Cannot acknowledge alerts or control equipment
- No modification privileges

## Running the Application

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Steps

1. **Navigate to the project directory:**
   ```bash
   cd d:\ĐH\ĐAĐN
   ```

2. **Install dependencies:**
   ```bash
   npm i
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Navigate to `http://localhost:5173/`
   - The application will open to the login screen

5. **Login with a demo account:**
   - Choose any account from the table above
   - Enter the email and password
   - Click "Sign In" to access the dashboard

## Key Features

- **Real-time Monitoring**: Dashboard displays live environmental metrics (temperature, humidity, CO₂, light levels)
- **Alert Management**: Centralized alert center for monitoring and acknowledgment
- **Equipment Control**: Manual override capability for HVAC, fans, lighting, and ventilation
- **User Management**: Admin-only feature for managing system users
- **Threshold Configuration**: Admin-only interface for setting environmental parameters
- **Device Health**: Monitor IoT device connectivity and status
- **Data Logging**: Comprehensive audit trail of all system changes

## Data Persistence

- All data is persisted to browser localStorage
- Accounts and lab configurations are seeded on first run
- Alerts, equipment settings, and user preferences update in real-time
- Session information is preserved across page refreshes

## Authentication Notes (Consolidated)

This project uses a demo RBAC authentication flow with role hierarchy:

- Admin: full access
- Manager: lab and equipment management
- Technician: equipment control and maintenance updates
- Viewer: read-only access

### RBAC Testing Flow

1. Login as Viewer and verify read-only behavior.
2. Login as Technician and verify control permissions.
3. Login as Manager and verify management capabilities.
4. Login as Admin and verify full access, including admin-only areas.

### Security Note

This is a demo implementation using localStorage and seeded credentials.
For production, integrate secure server-side authentication and authorization.
