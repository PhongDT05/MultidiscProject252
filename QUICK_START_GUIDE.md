# Quick Start Guide - Smart Lab Dashboard

## Access

You must sign in before viewing dashboard content.

### Sign In for Elevated Roles
Use one of the following accounts:

#### Admin Accounts (Full System Access)
| Username | Password | Name | Status |
|----------|----------|------|--------|
| admin | admin123 | Dr. Sarah Chen | Active |

#### Technician Accounts
All labs accessible, can manage devices in any lab
| Username | Password | Name | Status |
|----------|----------|------|--------|
| tech | tech123 | Emily Watson | Active |

#### Student Accounts
Read-only monitoring after login
| Username | Password | Name | Status |
|----------|----------|------|--------|
| student | student123 | Guest Student | Active |

#### Instructor Accounts
Lab-recommendation and threshold workflows
| Username | Password | Name | Assigned Labs | Status |
|----------|----------|------|----------------|--------|
| instructor1 | instructor123 | Dr. Lan Instructor | Labs 2-3 | Active |

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
- Instructor: lab guidance and threshold workflows
- Student: read-only monitoring after login
