# Quick Start Guide - Smart Lab Dashboard

## Access

You must sign in before viewing dashboard content.

### Sign In for Elevated Roles
Use one of the following accounts:

#### Admin Accounts (Full System Access)
| Username | Password | Name | Status |
|----------|----------|------|--------|
| admin | admin123 | Dr. Sarah Chen | Active |
| sysadmin | sysadmin123 | Michael Torres | Active |
| labdirector | director123 | Prof. Rebecca Williams | Active |

#### Technician Accounts (Global Scope - All Labs)
All labs accessible, can manage devices in any lab
| Username | Password | Name | Status |
|----------|----------|------|--------|
| tech | tech123 | Emily Watson | Active |
| maintenance | maintenance123 | David Park | Active |
| supervisor | supervisor123 | Maria Rodriguez | Active |

#### Technician Accounts (Labs 1-3)
Limited to Chemistry, Biology, and Microbiology labs
| Username | Password | Name | Assigned Labs | Status |
|----------|----------|------|----------------|--------|
| manager | manager123 | John Martinez | Labs 1-3 | Active |
| tech_chembio | chembio123 | Kevin O'Brien | Labs 1-3 | Active |
| asst_tech1 | asst123 | Priya Patel | Labs 1-3 | Active |

#### Technician Accounts (Labs 4-6)
Limited to Physics, Electronics, and Fab Lab
| Username | Password | Name | Assigned Labs | Status |
|----------|----------|------|----------------|--------|
| manager2 | manager123 | Lisa Anderson | Labs 4-6 | Active |
| tech_physics | physics123 | James Cohen | Labs 4-6 | Active |
| asst_tech2 | asst456 | Sarah Kim | Labs 4-6 | Inactive |

#### Technician Accounts (Single Lab Assignment)
Specialists with access to individual labs
| Username | Password | Name | Assigned Lab | Status |
|----------|----------|------|--------------|--------|
| lab1_specialist | lab1spec123 | Ahmed Hassan | Lab 1 | Active |
| lab3_specialist | lab3spec123 | Elena Vasquez | Lab 3 | Active |
| lab6_specialist | lab6spec123 | Yuki Tanaka | Lab 6 | Active |

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
