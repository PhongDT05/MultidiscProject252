import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { simulateNetworkScan, discoveredDeviceToIoTDevice, discoveredDeviceToEquipment } from '../services/deviceDiscovery';
import { canUserManageDeviceInLab } from '../services/deviceAuthorization';

interface DeviceInsertionProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSuccess?: () => void;
}

type DeviceType = 'iot-sensor' | 'iot-gateway' | 'iot-actuator' | 'equipment';

export function DeviceInsertion({ isOpen, onClose, roomId, onSuccess }: DeviceInsertionProps) {
  const { user } = useAuth();
  const { addIoTDevice, addEquipment, addActuator } = useAppData();
  
  const [activeTab, setActiveTab] = useState<'discover' | 'manual'>('discover');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual entry form state
  const [deviceType, setDeviceType] = useState<DeviceType>('iot-sensor');
  const [manualFormData, setManualFormData] = useState<any>({
    name: '',
    location: '',
    status: 'online',
    signalStrength: 85,
    batteryLevel: '',
    firmwareVersion: '1.0.0',
    dataRate: 5,
    installedAt: new Date().toISOString().split('T')[0],
    estimatedMaintenanceHours: 4000,
    lastMaintenance: new Date().toISOString().split('T')[0],
    mode: 'auto',
    isEssential: false,
  });

  // Check authorization
  const canManage = canUserManageDeviceInLab(user, roomId);
  if (!canManage) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700 text-sm">You do not have permission to add devices to this lab.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleScanStart = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    setSelectedDevices(new Set());
    
    // Simulate network scan delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const devices = simulateNetworkScan();
    setDiscoveredDevices(devices);
    setIsScanning(false);
  };

  const toggleDeviceSelection = (index: number) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDevices(newSelected);
  };

  const handleAddSelectedDevices = async () => {
    if (selectedDevices.size === 0) {
      setSubmitMessage({ type: 'error', text: 'Please select at least one device' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const index of selectedDevices) {
        const device = discoveredDevices[index];
        let result;

        if (device.type === 'equipment') {
          result = addEquipment(roomId, discoveredDeviceToEquipment(device));
        } else if (device.type === 'actuator') {
          result = addActuator(roomId, { name: device.name, type: device.type, status: device.status || 'off' });
        } else {
          result = addIoTDevice(roomId, discoveredDeviceToIoTDevice(device));
        }

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        setSubmitMessage({ type: 'success', text: `Successfully added ${successCount} device(s)` });
        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 1000);
      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: `Added ${successCount}, failed ${failCount}. Please try again.` 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManualDevice = async () => {
    // Validation
    if (!manualFormData.name.trim()) {
      setSubmitMessage({ type: 'error', text: 'Device name is required' });
      return;
    }
    if (!manualFormData.location.trim()) {
      setSubmitMessage({ type: 'error', text: 'Device location is required' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      let result;

      if (deviceType === 'equipment') {
        result = addEquipment(roomId, {
          name: manualFormData.name,
          status: manualFormData.status,
          lastMaintenance: manualFormData.lastMaintenance,
          mode: manualFormData.mode,
          isEssential: manualFormData.isEssential,
        });
      } else if (deviceType === 'iot-actuator') {
        result = addActuator(roomId, {
          name: manualFormData.name,
          type: 'hvac',
          status: 'off',
          mode: manualFormData.mode,
        });
      } else {
        const iotType = deviceType === 'iot-sensor' ? 'sensor' : deviceType === 'iot-gateway' ? 'gateway' : 'actuator';
        result = addIoTDevice(roomId, {
          name: manualFormData.name,
          type: iotType,
          status: manualFormData.status,
          location: manualFormData.location,
          signalStrength: parseInt(manualFormData.signalStrength),
          batteryLevel: manualFormData.batteryLevel ? parseInt(manualFormData.batteryLevel) : undefined,
          firmwareVersion: manualFormData.firmwareVersion,
          dataRate: parseInt(manualFormData.dataRate),
          installedAt: new Date(manualFormData.installedAt).toISOString(),
          estimatedMaintenanceHours: parseInt(manualFormData.estimatedMaintenanceHours),
        });
      }

      if (result.success) {
        setSubmitMessage({ type: 'success', text: 'Device added successfully' });
        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 1000);
      } else {
        setSubmitMessage({ type: 'error', text: result.error || 'Failed to add device' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Device to Lab</DialogTitle>
          <DialogDescription>Discover devices on your network or add them manually</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover">
              <Wifi className="w-4 h-4 mr-2" />
              Auto-Discover
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* Auto-Discover Tab */}
          <TabsContent value="discover" className="space-y-4">
            {!discoveredDevices.length && !isScanning && (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">Scan your network to discover available devices</p>
                <Button onClick={handleScanStart} disabled={isScanning}>
                  {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                  Scan Network
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-slate-600">Scanning for devices...</p>
              </div>
            )}

            {discoveredDevices.length > 0 && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="w-8 px-4 py-2 text-left"><input type="checkbox" className="w-4 h-4" disabled /></th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Location</th>
                        <th className="px-4 py-2 text-left">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discoveredDevices.map((device, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedDevices.has(idx)}
                              onChange={() => toggleDeviceSelection(idx)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 font-medium">{device.name}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {device.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{device.location}</td>
                          <td className="px-4 py-2">
                            {device.signalStrength ? `${device.signalStrength}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {submitMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    submitMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {submitMessage.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm">{submitMessage.text}</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setDiscoveredDevices([]);
                    setSelectedDevices(new Set());
                  }}>
                    New Scan
                  </Button>
                  <Button 
                    onClick={handleAddSelectedDevices} 
                    disabled={selectedDevices.size === 0 || isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Add Selected ({selectedDevices.size})
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="device-type">Device Type</Label>
                <Select value={deviceType} onValueChange={(v) => setDeviceType(v as DeviceType)}>
                  <SelectTrigger id="device-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iot-sensor">IoT Sensor</SelectItem>
                    <SelectItem value="iot-gateway">IoT Gateway</SelectItem>
                    <SelectItem value="iot-actuator">IoT Actuator</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Temperature Sensor - Wall"
                  value={manualFormData.name}
                  onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., North Wall, Ceiling, Lab Bench 1"
                  value={manualFormData.location}
                  onChange={(e) => setManualFormData({ ...manualFormData, location: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={manualFormData.status} onValueChange={(v) => setManualFormData({ ...manualFormData, status: v })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    {deviceType === 'equipment' && <SelectItem value="maintenance">Maintenance</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {(deviceType === 'iot-sensor' || deviceType === 'iot-gateway' || deviceType === 'iot-actuator') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signal">Signal Strength (0-100)</Label>
                      <Input
                        id="signal"
                        type="number"
                        min="0"
                        max="100"
                        value={manualFormData.signalStrength}
                        onChange={(e) => setManualFormData({ ...manualFormData, signalStrength: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="battery">Battery Level % (optional)</Label>
                      <Input
                        id="battery"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0-100"
                        value={manualFormData.batteryLevel}
                        onChange={(e) => setManualFormData({ ...manualFormData, batteryLevel: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firmware">Firmware Version</Label>
                      <Input
                        id="firmware"
                        placeholder="e.g., 2.1.3"
                        value={manualFormData.firmwareVersion}
                        onChange={(e) => setManualFormData({ ...manualFormData, firmwareVersion: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="datarate">Data Rate (readings/min)</Label>
                      <Input
                        id="datarate"
                        type="number"
                        min="1"
                        value={manualFormData.dataRate}
                        onChange={(e) => setManualFormData({ ...manualFormData, dataRate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="installed">Installed Date</Label>
                      <Input
                        id="installed"
                        type="date"
                        value={manualFormData.installedAt}
                        onChange={(e) => setManualFormData({ ...manualFormData, installedAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance">Est. Maintenance Hours</Label>
                      <Input
                        id="maintenance"
                        type="number"
                        min="0"
                        value={manualFormData.estimatedMaintenanceHours}
                        onChange={(e) => setManualFormData({ ...manualFormData, estimatedMaintenanceHours: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {deviceType === 'equipment' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lastmaint">Last Maintenance Date</Label>
                      <Input
                        id="lastmaint"
                        type="date"
                        value={manualFormData.lastMaintenance}
                        onChange={(e) => setManualFormData({ ...manualFormData, lastMaintenance: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mode">Control Mode</Label>
                      <Select value={manualFormData.mode} onValueChange={(v) => setManualFormData({ ...manualFormData, mode: v })}>
                        <SelectTrigger id="mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="essential"
                      checked={manualFormData.isEssential}
                      onChange={(e) => setManualFormData({ ...manualFormData, isEssential: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="essential" className="font-normal cursor-pointer">Mark as essential equipment</Label>
                  </div>
                </>
              )}

              {deviceType === 'iot-actuator' && (
                <div>
                  <Label htmlFor="actuatormode">Control Mode</Label>
                  <Select value={manualFormData.mode} onValueChange={(v) => setManualFormData({ ...manualFormData, mode: v })}>
                    <SelectTrigger id="actuatormode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {submitMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {submitMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{submitMessage.text}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleAddManualDevice} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Device
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
