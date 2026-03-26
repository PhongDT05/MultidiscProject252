import { Link } from "react-router";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";
import { ChangeLog } from "./ChangeLog";
import { DataSimulator } from "./DataSimulator";
import {
  Thermometer,
  Droplets,
  Wind,
  Users,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Shield,
  Settings,
  ShieldCheck,
  Lock,
} from "lucide-react";

export function MainDashboard() {
  const { user, hasPermission, hasAnyPermission, canAccessLab } = useAuth();
  const { labs, isLoading, error } = useAppData();
  const [showLabDetails, setShowLabDetails] = useState(false);
  
  // Filter labs based on user access
  const accessibleLabs = labs.filter(lab => canAccessLab(lab.id));
  const hasRestrictedAccess = user?.assignedLabs !== undefined && user.assignedLabs.length < labs.length;
  
  const totalRooms = accessibleLabs.length;
  const optimalRooms = accessibleLabs.filter((r) => r.status === "optimal").length;
  const warningRooms = accessibleLabs.filter((r) => r.status === "warning").length;
  const criticalRooms = accessibleLabs.filter((r) => r.status === "critical").length;
  const totalOccupancy = accessibleLabs.reduce((sum, r) => sum + r.occupancy, 0);
  const totalCapacity = accessibleLabs.reduce((sum, r) => sum + r.maxOccupancy, 0);
  const avgTemperature = accessibleLabs.length > 0 ? (
    accessibleLabs.reduce((sum, r) => sum + r.temperature, 0) / accessibleLabs.length
  ).toFixed(1) : '0.0';
  const avgHumidity = accessibleLabs.length > 0 ? Math.round(
    accessibleLabs.reduce((sum, r) => sum + r.humidity, 0) / accessibleLabs.length
  ) : 0;
  const avgCO2 = accessibleLabs.length > 0 ? Math.round(
    accessibleLabs.reduce((sum, r) => sum + r.co2Level, 0) / accessibleLabs.length
  ) : 0;

  // Helper function to determine status color
  const getTemperatureStatus = (temp: number) => {
    const t = parseFloat(temp.toString());
    if (t >= 20 && t <= 24) return "optimal";
    return "warning";
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity >= 40 && humidity <= 60) return "optimal";
    return "warning";
  };

  const getCO2Status = (co2: number) => {
    if (co2 < 500) return "optimal";
    return "warning";
  };

  const tempStatus = getTemperatureStatus(parseFloat(avgTemperature));
  const humidityStatus = getHumidityStatus(avgHumidity);
  const co2Status = getCO2Status(avgCO2);
  const canViewLogs = hasAnyPermission(['technician', 'admin']);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "text-green-600";
      case "warning":
        return "text-amber-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-slate-900";
    }
  };

  const getMetricColorClass = (status: string) =>
    status === "optimal" ? "text-green-600" : "text-amber-600";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "optimal":
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
      case "warning":
        return <div className="w-2 h-2 rounded-full bg-amber-500"></div>;
      case "critical":
        return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Data Simulator - runs in background */}
      <DataSimulator />

      {isLoading && (
        <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          Syncing laboratory data...
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      {/* Lab Access Info Banner */}
      {hasRestrictedAccess && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Lab Access Assignment</h3>
              <p className="text-sm text-blue-800 mt-1">
                You have been assigned to manage <strong>{accessibleLabs.length} of {labs.length}</strong> laboratories: {accessibleLabs.map(lab => lab.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Admin Quick Access Panel */}
      {hasPermission('admin') && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900">Administrator Controls</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/users"
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                  User Management
                </div>
                <div className="text-xs text-slate-600">Manage users and roles</div>
              </div>
            </Link>
            <Link
              to="/thresholds"
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 group-hover:text-purple-600 transition-colors">
                  Threshold Configuration
                </div>
                <div className="text-xs text-slate-600">Configure warning thresholds</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      {hasPermission('technician') && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">Overview</h2>
          
          {/* Total Labs - Horizontal Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
            <button
              onClick={() => setShowLabDetails(!showLabDetails)}
              className="w-full p-6 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-blue-500" />
                    <div>
                      <span className="text-sm text-slate-600 block mb-1">Total Labs</span>
                      <div className="text-3xl font-semibold text-slate-900">{totalRooms}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">{optimalRooms} optimal</span>
                    </div>
                    {warningRooms > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-600 font-medium">{warningRooms} warning</span>
                      </div>
                    )}
                    {criticalRooms > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 font-medium">{criticalRooms} critical</span>
                      </div>
                    )}
                  </div>
                </div>
                {showLabDetails ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>
            
            {/* Expandable Details - Horizontal Layout */}
            {showLabDetails && (
              <div className="border-t border-slate-200 p-6 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Optimal Rooms */}
                  {optimalRooms > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-3">
                        <CheckCircle className="w-4 h-4" />
                        Optimal ({optimalRooms})
                      </div>
                      <div className="space-y-2">
                        {accessibleLabs
                          .filter((r) => r.status === "optimal")
                          .map((room) => (
                            <Link
                              key={room.id}
                              to={`/room/${room.id}`}
                              className="block text-sm text-slate-700 hover:text-blue-600 hover:underline"
                            >
                              • {room.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Warning Rooms */}
                  {warningRooms > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                        <AlertTriangle className="w-4 h-4" />
                        Warning ({warningRooms})
                      </div>
                      <div className="space-y-2">
                        {accessibleLabs
                          .filter((r) => r.status === "warning")
                          .map((room) => (
                            <Link
                              key={room.id}
                              to={`/room/${room.id}`}
                              className="block text-sm text-slate-700 hover:text-blue-600 hover:underline"
                            >
                              • {room.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Critical Rooms */}
                  {criticalRooms > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        Critical ({criticalRooms})
                      </div>
                      <div className="space-y-2">
                        {accessibleLabs
                          .filter((r) => r.status === "critical")
                          .map((room) => (
                            <Link
                              key={room.id}
                              to={`/room/${room.id}`}
                              className="block text-sm text-slate-700 hover:text-blue-600 hover:underline"
                            >
                              • {room.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Other Metrics in a Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Average Temperature */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Avg Temperature</span>
                  {getStatusBadge(tempStatus)}
                </div>
                <Thermometer className="w-5 h-5 text-orange-500" />
              </div>
              <div className={`text-3xl font-semibold ${getStatusColor(tempStatus)}`}>
                {avgTemperature}°C
              </div>
              <div className="mt-2 text-sm text-slate-500">Optimal: 20-24°C</div>
            </div>

            {/* Average Humidity */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Avg Humidity</span>
                  {getStatusBadge(humidityStatus)}
                </div>
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div className={`text-3xl font-semibold ${getStatusColor(humidityStatus)}`}>
                {avgHumidity}%
              </div>
              <div className="mt-2 text-sm text-slate-500">Optimal: 40-60%</div>
            </div>

            {/* Average CO2 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Avg CO₂</span>
                  {getStatusBadge(co2Status)}
                </div>
                <Wind className="w-5 h-5 text-teal-500" />
              </div>
              <div className={`text-3xl font-semibold ${getStatusColor(co2Status)}`}>
                {avgCO2} ppm
              </div>
              <div className="mt-2 text-sm text-slate-500">Optimal: &lt;500 ppm</div>
            </div>

            {/* Occupancy */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Total Occupancy</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-semibold text-slate-900">
                {totalOccupancy}/{totalCapacity}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0}% capacity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Rooms */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Lab Rooms</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {accessibleLabs.map((room) => {
            const isAccessible = canAccessLab(room.id);
            const roomTempStatus = getTemperatureStatus(room.temperature);
            const roomHumidityStatus = getHumidityStatus(room.humidity);
            const roomCO2Status = getCO2Status(room.co2Level);
            return (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow ${
                  !isAccessible ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{room.name}</h3>
                      {!isAccessible && (
                        <Lock className="w-4 h-4 text-slate-400" title="No access" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {room.status === "optimal" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Optimal
                        </span>
                      )}
                      {room.status === "warning" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Warning
                        </span>
                      )}
                      {room.status === "critical" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          Critical
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    {room.occupancy}/{room.maxOccupancy}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                      <Thermometer className="w-3 h-3" />
                      Temp
                    </div>
                    <div className={`text-sm font-semibold ${getMetricColorClass(roomTempStatus)}`}>
                      {room.temperature}°C
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                      <Droplets className="w-3 h-3" />
                      Humidity
                    </div>
                    <div className={`text-sm font-semibold ${getMetricColorClass(roomHumidityStatus)}`}>
                      {room.humidity}%
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                      <Wind className="w-3 h-3" />
                      CO₂
                    </div>
                    <div className={`text-sm font-semibold ${getMetricColorClass(roomCO2Status)}`}>
                      {room.co2Level} ppm
                    </div>
                  </div>
                </div>

                {/* Equipment Status */}
                <div className="mb-4">
                  <div className="text-xs text-slate-600 mb-2">Equipment Status</div>
                  <div className="space-y-1">
                    {room.equipment.map((eq) => (
                      <div key={eq.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">{eq.name}</span>
                        <span
                          className={
                            eq.status === "online"
                              ? "text-green-600 font-medium"
                              : eq.status === "maintenance"
                              ? "text-amber-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {eq.status === "online" && "● Online"}
                          {eq.status === "maintenance" && "● Maintenance"}
                          {eq.status === "offline" && "● Offline"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerts */}
                {room.alerts.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <div className="text-xs text-slate-600 mb-2">Recent Alerts</div>
                    {room.alerts.slice(0, 2).map((alert) => (
                      <div
                        key={alert.id}
                        className={`text-xs px-2 py-1 rounded mb-1 ${
                          alert.type === "critical"
                            ? "bg-red-50 text-red-700"
                            : alert.type === "warning"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {alert.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* View Details */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <span className="text-sm text-blue-600 hover:text-blue-700">
                    View Room Details →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Data Change Log */}
      {canViewLogs && (
        <div className="mt-8">
          <ChangeLog maxHeight="500px" showFilters={true} />
        </div>
      )}
    </div>
  );
}