import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { FlaskConical, LayoutDashboard, RefreshCw, User, LogOut, Shield, Users, Sliders, Activity, Bell, Home, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const isMainDashboard = location.pathname === "/dashboard";
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'technician': return 'bg-green-100 text-green-700';
      case 'instructor': return 'bg-amber-100 text-amber-700';
      case 'student': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-slate-900">Smart Lab Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Time Display */}
              {isMainDashboard && (
                <div className="hidden md:flex flex-col items-end">
                  <div className="text-sm font-medium text-slate-900">{formatTime(currentTime)}</div>
                  <div className="text-xs text-slate-500">{formatDate(currentTime)}</div>
                </div>
              )}

              {/* Refresh Button */}
              {isMainDashboard && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh Dashboard"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}

              {/* User Profile/Role Card with Dropdown */}
              {user && (
                <div className="relative pl-4 border-l border-slate-200">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="text-sm font-medium text-slate-900">{user.name}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.role)} capitalize`}>
                        {user.role}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">@{user.username || 'unknown'}</div>
                          <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-2 ${getRoleColor(user.role)}`}>
                            <Shield className="w-3 h-3" />
                            <span className="capitalize">{user.role}</span>
                          </div>
                        </div>
                        
                        {/* Common Menu Items */}
                        <div className="border-b border-slate-200">
                          <Link
                            to="/dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Home className="w-4 h-4" />
                            Overview
                          </Link>
                          <Link
                            to="/dashboard/alerts"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Bell className="w-4 h-4" />
                            Alert Center
                          </Link>
                          <Link
                            to="/dashboard/devices"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Activity className="w-4 h-4" />
                            Device Health
                          </Link>
                          <Link
                            to="/dashboard/change-password"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                            Change Password
                          </Link>
                        </div>

                        {(user?.role === 'admin' || user?.role === 'instructor') && (
                          <div className="border-b border-slate-200">
                            <Link
                              to="/dashboard/thresholds"
                              onClick={() => setShowUserMenu(false)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Sliders className="w-4 h-4" />
                              Threshold Config
                            </Link>
                            {hasPermission('admin') && (
                              <Link
                                to="/dashboard/users"
                                onClick={() => setShowUserMenu(false)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Users className="w-4 h-4" />
                                User Management
                              </Link>
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Back to Overview for detail pages when no logged-in user */}
              {!isMainDashboard && !user && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Back to Overview
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}