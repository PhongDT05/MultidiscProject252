import { useState } from 'react';
import { IoTDevice } from '../data/labData';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Activity, 
  AlertTriangle, 
  Battery, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  XCircle,
  Router,
  Radio,
  Zap,
  Clock,
  Signal,
  HardDrive,
  Edit2,
  Check,
  X,
} from 'lucide-react';

// UC8 - System Health Monitoring & Diagnostics
export function DeviceHealth() {
  const { labs, updateRoom } = useAppData();
  const { hasPermission } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  const canToggleDevices = hasPermission('technician');

  const toggleDeviceEnabled = (deviceId: string, roomId: string) => {
    if (!canToggleDevices) return;

    updateRoom(roomId, (room) => ({
      ...room,
      iotDevices: room.iotDevices.map((device) => {
        if (device.id !== deviceId) return device;
        return {
          ...device,
          status: device.status === 'offline' ? 'online' : 'offline',
          lastSeen: new Date().toISOString(),
        };
      }),
    }));
  };

  const startEditingDeviceName = (deviceId: string, currentName: string) => {
    setEditingDeviceId(deviceId);
    setEditingDeviceName(currentName);
  };

  const saveDeviceName = (deviceId: string, roomId: string) => {
    if (!editingDeviceName.trim()) {
      setEditingDeviceId(null);
      setEditingDeviceName('');
      return;
    }

    updateRoom(roomId, (room) => ({
      ...room,
      iotDevices: room.iotDevices.map((device) =>
        device.id === deviceId
          ? { ...device, name: editingDeviceName.trim() }
          : device,
      ),
    }));

    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  const cancelEditingDeviceName = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  // Get all devices across all rooms
  const getAllDevices = (): (IoTDevice & { roomName: string; roomId: string })[] => {
    return labs.flatMap(room =>
      room.iotDevices.map(device => ({
        ...device,
        roomName: room.name,
        roomId: room.id,
      }))
    );
  };

  const allDevices = getAllDevices();

  // Filter devices
  const filteredDevices = allDevices.filter(device => {
    const roomMatch = selectedRoom === 'all' || device.roomId === selectedRoom;
    const typeMatch = selectedType === 'all' || device.type === selectedType;
    return roomMatch && typeMatch;
  });

  // Calculate statistics
  const totalDevices = allDevices.length;
  const onlineDevices = allDevices.filter(d => d.status === 'online').length;
  const offlineDevices = allDevices.filter(d => d.status === 'offline').length;
  const errorDevices = allDevices.filter(d => d.status === 'error').length;
  const warningDevices = allDevices.filter(d => d.status === 'warning').length;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'sensor': return <Radio className="w-4 h-4" />;
      case 'gateway': return <Router className="w-4 h-4" />;
      case 'actuator': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-500">Online</Badge>;
      case 'offline': return <Badge variant="destructive">Offline</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge className="bg-amber-500">Warning</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-500';
    if (strength >= 60) return 'bg-blue-500';
    if (strength >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getBatteryColor = (level: number) => {
    if (level >= 60) return 'bg-green-500';
    if (level >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTimeSinceLastSeen = (lastSeen: string): string => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return `${hours}h ago`;
  };

  const formatInstalledDate = (installedAt?: string): string => {
    if (!installedAt) return 'Unknown';
    return new Date(installedAt).toLocaleDateString();
  };

  const getEstimatedMaintenanceLabel = (device: IoTDevice): string => {
    if (!device.installedAt || !device.estimatedMaintenanceHours) {
      return 'Unknown';
    }

    const installedTime = new Date(device.installedAt).getTime();
    const elapsedHours = (Date.now() - installedTime) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, device.estimatedMaintenanceHours - elapsedHours);
    const remainingDays = Math.ceil(remainingHours / 24);

    return remainingHours <= 0
      ? `Due now (${device.estimatedMaintenanceHours}h interval)`
      : `~${remainingDays} days (${device.estimatedMaintenanceHours}h interval)`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">IoT Device Health Monitoring</h1>
        <p className="text-slate-600 mt-1">System diagnostics and connectivity status for all IoT devices</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Devices</p>
                <p className="text-2xl font-bold text-slate-900">{totalDevices}</p>
              </div>
              <HardDrive className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineDevices}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Warning</p>
                <p className="text-2xl font-bold text-amber-600">{warningDevices}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Error</p>
                <p className="text-2xl font-bold text-red-600">{errorDevices}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Offline</p>
                <p className="text-2xl font-bold text-red-600">{offlineDevices}</p>
              </div>
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Laboratory</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Laboratories</SelectItem>
                  {labs.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Device Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sensor">Sensors</SelectItem>
                  <SelectItem value="gateway">Gateways</SelectItem>
                  <SelectItem value="actuator">Actuators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Device Status ({filteredDevices.length} devices)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
          {filteredDevices.map(device => (
            <Card key={device.id} className={`${
            device.status === 'error' || device.status === 'offline' ? 'border-red-300 bg-red-50' :
            device.status === 'warning' ? 'border-amber-300 bg-amber-50' : ''
          }`}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Device Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      device.type === 'sensor' ? 'bg-blue-100' :
                      device.type === 'gateway' ? 'bg-purple-100' : 'bg-green-100'
                    }`}>
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingDeviceId === device.id ? (
                          <>
                            <input
                              type="text"
                              value={editingDeviceName}
                              onChange={(e) => setEditingDeviceName(e.target.value)}
                              className="px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveDeviceName(device.id, device.roomId);
                                } else if (e.key === 'Escape') {
                                  cancelEditingDeviceName();
                                }
                              }}
                            />
                            <button
                              onClick={() => saveDeviceName(device.id, device.roomId)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Save device name"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditingDeviceName}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Cancel editing"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <h3 className="font-semibold text-slate-900">{device.name}</h3>
                            {canToggleDevices && (
                              <button
                                onClick={() => startEditingDeviceName(device.id, device.name)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                title="Edit device name"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {getStatusIcon(device.status)}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {device.roomName} • {device.location}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(device.status)}
                        <Badge variant="outline" className="capitalize">
                          {getDeviceIcon(device.type)}
                          <span className="ml-1">{device.type}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedDeviceId((current) => (current === device.id ? null : device.id))
                    }
                  >
                    {expandedDeviceId === device.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {canToggleDevices && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDeviceEnabled(device.id, device.roomId)}
                      className={device.status === 'offline' ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'}
                    >
                      {device.status === 'offline' ? 'Enable Device' : 'Disable Device'}
                    </Button>
                  </div>
                )}

                {/* Device Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Signal Strength */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {device.signalStrength >= 60 ? (
                          <Wifi className="w-4 h-4 text-slate-600" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">Signal</span>
                      </div>
                      <span className="text-sm font-semibold">{device.signalStrength}%</span>
                    </div>
                    <Progress value={device.signalStrength} className="h-2" indicatorClassName={getSignalStrengthColor(device.signalStrength)} />
                  </div>

                  {/* Battery Level (if applicable) */}
                  {device.batteryLevel !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Battery className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-medium">Battery</span>
                        </div>
                        <span className="text-sm font-semibold">{device.batteryLevel}%</span>
                      </div>
                      <Progress value={device.batteryLevel} className="h-2" indicatorClassName={getBatteryColor(device.batteryLevel)} />
                    </div>
                  )}

                  {/* Data Rate */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Signal className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Data Rate</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900">
                      {device.dataRate} <span className="text-sm font-normal text-slate-600">readings/min</span>
                    </p>
                  </div>

                  {/* Last Seen */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Last Seen</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{getTimeSinceLastSeen(device.lastSeen)}</p>
                  </div>
                </div>

                {expandedDeviceId === device.id && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 gap-1 text-sm text-slate-600">
                      <span><strong className="text-slate-700">Device ID:</strong> {device.id}</span>
                      <span><strong className="text-slate-700">Firmware:</strong> {device.firmwareVersion}</span>
                      <span><strong className="text-slate-700">Installed:</strong> {formatInstalledDate(device.installedAt)}</span>
                      <span><strong className="text-slate-700">Estimated maintenance:</strong> {getEstimatedMaintenanceLabel(device)}</span>
                      <span><strong className="text-slate-700">Heartbeat time:</strong> {new Date(device.lastSeen).toLocaleString()}</span>
                    </div>
                  </>
                )}

                {/* Warnings */}
                {device.status === 'error' && (
                  <div className="bg-red-100 border border-red-200 rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 text-sm">Device Error Detected</p>
                        <p className="text-xs text-red-800 mt-1">Device not responding. Check power and network.</p>
                      </div>
                    </div>
                  </div>
                )}

                {device.status === 'warning' && (
                  <div className="bg-amber-100 border border-amber-200 rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 text-sm">Device Warning</p>
                        <p className="text-xs text-amber-800 mt-1">
                          {device.batteryLevel && device.batteryLevel < 30 
                            ? 'Low battery detected. Schedule battery replacement.' 
                            : 'Weak signal detected. Check device position or network infrastructure.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {device.status === 'offline' && (
                  <div className="bg-red-100 border border-red-200 rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <WifiOff className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 text-sm">Device Offline</p>
                        <p className="text-xs text-red-800 mt-1">No heartbeat in expected window. Reconnect device.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      </div>
    </div>
  );
}