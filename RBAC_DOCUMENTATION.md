# Authentication and RBAC Documentation

## Overview

This Smart Lab Dashboard now uses a guest-first access model:

- First-time visitors enter in Guest (student) mode without login.
- Guest mode is read-only and can view lab conditions only on approved routes.
- Signing in unlocks role-specific privileges.
- Signing out returns users to Guest mode on `/` instead of the login screen.

Authentication state and permissions are managed in React Context and persisted with localStorage in the mock API layer.

## Access Model

### Guest (Student Mode)
- Login required: No
- Effective permission level: Viewer-equivalent
- Allowed routes:
  - `/`
  - `/room/:roomId`
  - `/alerts`
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
Admin (Level 4)
  ↓
Technician (Level 2)
  ↓
Viewer / Guest-equivalent (Level 1)
```

Important: Viewer is no longer provided as a seeded login account. Read-only behavior is delivered through Guest mode.

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
- Hidden from: Guest
- Runtime updates as the simulator runs and equipment remains online

## Current Security Scope

This is a demo/client-side RBAC implementation.

- Route and UI checks are enforced client-side.
- Session and data are stored in localStorage in the mock API.
- For production, enforce authorization server-side and use secure authentication.
