# Authentication and RBAC Documentation

## Overview

This Smart Lab Dashboard now uses a login-first access model:

- Users must sign in before accessing dashboard content.
- Student role remains read-only and must sign in like other roles.
- Signing in unlocks role-specific privileges.
- Signing out returns users to the login screen.

Authentication state and permissions are managed in React Context and persisted with localStorage in the mock API layer.

## Access Model

### Student
- Login required: Yes
- Effective permission level: Student (read-only)
- Restrictions:
  - Cannot access dashboard content without login
  - Cannot control equipment
  - Cannot acknowledge alerts
  - Cannot view data change logs
  - Cannot view device worked-time
  - Cannot access `/dashboard/devices`, `/dashboard/users`, `/dashboard/config`, `/dashboard/thresholds`

### Signed-In Roles

#### Admin
- Full system access
- User management and system configuration
- Threshold configuration
- Equipment control
- Alert acknowledgment and acknowledge-all
- Logs and runtime visibility

#### Technician
- Operational role
- Equipment control
- Alert acknowledgment and acknowledge-all
- Data change log visibility
- Device worked-time visibility

## Role Hierarchy

```text
Admin (Level 3)
  ↓
Technician (Level 2)
  ↓
Student (Level 1)
```

Important: Read-only behavior is delivered through Student mode.

## Quick Reference - Canonical Demo Accounts

| Category | Username | Password | Name | Scope |
|----------|----------|----------|------|-------|
| **Admin** | admin | admin123 | Dr. Sarah Chen | All labs |
| **Technician** | tech | tech123 | Emily Watson | All labs |
| **Instructor** | instructor1 | instructor123 | Dr. Lan Instructor | Labs 2-3 |
| **Student** | student | student123 | Guest Student | Read-only |

## Demo Accounts

### Admin
Full system access.

```
Username: admin
Password: admin123
Name: Dr. Sarah Chen
```

### Technician
Operational access across all labs.

```
Username: tech
Password: tech123
Name: Emily Watson
```

### Instructor
Lab guidance and threshold workflows for assigned labs.

```
Username: instructor1
Password: instructor123
Name: Dr. Lan Instructor
Assigned Labs: lab-02, lab-03
```

### Student
Read-only access after login.

```
Username: student
Password: student123
Name: Guest Student
```

The older manager-style and specialist-style demo users were removed from the mock set.

## Runtime Visibility

Cumulative equipment worked-time is tracked and persisted for equipment entities.

- Visible to: Technician, Admin
- Hidden from: Student
- Runtime updates as the simulator runs and equipment remains online

## Data Logs Access Control

Data change logs are now restricted by lab-based access control. Users can only view logs from labs they have access to.

### Log Visibility by Role

#### Admin
- Full access to all lab logs
- Can view data change logs from any lab
- Can view device operation logs across all facilities

#### Technician (Global Scope)
- Access to logs from all labs
- Can view any data change log in the system
- No lab assignment restrictions

#### Technician (Lab-Scoped)
- Access restricted to assigned labs only
- Can view data change logs only from labs in their assigned list
- Example: Manager assigned to Labs 1-3 can only see logs from Chemistry, Biology, and Microbiology labs
- Cannot view logs from Labs 4-6 (Physics, Electronics, Fab Lab)

#### Student
- Cannot access data change logs (read-only role restriction)

### Log Entry Structure

Each data change log now includes a `labId` field that identifies which lab the change occurred in:

```typescript
interface DataChangeLog {
  id: string;
  timestamp: Date;
  roomId?: string;
  roomName?: string;
  labId?: string;           // Lab identifier for access control
  changeType: ChangeType;
  field: string;
  oldValue: string | number;
  newValue: string | number;
  user?: string;
  description: string;
}
```

### Implementation Details

- Logs without a `labId` are accessible to all authorized users (global system logs)
- Logs with a `labId` are filtered based on the user's `assignedLabs` array
- The `DataLogContext` provides two sets of methods:
  - `getLogsByRoom()`: Returns all logs for a room (unfiltered)
  - `getAuthorizedLogsByRoom()`: Returns only logs the user can access
