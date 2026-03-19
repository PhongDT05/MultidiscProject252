# Lab Assignment Feature for Managers

## Overview
Managers can now be assigned to specific laboratories instead of having access to all labs. This provides better organizational control and ensures managers only see and manage the labs they're responsible for.

---

## Implementation Details

### **1. User Model Enhancement**
Added `assignedLabs` field to the User interface:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  assignedLabs?: string[]; // Lab IDs this user can access
}
```

- **`undefined` or `null`**: User has access to all labs (Admin, Technician, Viewer)
- **Array of lab IDs**: User only has access to specified labs (Managers)

---

### **2. New Manager Accounts**

#### **Manager 1 - John Martinez**
- **Email:** `manager@smartlab.com`
- **Password:** `manager123`
- **Assigned Labs:** 
  - `lab-01` - Chemistry Lab A
  - `lab-02` - Biology Lab B
  - `lab-03` - Physics Lab C

#### **Manager 2 - Lisa Anderson**
- **Email:** `manager2@smartlab.com`
- **Password:** `manager123`
- **Assigned Labs:**
  - `lab-04` - Computer Lab D
  - `lab-05` - Research Lab E
  - `lab-06` - Materials Lab F

---

### **3. Access Control Function**

New `canAccessLab()` function in AuthContext:

```typescript
const canAccessLab = (labId: string): boolean => {
  if (!user) return false;
  // Admin can access all labs
  if (user.role === 'admin') return true;
  // If assignedLabs is undefined/null, user can access all labs
  if (!user.assignedLabs) return true;
  // Otherwise check if lab is in assigned list
  return user.assignedLabs.includes(labId);
};
```

---

### **4. UI Changes**

#### **A. Lab Access Banner**
When a manager logs in, they see a blue info banner showing:
- Number of labs they have access to (e.g., "3 of 6 laboratories")
- List of assigned lab names

#### **B. Filtered Dashboard**
- **Lab Rooms:** Only shows labs the manager has access to
- **Overview Stats:** Calculates averages only from accessible labs
- **Total Labs Count:** Shows accessible lab count, not total count

#### **C. Visual Indicators**
- Labs the user cannot access are grayed out (if shown)
- Lock icon (🔒) displayed next to restricted labs

---

### **5. User Role Access Matrix**

| Role | Lab Access | Can Assign Labs |
|------|-----------|-----------------|
| **Admin** | All labs (always) | Yes (via User Management) |
| **Manager** | Assigned labs only | No |
| **Technician** | All labs | No |
| **Viewer** | All labs (read-only) | No |

---

## Testing the Feature

### **Test as Manager 1:**
1. Login with `manager@smartlab.com` / `manager123`
2. You should see:
   - Lab Access Banner showing "3 of 6 laboratories"
   - Only Chemistry Lab A, Biology Lab B, and Physics Lab C visible
   - Overview stats calculated from these 3 labs only

### **Test as Manager 2:**
1. Login with `manager2@smartlab.com` / `manager123`
2. You should see:
   - Lab Access Banner showing "3 of 6 laboratories"
   - Only Computer Lab D, Research Lab E, and Materials Lab F visible
   - Overview stats calculated from these 3 labs only

### **Test as Admin:**
1. Login with `admin@smartlab.com` / `admin123`
2. You should see:
   - NO Lab Access Banner (admins see all labs)
   - All 6 laboratories visible
   - Overview stats from all labs

---

## Benefits

✅ **Better Organization:** Managers only see labs they're responsible for  
✅ **Reduced Complexity:** Simpler dashboard with relevant labs only  
✅ **Improved Security:** Managers can't access labs outside their assignment  
✅ **Scalability:** Easy to assign/reassign labs as organization grows  
✅ **Clear Responsibility:** Each lab has a designated manager  

---

## Future Enhancements (Not Yet Implemented)

- **Admin UI for Lab Assignment:** Drag-and-drop interface to assign labs to managers
- **Multi-Manager Labs:** Allow multiple managers per lab
- **Department-Based Assignment:** Group labs by department and assign by department
- **Temporary Access:** Grant time-limited access to specific labs
- **Access Request System:** Managers can request access to additional labs
- **Audit Trail:** Log all lab assignment changes

---

## Database Schema (For Real Implementation)

When moving from mock data to real database:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lab assignments table (many-to-many)
CREATE TABLE user_lab_assignments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lab_id VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, lab_id)
);

-- Query to get user's assigned labs
SELECT lab_id FROM user_lab_assignments WHERE user_id = ?;
```

---

**Last Updated:** March 19, 2026  
**Feature Status:** ✅ Implemented and Tested
