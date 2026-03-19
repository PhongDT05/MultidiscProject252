# Quick Start - RBAC Authentication

## Login to Access the Dashboard

The Smart Lab Dashboard now requires authentication. Visit the login page to access the system.

## Demo Accounts

Use these accounts to test different permission levels:

### 🟣 Admin Access
- **Email**: admin@smartlab.com
- **Password**: admin123
- **Permissions**: Full system access

### 🔵 Manager Access
- **Email**: manager@smartlab.com
- **Password**: manager123
- **Permissions**: Equipment control + Lab management

### 🟢 Technician Access
- **Email**: tech@smartlab.com
- **Password**: tech123
- **Permissions**: Equipment control only

### ⚪ Viewer Access
- **Email**: viewer@smartlab.com
- **Password**: viewer123
- **Permissions**: Read-only access

## Key Features

### Login Page
- Modern, user-friendly interface
- Quick-fill demo account buttons
- Visual role permission guide
- Password show/hide toggle

### Role-Based Permissions
- **Equipment Controls**: Locked for Viewers, available for Technician+
- **Visual Indicators**: Lock icons and permission badges on restricted features
- **Permission Banner**: Dashboard shows current role and available permissions
- **Color-Coded Roles**: Each role has a distinct color (Admin=Purple, Manager=Blue, Technician=Green, Viewer=Gray)

### User Profile
- Displays current user name and role in header
- Dropdown menu with user details
- Easy logout functionality
- Role badge with shield icon

## Testing RBAC

1. **Start as Viewer** to see read-only mode
2. **Switch to Technician** to access equipment controls
3. **Try Manager** for future management features
4. **Use Admin** for full access

## Documentation

See `/RBAC_DOCUMENTATION.md` for complete implementation details, security notes, and production migration guidance.

## Security Note

⚠️ This is a **demo implementation** with mock authentication. For production use, integrate with a secure backend (Supabase recommended) as detailed in the RBAC documentation.

---

**Quick Start Complete!** Log in with any demo account above to begin.
