# Quick Start Guide - Smart Lab Dashboard

## Access Modes

### Guest (Default)
- Open the app and start immediately in Guest mode (no login required)
- Can view:
  - Dashboard
  - Room detail pages
  - Alerts page
- Cannot:
  - Modify equipment or settings
  - View logs
  - View device worked-time

### Sign In for Elevated Roles
Use one of the following accounts:

| Role | Username | Password | Scope |
|------|----------|----------|-------|
| Admin | admin | admin123 | Full system access |
| Technician (Labs 1-3) | manager | manager123 | Operational controls with lab assignment |
| Technician (Labs 4-6) | manager2 | manager123 | Operational controls with lab assignment |
| Technician (Global) | tech | tech123 | Operational controls |

Note: Viewer login account is removed. Read-only behavior is provided through Guest mode.

## Running the Application

1. Install dependencies:

```bash
npm i
```

2. Start development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:5173/
```

## Capability Summary

- Admin: full privileges
- Technician: operational privileges (controls, logs, worked-time, alert acknowledge-all)
- Guest: read-only monitoring on approved routes
