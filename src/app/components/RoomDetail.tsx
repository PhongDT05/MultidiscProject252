import { useParams } from "react-router";
import { generateHistoricalData } from "../data/labData";
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
  Clock,
  Wrench,
  Power,
  PowerOff,
  Settings,
  Lock,
  ShieldAlert,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();
  const { hasPermission, hasAnyPermission, canAccessLab } = useAuth();
  const { labs, toggleEquipmentMode } = useAppData();
  const room = labs.find((r) => r.id === roomId);
  
  // Check if user can control equipment (technician and above)
  const canControlEquipment = hasPermission('technician');
  const canViewLogsAndRuntime = hasAnyPermission(['technician', 'admin']);

  const formatWorkedTime = (hours: number) => {
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const remainingAfterDays = totalMinutes - days * 60 * 24;
    const wholeHours = Math.floor(remainingAfterDays / 60);
    const minutes = remainingAfterDays % 60;

    if (days > 0) {
      return `${days}d ${wholeHours}h`;
    }

    if (wholeHours > 0) {
      return `${wholeHours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };
  
  if (!room) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Room Not Found</h2>
          <p className="text-slate-600">The lab room you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (!canAccessLab(room.id)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-amber-900 mb-2">Access Restricted</h2>
          <p className="text-amber-700">You do not have permission to access this laboratory.</p>
        </div>
      </div>
    );
  }

  const historicalData = generateHistoricalData(room.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Data Simulator - runs in background */}
      <DataSimulator />
      
      {/* Room Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-semibold text-slate-900">{room.name}</h2>
          <div>
            {room.status === "optimal" && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700">
                <CheckCircle className="w-5 h-5" />
                Optimal Conditions
              </span>
            )}
            {room.status === "warning" && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                Warning
              </span>
            )}
            {room.status === "critical" && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Critical
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {room.alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {room.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.type === "critical"
                    ? "bg-red-50 border-red-200"
                    : alert.type === "warning"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {alert.type === "critical" ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : alert.type === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        alert.type === "critical"
                          ? "text-red-900"
                          : alert.type === "warning"
                          ? "text-amber-900"
                          : "text-blue-900"
                      }`}
                    >
                      {alert.message}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        alert.type === "critical"
                          ? "text-red-700"
                          : alert.type === "warning"
                          ? "text-amber-700"
                          : "text-blue-700"
                      }`}
                    >
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Conditions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Temperature</span>
              <Thermometer className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">{room.temperature}°C</div>
            <div className="mt-2 text-sm text-slate-500">
              Optimal: 20-24°C
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Humidity</span>
              <Droplets className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">{room.humidity}%</div>
            <div className="mt-2 text-sm text-slate-500">
              Optimal: 40-60%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">CO₂ Level</span>
              <Wind className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">{room.co2Level} ppm</div>
            <div className="mt-2 text-sm text-slate-500">
              Optimal: &lt;500 ppm
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Occupancy</span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {room.occupancy}/{room.maxOccupancy}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {Math.round((room.occupancy / room.maxOccupancy) * 100)}% capacity
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">24-Hour Trends</h3>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                style={{ fontSize: "12px" }}
                tickMargin={8}
                tickFormatter={(value) => value.split('-')[0]}
              />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(value) => value.split('-')[0]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                strokeWidth={2}
                name="Temperature (°C)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Humidity (%)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="co2Level"
                stroke="#10b981"
                strokeWidth={2}
                name="CO₂ (ppm)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equipment Status */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Equipment Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {room.equipment.map((equipment) => {
            const mode = equipment.mode;
            return (
              <div
                key={equipment.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-slate-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{equipment.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      Last maintenance: {new Date(equipment.lastMaintenance).toLocaleDateString()}
                    </div>
                    {canViewLogsAndRuntime && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Clock className="w-3 h-3" />
                        Runtime: {formatWorkedTime(equipment.cumulativeRuntimeHours ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {equipment.status === "online" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                        <Power className="w-3 h-3" />
                        Online
                      </span>
                    )}
                    {equipment.status === "offline" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                        <PowerOff className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                    {equipment.status === "maintenance" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                        <Wrench className="w-3 h-3" />
                        Maintenance
                      </span>
                    )}
                  </div>
                </div>

                {/* Mode Control */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Control Mode</span>
                      {!canControlEquipment && (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    {canControlEquipment ? (
                      <button
                        onClick={() => toggleEquipmentMode(room.id, equipment.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          mode === "auto"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            mode === "auto"
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 opacity-50 cursor-not-allowed">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs ${mode === "manual" ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                      Manual
                    </span>
                    <span className={`text-xs ${mode === "auto" ? "text-blue-600 font-medium" : "text-slate-500"}`}>
                      Auto
                    </span>
                  </div>
                  {!canControlEquipment && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Requires Technician role or higher</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show manual controls when in manual mode */}
                {canControlEquipment && mode === "manual" && equipment.status === "online" && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-2">Manual Controls Active</div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                        Adjust Settings
                      </button>
                      <button className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                        Override
                      </button>
                    </div>
                  </div>
                )}

                {/* Show auto mode indicator */}
                {mode === "auto" && equipment.status === "online" && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      Automatic control enabled
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Room-Specific Change Log */}
      {canViewLogsAndRuntime && (
        <div className="mt-8">
          <ChangeLog roomId={room.id} maxHeight="400px" showFilters={true} />
        </div>
      )}
    </div>
  );
}