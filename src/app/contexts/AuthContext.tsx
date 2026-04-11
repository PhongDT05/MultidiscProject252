import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { appApi } from '../services/appApi';
import type { User, UserRole } from '../types/auth';

export type { UserRole, User };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  effectiveRole: UserRole;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
  hasAnyPermission: (roles: UserRole[]) => boolean;
  canAccessLab: (labId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role hierarchy: admin > technician > instructor > student
const roleHierarchy: Record<UserRole, number> = {
  admin: 4,
  technician: 3,
  instructor: 2,
  student: 1,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const sessionUser = await appApi.getSessionUser();
      if (isMounted) {
        setUser(sessionUser);
        setIsLoading(false);
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const authenticatedUser = await appApi.authenticate(username, password);

    if (!authenticatedUser) {
      return { success: false, error: 'Invalid username or password' };
    }

    setUser(authenticatedUser);
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    void appApi.clearSession();
  };

  // Unauthenticated users operate with student-level read-only permissions.
  const effectiveRole: UserRole = user?.role ?? 'student';

  const hasPermission = (requiredRole: UserRole): boolean => {
    return roleHierarchy[effectiveRole] >= roleHierarchy[requiredRole];
  };

  const hasAnyPermission = (roles: UserRole[]): boolean => {
    return roles.some(role => roleHierarchy[effectiveRole] >= roleHierarchy[role]);
  };

  const canAccessLab = (labId: string): boolean => {
    if (!user) return true;
    // Admin can access all labs
    if (user.role === 'admin') return true;
    // If assignedLabs is undefined/null, user can access all labs
    if (!user.assignedLabs) return true;
    // Otherwise check if lab is in assigned list
    return user.assignedLabs.includes(labId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        effectiveRole,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        canAccessLab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}