- The ChangeLog component automatically uses authorized logs to respect user permissions

## Current Security Scope

This is a demo/client-side RBAC implementation.

- Route and UI checks are enforced client-side.
- Session and data are stored in localStorage in the mock API.
- For production, enforce authorization server-side and use secure authentication.

## SQL Server RBAC Schema (v1)

The RBAC relational model is now defined for SQL Server implementation.

### Tables

- `smartlab.Role`
  - `RoleId` (PK), `RoleCode` (`ADMIN`, `TECHNICIAN`, `STUDENT`), `RoleName`
- `smartlab.User`
  - `UserId` (PK), `Username` (unique), `Email` (unique), `PasswordHash`, `DisplayName`, `RoleId` (FK), `AccountStatus`, audit timestamps
- `smartlab.UserLabAssignment`
  - Composite PK (`UserId`, `LabId`), lab-scoped assignment for technician/manager-style access

### Access Mapping

- Admin
  - Full access across all labs.
  - No lab-assignment restriction required.
- Technician
  - Access restricted by rows in `UserLabAssignment`.
  - Global technician is represented by assignments to all labs.
- Student
  - Read-only behavior remains enforced at permission layer.
  - Typically no entries in `UserLabAssignment` are required.

### SQL Server Script Files

- `database/sqlserver/001_schema.sql`
  - Full relational schema with constraints and indexes.
- `database/sqlserver/002_seed_demo.sql`
  - Seed roles, demo users, labs, and assignment examples.

### Notes

- Current frontend demo still uses client-side/localStorage state.
- These SQL scripts establish the production-ready RBAC data model for backend integration.

## Authentication Regression Checklist

Use this checklist after backend or routing/auth changes.

### Login-First Entry

1. Open app at `/` in an incognito/private browser window.
2. Verify app redirects to `/login`.
3. Verify no dashboard widgets or protected content render before login.

### Protected Routes

1. Access `/dashboard` without a session.
2. Verify redirect to `/login`.
3. Access `/dashboard/room/lab-01` without a session.
4. Verify redirect to `/login`.

### Successful Login

1. Login with valid credentials.
2. Verify redirect to `/dashboard`.
3. Verify header shows authenticated user name and role.

### Student Role Validation

1. Login with a Student account.
2. Verify Student can view dashboard read-only data.
3. Verify Student cannot access:
  - `/dashboard/devices`
  - `/dashboard/users`
  - `/dashboard/config`
  - `/dashboard/thresholds`
4. Verify Student cannot acknowledge alerts or execute equipment control actions.

### Logout Behavior

1. Click Sign Out.
2. Verify redirect to `/login`.
3. Attempt to open `/dashboard` via URL after logout.
4. Verify redirect to `/login`.

### Role-Based Lab Access (Technician)

1. Login as `manager` and verify visibility is limited to assigned labs.
2. Login as `manager2` and verify visibility is limited to assigned labs.
3. Login as global `tech` and verify all labs are accessible.

## Testing Scenarios

Use these scenarios to verify correct RBAC implementation across frontend, device management, and future backend integration.

### Scenario 1: Full Admin Access
**Account:** `admin` / `admin123`  
**Expected Results:**
- [ ] Can view all 6 labs on dashboard
- [ ] Can access User Management (`/dashboard/users`)
- [ ] Can access System Configuration (`/dashboard/config`)
- [ ] Can access Threshold Configuration (`/dashboard/thresholds`)
- [ ] Can access Device Management (`/dashboard/devices`)
- [ ] Can control equipment (toggle auto/manual mode) in any lab
- [ ] Can add/insert devices in any lab using the "Add Device" button
- [ ] Can acknowledge all alerts across all labs
- [ ] Can view device worked-time and change logs

