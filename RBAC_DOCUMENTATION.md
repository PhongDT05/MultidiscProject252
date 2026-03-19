# Authentication and RBAC Documentation

## Overview

This Smart Lab Dashboard implements a comprehensive Role-Based Access Control (RBAC) system with authentication. The system uses React Context for state management and localStorage for session persistence.

## User Roles

The system defines 4 distinct user roles with hierarchical permissions:

### 1. Admin
- **Access Level**: Full system access
- **Permissions**:
  - View all data and dashboards
  - Control all equipment (Auto/Manual modes)
  - Manage lab settings and configurations
  - User management (future feature)
  - System settings (future feature)

### 2. Manager
- **Access Level**: Lab and equipment management
- **Permissions**:
  - View all data and dashboards
  - Control all equipment (Auto/Manual modes)
  - Manage lab settings and configurations
  - Generate reports (future feature)

### 3. Technician
- **Access Level**: Equipment control
- **Permissions**:
  - View all data and dashboards
  - Control equipment (Auto/Manual modes)
  - Update maintenance records
  - Cannot modify lab settings

### 4. Viewer
- **Access Level**: Read-only
- **Permissions**:
  - View all data and dashboards only
  - Cannot control equipment
  - Cannot modify any settings

## Demo Accounts

For testing purposes, the following demo accounts are available:

```
Admin Account:
Email: admin@smartlab.com
Password: admin123

Manager Account:
Email: manager@smartlab.com
Password: manager123

Technician Account:
Email: tech@smartlab.com
Password: tech123

Viewer Account:
Email: viewer@smartlab.com
Password: viewer123
```

## Architecture

### Authentication Context (`/src/app/contexts/AuthContext.tsx`)

The authentication system is built using React Context API and provides:

- **User State Management**: Manages current user session
- **Login/Logout Functions**: Handles authentication flow
- **Permission Checking**: `hasPermission()` and `hasAnyPermission()` methods
- **Session Persistence**: Uses localStorage to maintain sessions across page reloads

### Protected Routes (`/src/app/components/ProtectedRoute.tsx`)

Wrapper component that:
- Redirects unauthenticated users to login page
- Checks role-based permissions for specific routes
- Redirects unauthorized users to an "Unauthorized" page

### Role Hierarchy

Roles are hierarchical, meaning higher-level roles automatically have permissions of lower-level roles:

```
Admin (Level 4)
  ↓
Manager (Level 3)
  ↓
Technician (Level 2)
  ↓
Viewer (Level 1)
```

## Implementation Examples

### Checking Permissions in Components

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  
  // Check if user has specific role or higher
  const canControlEquipment = hasPermission('technician');
  
  // Check if user has any of the specified roles
  const canManage = hasAnyPermission(['admin', 'manager']);
  
  return (
    <div>
      {canControlEquipment && (
        <button>Control Equipment</button>
      )}
      {!canControlEquipment && (
        <div>You need Technician role or higher</div>
      )}
    </div>
  );
}
```

### Protecting Routes

```typescript
import { ProtectedRoute } from './components/ProtectedRoute';

// Protect entire route
{
  path: "/admin",
  element: (
    <ProtectedRoute requiredRole="admin">
      <AdminPanel />
    </ProtectedRoute>
  )
}

