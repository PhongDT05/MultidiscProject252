import { useState } from 'react';
import { IoTDevice } from '../data/labData';
import { useAppData } from '../contexts/AppDataContext';
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
  HardDrive
} from 'lucide-react';

// UC8 - System Health Monitoring & Diagnostics
export function DeviceHealth() {
  const { labs } = useAppData();
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

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

        {filteredDevices.map(device => (
          <Card key={device.id} className={`${
            device.status === 'error' || device.status === 'offline' ? 'border-red-300 bg-red-50' :
            device.status === 'warning' ? 'border-amber-300 bg-amber-50' : ''
          }`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Device Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${
                      device.type === 'sensor' ? 'bg-blue-100' :
                      device.type === 'gateway' ? 'bg-purple-100' : 'bg-green-100'
                    }`}>
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{device.name}</h3>
                        {getStatusIcon(device.status)}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {device.roomName} • {device.location}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(device.status)}
                        <Badge variant="outline" className="capitalize">
                          {getDeviceIcon(device.type)}
                          <span className="ml-1">{device.type}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>

                <Separator />

                {/* Device Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Signal Strength */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Battery className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-medium">Battery</span>
                        </div>
                        <span className="text-sm font-semibold">{device.batteryLevel}%</span>
                      </div>
                      <Progress value={device.batteryLevel} className="h-2" indicatorClassName={getBatteryColor(device.batteryLevel)} />
                      {device.batteryLevel < 30 && (
                        <p className="text-xs text-red-600 mt-1">⚠️ Low battery - replacement needed</p>
                      )}
                    </div>
                  )}

                  {/* Data Rate */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Signal className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Data Rate</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {device.dataRate} <span className="text-sm font-normal text-slate-600">readings/min</span>
                    </p>
                  </div>

                  {/* Last Seen */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Last Seen</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{getTimeSinceLastSeen(device.lastSeen)}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(device.lastSeen).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Firmware Version */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-slate-600">Firmware Version: {device.firmwareVersion}</span>
                  <span className="text-sm text-slate-600">Device ID: {device.id}</span>
                </div>

                {/* Warnings */}
                {device.status === 'error' && (
                  <div className="bg-red-100 border border-red-200 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Device Error Detected</p>
                        <p className="text-sm text-red-800 mt-1">
                          Device is not responding. Check power supply and network connectivity. 
                          Critical safety behavior is preserved locally.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {device.status === 'warning' && (
                  <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900">Device Warning</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {device.batteryLevel && device.batteryLevel < 30 
                            ? 'Low battery detected. Schedule battery replacement.' 
                            : 'Weak signal detected. Check device position or network infrastructure.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {device.status === 'offline' && (
                  <div className="bg-red-100 border border-red-200 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Device Offline</p>
                        <p className="text-sm text-red-800 mt-1">
                          No heartbeat received within defined time window. System will preserve critical 
                          safety behavior locally and synchronize data once connectivity is restored.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">System Health Monitoring</p>
              <p className="text-sm text-blue-800">
                The system continuously monitors device connectivity through heartbeat signals and last-seen timestamps. 
                When devices go offline or encounter errors, operators receive fault indications. Critical safety behaviors 
                are preserved locally at the edge, and data synchronization occurs automatically once connectivity is restored.
              </p>
              <Separator className="my-2 bg-blue-200" />
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Online</strong>: Device functioning normally with recent heartbeat</li>
                <li>• <strong>Warning</strong>: Low battery or weak signal strength</li>
                <li>• <strong>Error</strong>: Device malfunction detected</li>
                <li>• <strong>Offline</strong>: No heartbeat within timeout window</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}