### Scenario 2: Global Technician Device Management
**Account:** `tech` / `tech123`  
**Expected Results:**
- [ ] Can view all 6 labs on dashboard
- [ ] Cannot access User Management, System Configuration, or Thresholds
- [ ] Can access Device Management (read-only overview)
- [ ] Can add/insert devices in ALL labs (no restrictions)
- [ ] Can control equipment in any lab
- [ ] Can acknowledge alerts in any lab
- [ ] Can view device worked-time and change logs

### Scenario 3: Scoped Technician (Labs 1-3)
**Account:** `manager` / `manager123`  
**Expected Results:**
- [ ] Dashboard shows only Labs 1, 2, 3 (Chemistry, Biology, Microbiology)
- [ ] Cannot view Labs 4, 5, 6 (shows "Access Restricted")
- [ ] Can add/insert devices only in Labs 1-3
- [ ] "Add Device" button appears in Labs 1-3 rooms
- [ ] "Add Device" button does NOT appear in Labs 4-6 rooms
- [ ] Can control equipment only in assigned labs
- [ ] Can acknowledge alerts only in assigned labs

### Scenario 4: Scoped Technician (Labs 4-6)
**Account:** `manager2` / `manager123`  
**Expected Results:**
- [ ] Dashboard shows only Labs 4, 5, 6 (Physics, Electronics, Fab Lab)
- [ ] Cannot view Labs 1, 2, 3 (shows "Access Restricted")
- [ ] Can add/insert devices only in Labs 4-6
- [ ] Can control equipment only in assigned labs

### Scenario 5: Single Lab Specialist
**Account:** `lab1_specialist` / `lab1spec123`  
**Expected Results:**
- [ ] Dashboard shows only Lab 1
- [ ] Cannot view other labs
- [ ] Can add/insert devices only in Lab 1
- [ ] Can control equipment only in Lab 1

### Scenario 6: Inactive Technician
**Account:** `asst_tech2` / `asst456`  
**Expected Results:**
- [ ] Login attempt fails or shows "Account inactive" message
- [ ] Cannot access any dashboard content
- [ ] Admin should see this user marked as "Inactive" in User Management

### Scenario 7: Device Insertion Authorization
**Prerequisites:** Login as technician with device insertion feature implemented

| User | Lab 1 | Lab 2 | Lab 3 | Lab 4 | Lab 5 | Lab 6 |
|------|-------|-------|-------|-------|-------|-------|
| admin | ✅ Add | ✅ Add | ✅ Add | ✅ Add | ✅ Add | ✅ Add |
| tech (global) | ✅ Add | ✅ Add | ✅ Add | ✅ Add | ✅ Add | ✅ Add |
| manager (1-3) | ✅ Add | ✅ Add | ✅ Add | ❌ Denied | ❌ Denied | ❌ Denied |
| manager2 (4-6) | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Add | ✅ Add | ✅ Add |
| lab1_specialist | ✅ Add | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |

### Scenario 8: Multi-User Concurrent Access
**Steps:**
1. Open two browser windows/tabs
2. Login as `manager` in window 1 (Labs 1-3 scoped)
3. Login as `manager2` in window 2 (Labs 4-6 scoped)
4. Verify each user sees only their assigned labs
5. In window 1, add a device to Lab 1
6. Switch to window 2, refresh, verify device appears (if synced across sessions)
7. In window 2, try to add device to Lab 1 (should fail/show access denied)

### Scenario 9: Permission Boundary Testing
**Test each permission boundary:**
- [ ] Student cannot see "Add Device" button (read-only)
- [ ] Scoped technician cannot navigate to unassigned lab rooms
- [ ] Global technician can navigate to any lab
- [ ] Admin can navigate to any lab
- [ ] Logout clears session; redirect to login required for re-access

### Scenario 10: Device Type Coverage
After logging in with device insertion enabled, verify all device types can be added:
- [ ] IoT Sensor (with signal strength, battery, firmware, location, data rate)
- [ ] IoT Gateway (with signal strength, firmware, location, data rate)
- [ ] IoT Actuator (with control mode, signal strength)
- [ ] Equipment (with last maintenance, mode, essential flag)

All properties should be populated with sensible defaults or user-provided values.