// Allow multiple roles
{
  path: "/equipment",
  element: (
    <ProtectedRoute requiredRoles={['admin', 'manager', 'technician']}>
      <EquipmentControl />
    </ProtectedRoute>
  )
}
```

## Current RBAC Features

### Login Page (`/src/app/components/Login.tsx`)
- Clean, modern login interface
- Email and password authentication
- Quick-fill demo accounts
- Visual role permission guide
- Loading states and error handling

### Equipment Control (Room Detail Page)
- **Viewer**: Can only view equipment status
- **Technician+**: Can toggle Auto/Manual modes
- **Technician+**: Can access manual control settings
- Visual indicators showing permission requirements
- Lock icons for restricted features

### User Profile Header
- Displays current user name and role
- Color-coded role badges:
  - Admin: Purple
  - Manager: Blue
  - Technician: Green
  - Viewer: Gray
- Dropdown menu with logout functionality

## Security Features

### Current Implementation
1. **Session Management**: Uses localStorage for client-side session persistence
2. **Route Protection**: All dashboard routes require authentication
3. **UI-level Restrictions**: Controls are hidden/disabled based on permissions
4. **Role Hierarchy**: Automatic permission inheritance

### Limitations (Mock Implementation)
⚠️ **Important**: This is a demo implementation with mock authentication:
- Passwords are stored in plain text in the client code
- No server-side validation
- No token-based authentication
- Session data is stored in localStorage (insecure for production)

## Migrating to Production

### Recommended Approach: Supabase Integration

For a production-ready implementation, we recommend integrating **Supabase**:

#### Benefits:
1. **Secure Authentication**: Server-side password hashing and validation
2. **JWT Tokens**: Secure, stateless authentication
3. **Row Level Security (RLS)**: Database-level permission enforcement
4. **Session Management**: Automatic token refresh and session handling
5. **OAuth Support**: Social login options (Google, GitHub, etc.)
6. **Email Verification**: Built-in email verification flows
7. **Password Reset**: Secure password recovery

#### Migration Steps:

1. **Install Supabase**:
```bash
npm install @supabase/supabase-js
```

2. **Update AuthContext** to use Supabase:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Login with Supabase
const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { success: false, error: error.message };
  
  // Store user role from database
  return { success: true };
};
```

3. **Create User Profiles Table** in Supabase:
```sql
create table user_profiles (
  id uuid references auth.users primary key,
  email text,
  name text,
  role text check (role in ('admin', 'manager', 'technician', 'viewer')),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table user_profiles enable row level security;

-- Create policies
create policy "Users can read own profile"
  on user_profiles for select
  using (auth.uid() = id);
```

4. **Implement Row Level Security** for lab data:
```sql
-- Only managers and admins can update lab settings
create policy "Managers can update labs"
  on lab_rooms for update
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role in ('admin', 'manager')
    )
  );
```

### Alternative Approaches

#### Custom Backend API
- Build REST or GraphQL API
- Implement JWT authentication
- Use bcrypt for password hashing
- Manage refresh tokens

#### Firebase Authentication
- Similar to Supabase
- Good integration with React
- Includes real-time capabilities

#### Auth0 / Clerk
- Third-party auth services
- Quick to implement
- Handle all security concerns

## Future Enhancements

### Planned Features:
1. **Multi-Factor Authentication (MFA)**: Additional security layer
2. **Audit Logging**: Track all permission-based actions
3. **Fine-grained Permissions**: Per-equipment or per-lab permissions
4. **User Management UI**: Admin panel for creating/managing users
5. **Password Policies**: Enforce strong passwords
6. **Session Timeout**: Automatic logout after inactivity
7. **Permission Groups**: Custom permission sets beyond base roles
8. **API Key Management**: For programmatic access

## Testing RBAC

### Test Scenarios:

1. **Login as Viewer**:
   - ✓ Can view all dashboards
   - ✗ Cannot toggle equipment modes
   - ✗ Equipment controls show locked state

2. **Login as Technician**:
   - ✓ Can view all dashboards
   - ✓ Can toggle Auto/Manual equipment modes
   - ✓ Can access manual controls
   - ✗ Cannot access admin settings (future)

3. **Login as Manager**:
   - ✓ Full access to equipment controls
   - ✓ Can manage lab settings (future)
   - ✓ Can generate reports (future)

4. **Login as Admin**:
   - ✓ Full system access
   - ✓ Can manage users (future)
   - ✓ Can modify system settings (future)

## Support

For questions or issues with the RBAC system, contact the development team or refer to the main system documentation.

---

**Last Updated**: March 18, 2026  
**Version**: 1.0.0
