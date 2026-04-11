import { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  ShieldAlert,
  ShieldCheck,
  X,
  Save,
  UserCircle,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
  status: 'active' | 'inactive';
}

export function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const { users, addUser, updateUser, deleteUser, isLoading, error } = useAppData();
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserData>>({
    name: '',
    username: '',
    role: 'instructor',
    status: 'active'
  });
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getDisplayUsername = (userData: { username?: string; email: string }) => {
    if (userData.username && userData.username.trim().length > 0) return userData.username;
    return userData.email.split('@')[0] || 'unknown';
  };

  // Only admins can access this component
  if (!hasPermission('admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'technician':
        return <ShieldAlert className="w-4 h-4 text-green-600" />;
      case 'instructor':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'student':
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'technician':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'instructor':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'student':
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handleEditUser = (userData: { id: string; username?: string; email: string; name: string; role: UserRole; lastLogin?: string; status: 'active' | 'inactive' }) => {
    setEditingUser({
      ...userData,
      username: getDisplayUsername(userData),
    });
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      const isSelf = editingUser.id === currentUser?.id;
      const original = users.find((item) => item.id === editingUser.id);

      updateUser(editingUser.id, {
        ...editingUser,
        name: isSelf ? editingUser.name : original?.name ?? editingUser.name,
        username: isSelf
          ? editingUser.username
          : (original?.username || getDisplayUsername(original || { email: 'unknown@local' })),
      });
      setEditingUser(null);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser(userId);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!currentUser?.id) return;

    const confirmed = confirm(
      `Reset password for ${userName}? The new password will be set to "smartlab123".`
    );
    if (!confirmed) return;

    setResetPasswordUserId(userId);
    setResetPasswordLoading(true);
    setResetPasswordMessage(null);

    const { success, error } = await (
      await import('../services/appApi')
    ).appApi.resetUserPassword(userId, currentUser.id);

    if (success) {
      setResetPasswordMessage({
        type: 'success',
        text: `Password reset successfully. New password is "smartlab123".`,
      });
      setTimeout(() => {
        setResetPasswordUserId(null);
        setResetPasswordMessage(null);
      }, 3000);
    } else {
      setResetPasswordMessage({
        type: 'error',
        text: error || 'Failed to reset password.',
      });
    }

    setResetPasswordLoading(false);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.username || !newUser.role) {
      alert('Please fill in all required fields');
      return;
    }

    const user: UserData = {
      id: Date.now().toString(),
      name: newUser.name,
      username: newUser.username,
      role: newUser.role as UserRole,
      status: newUser.status as 'active' | 'inactive',
      lastLogin: undefined
    };

    addUser({
      ...user,
      email: `${newUser.username}@smartlab.local`,
    });
    setNewUser({
      name: '',
      username: '',
      role: 'instructor',
      status: 'active'
    });
    setShowAddUser(false);
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    technician: users.filter(u => u.role === 'technician').length,
    instructor: users.filter(u => u.role === 'instructor').length,
    student: users.filter(u => u.role === 'student').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">User Management</h2>
            <p className="text-slate-600 mt-1">Manage user accounts and permissions</p>
          </div>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          Loading users from API...
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Reset Password Message */}
      {resetPasswordMessage && (
        <div className={`mb-6 flex items-start gap-3 rounded-lg p-4 text-sm ${
          resetPasswordMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{resetPasswordMessage.text}</p>
        </div>
      )}

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h3 className="font-medium text-purple-900">Administrators</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">{roleStats.admin}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-green-600" />
            <h3 className="font-medium text-green-900">Technicians</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">{roleStats.technician}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            <h3 className="font-medium text-amber-900">Instructors</h3>
          </div>
          <p className="text-3xl font-bold text-amber-900">{roleStats.instructor}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-slate-600" />
            <h3 className="font-medium text-slate-900">Students</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{roleStats.student}</p>
        </div>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Add New User</h3>
            <button
              onClick={() => setShowAddUser(false)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technician">Technician</option>
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((userData) => (
                <tr key={userData.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                        {userData.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{userData.name}</div>
                        {userData.id === currentUser?.id && (
                          <span className="text-xs text-blue-600">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-600">
                      <UserCircle className="w-4 h-4" />
                      {getDisplayUsername(userData)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(userData.role)}`}>
                      {getRoleIcon(userData.role)}
                      {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {userData.lastLogin || 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      userData.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {userData.status.charAt(0).toUpperCase() + userData.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(userData)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {userData.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleResetPassword(userData.id, userData.name)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reset password"
                            disabled={resetPasswordLoading && resetPasswordUserId === userData.id}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-transparent">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              {editingUser.id !== currentUser?.id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  Name and username are locked for other users.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser.id !== currentUser?.id}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser.id !== currentUser?.id}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser.id === currentUser?.id}
                >
                  <option value="technician">Technician</option>
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                  <option value="admin">Administrator</option>
                </select>
                {editingUser.id === currentUser?.id && (
                  <p className="text-xs text-slate-500 mt-1">You cannot change your own role</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
