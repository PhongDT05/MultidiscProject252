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
  - Cannot control equipment
  - Cannot acknowledge alerts
  - Cannot view data change logs
  - Cannot view device worked-time
  - Cannot access `/devices`, `/users`, `/config`, `/thresholds`

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

## Demo Accounts

```text
Admin Account:
Username: admin
Password: admin123

Technician Account (Labs 1-3):
Username: manager
Password: manager123

Technician Account (Labs 4-6):
Username: manager2
Password: manager123

Technician Account (Global):
Username: tech
Password: tech123
```

## Runtime Visibility

Cumulative equipment worked-time is tracked and persisted for equipment entities.

- Visible to: Technician, Admin
- Hidden from: Student
- Runtime updates as the simulator runs and equipment remains online

## Current Security Scope

This is a demo/client-side RBAC implementation.

- Route and UI checks are enforced client-side.
- Session and data are stored in localStorage in the mock API.
- For production, enforce authorization server-side and use secure authentication.
