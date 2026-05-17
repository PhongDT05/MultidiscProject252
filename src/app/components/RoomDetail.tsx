import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { generateHistoricalData } from "../data/labData";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";
import { appApi } from "../services/appApi";
import { publishMqttCommand } from '../services/mqttTelemetry';
import { ChangeLog } from "./ChangeLog";
import { DataSimulator } from "./DataSimulator";
import { DeviceInsertion } from "./DeviceInsertion";
import { Badge } from "./ui/badge";
import {
  Thermometer,
  Droplets,
  Wind,
  Users,
  Sun,
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
  Plus,
  Radio,
  Wifi,
  WifiOff,
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
  const { user, hasPermission, hasAnyPermission, canAccessLab } = useAuth();
  const { labs, toggleEquipmentMode, updateRoom } = useAppData();
  const [showDeviceInsertion, setShowDeviceInsertion] = useState(false);
  const [requests, setRequests] = useState<Array<{
    id: string;
    message: string;
    status: string;
    createdAt: string;
    studentName: string;
    instructorName: string;
  }>>([]);
  const [newRequest, setNewRequest] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const room = labs.find((r) => r.id === roomId);
  
  // Check if user can control equipment (technician and above)
  const canControlEquipment = hasPermission('technician');
  const canViewLogsAndRuntime = hasAnyPermission(['technician', 'admin']);
  const canRespondToRequests = Boolean(room && hasAnyPermission(['instructor', 'admin']) && canAccessLab(room.id));
  const canAddDevices = hasPermission('technician') && canAccessLab(room?.id || '');
  const canSendRequest = Boolean(user && user.role === 'student' && room && canAccessLab(room.id));

  const toggleEquipmentEnabled = (equipmentId: string) => {
    if (!room || !canControlEquipment) return;

    updateRoom(room.id, (currentRoom) => ({
      ...currentRoom,
      equipment: currentRoom.equipment.map((equipment) => {
        if (equipment.id !== equipmentId) return equipment;

        const enableDevice = equipment.status === 'offline' || equipment.status === 'maintenance';
        return {
          ...equipment,
          status: enableDevice ? 'online' : 'offline',
          mode: enableDevice ? equipment.mode : 'manual',
          lastMaintenance: enableDevice
            ? equipment.lastMaintenance
            : new Date().toISOString().split('T')[0],
        };
      }),
    }));

    // Publish a command to the device to change power/state (non-blocking)
    try {
      const lab = room;
      const eq = lab.equipment.find((e) => e.id === equipmentId);
      if (eq) {
        const willEnable = eq.status === 'offline' || eq.status === 'maintenance';
        const payload = JSON.stringify({
          type: 'set_power',
          equipmentId,
          state: willEnable ? 'on' : 'off',
          issuedAt: new Date().toISOString(),
        });
        const topic = `devices/${equipmentId}/commands`;
        void publishMqttCommand(topic, payload).catch(() => {
          // ignore failures
        });
      }
    } catch (err) {
      // swallow
    }
  };

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

  
  useEffect(() => {
    let isMounted = true;
    if (!room) return;

    void appApi.getRecommendations(room.id)
      .then((items) => {
        if (isMounted) {
          setRequests(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRequestError('Failed to load requests.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [room?.id]);

  const submitRequest = async () => {
    if (!room || !user || !newRequest.trim()) return;
    setSubmittingRequest(true);
    setRequestError(null);

    try {
      await appApi.sendRecommendation(room.id, user.id, newRequest.trim());
      setNewRequest('');
      const latest = await appApi.getRecommendations(room.id);
      setRequests(latest);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to send request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const respondToRequest = async (requestId: string, status: 'reviewed' | 'dismissed') => {
    if (!room || !canRespondToRequests) return;

    setRequestError(null);
    try {
      await appApi.updateRecommendationStatus(requestId, status);
      const latest = await appApi.getRecommendations(room.id);
      setRequests(latest);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to update request status.');
    }
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
  const sensorDevices = room.iotDevices.filter((device) => device.type === 'sensor');

  const getSensorStatusClass = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatSensorLastSeen = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const seconds = Math.max(0, Math.floor(diff / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return `${hours}h ago`;
  };

  const sensorReadings = [
    {
      key: 'temperature',
      label: 'Temperature',
      value: `${room.temperature.toFixed(1)} C`,
      optimal: room.temperature >= 20 && room.temperature <= 24,
    },
    {
      key: 'humidity',
      label: 'Humidity',
      value: `${room.humidity.toFixed(1)} %`,
      optimal: room.humidity >= 40 && room.humidity <= 60,
    },
    {
      key: 'co2',
      label: 'CO2 Level',
      value: `${room.co2Level.toFixed(0)} ppm`,
      optimal: room.co2Level < 500,
    },
    {
      key: 'light',
      label: 'Light Level',
      value: `${room.lightLevel.toFixed(0)} lux`,
      optimal: room.lightLevel > 0,
    },
    {
      key: 'presence',
      label: 'Presence',
      value: room.presenceDetected ? 'Detected' : 'Clear',
      optimal: true,
    },
  ] as const;

  const getRecommendationStatusStyle = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'dismissed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getRecommendationStatusText = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'Acknowledged by instructor';
      case 'dismissed':
        return 'Dismissed by instructor';
      default:
        return 'Awaiting instructor response';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Data Simulator - runs in background */}
      <DataSimulator />

      <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-8">
        <div className="space-y-8">
      
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
                    <div className="flex items-start justify-between gap-3">
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
                      {alert.acknowledged && (
                        <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
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
                    {alert.acknowledged && (
                      <p className="mt-2 text-xs text-emerald-700">
                        Responded by {alert.acknowledgedBy ?? 'instructor'}
                        {alert.acknowledgedAt ? ` on ${new Date(alert.acknowledgedAt).toLocaleString()}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Lab Requests</h3>
        <p className="text-sm text-slate-600 mb-4">
          Students can submit requests to the instructor assigned to this lab.
        </p>

        {canSendRequest && (
          <div className="mb-5 space-y-3">
            <textarea
              value={newRequest}
              onChange={(event) => setNewRequest(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your request for this lab..."
              rows={3}
            />
            <button
              onClick={submitRequest}
              disabled={submittingRequest || newRequest.trim().length === 0}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingRequest ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        )}

        {requestError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {requestError}
          </div>
        )}

        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests submitted for this lab yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-800">{item.message}</p>
                  <Badge variant="outline" className={getRecommendationStatusStyle(item.status)}>
                    {getRecommendationStatusText(item.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  From {item.studentName} to {item.instructorName} • {new Date(item.createdAt).toLocaleString()}
                </p>
                {canRespondToRequests && item.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => respondToRequest(item.id, 'reviewed')}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => respondToRequest(item.id, 'dismissed')}
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Conditions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <span className="text-sm text-slate-600">Light Level</span>
              <Sun className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">{room.lightLevel} lux</div>
            <div className="mt-2 text-sm text-slate-500">
              Sensor reading
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Presence Status</span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {room.presenceDetected ? 'Detected' : 'Clear'}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Based on presence detection, not headcount
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Presence Sensor</span>
              <Radio className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {room.presenceDetected ? 'Detected' : 'Clear'}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Real-time motion/presence state
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Data Center */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Sensor Data Center</h3>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              All sensors in {room.name} are consolidated here.
            </p>
          </div>

          <div className="p-4 md:p-6 border-b border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Sensor Readings Snapshot</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {sensorReadings.map((reading) => (
                <div key={reading.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs text-slate-500">{reading.label}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{reading.value}</div>
                  <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    reading.optimal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {reading.optimal ? 'Normal' : 'Attention'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">Detected Sensor Devices</p>
          </div>

          {sensorDevices.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              No sensor devices reported yet. Snapshot readings above still reflect the current lab telemetry state.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sensorDevices.map((sensor) => (
                <div key={sensor.id} className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{sensor.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getSensorStatusClass(sensor.status)}`}
                        >
                          {sensor.status === 'online' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3" />
                          )}
                          {sensor.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {sensor.location} • Firmware {sensor.firmwareVersion}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">Signal</div>
                        <div className="font-medium text-slate-900">{sensor.signalStrength}%</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">Rate</div>
                        <div className="font-medium text-slate-900">{sensor.dataRate}/min</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 col-span-2 md:col-span-1">
                        <div className="text-slate-500">Last Seen</div>
                        <div className="font-medium text-slate-900">{formatSensorLastSeen(sensor.lastSeen)}</div>
                      </div>
                    </div>
                  </div>

                  {typeof sensor.batteryLevel === 'number' && (
                    <div className="mt-3 text-sm text-slate-600">
                      Battery: <span className="font-medium text-slate-900">{sensor.batteryLevel}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Equipment Status</h3>
          {canAddDevices && (
            <button
              onClick={() => setShowDeviceInsertion(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Device
            </button>
          )}
        </div>
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

                  {canControlEquipment && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleEquipmentEnabled(equipment.id)}
                        className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
                          equipment.status === 'offline' || equipment.status === 'maintenance'
                            ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {equipment.status === 'offline' || equipment.status === 'maintenance'
                          ? 'Enable Device'
                          : 'Disable Device'}
                      </button>
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

        </div>

        {canViewLogsAndRuntime && (
          <aside className="xl:sticky xl:top-8">
            <ChangeLog roomId={room.id} maxHeight="calc(100vh - 4rem)" showFilters={true} />
          </aside>
        )}
      </div>

      {/* Device Insertion Modal */}
      {room && (
        <DeviceInsertion
          isOpen={showDeviceInsertion}
          onClose={() => setShowDeviceInsertion(false)}
          roomId={room.id}
          onSuccess={() => {
            // Refresh is automatic via context
          }}
        />
      )}
    </div>
  );
}