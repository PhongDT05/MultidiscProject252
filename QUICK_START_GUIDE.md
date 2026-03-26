# Quick Start Guide - Smart Lab Dashboard

## Access

You must sign in before viewing dashboard content.

### Sign In for Elevated Roles
Use one of the following accounts:

| Role | Username | Password | Scope |
|------|----------|----------|-------|
| Admin | admin | admin123 | Full system access |
| Technician (Labs 1-3) | manager | manager123 | Operational controls with lab assignment |
| Technician (Labs 4-6) | manager2 | manager123 | Operational controls with lab assignment |
| Technician (Global) | tech | tech123 | Operational controls |

Note: Student is a read-only role that can be assigned by an administrator.

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
- Student: read-only monitoring after login
