import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { defaultThresholds, ThresholdConfig as ThresholdConfigType } from '../data/labData';
import { useAppData } from '../contexts/AppDataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Save, AlertTriangle, CheckCircle2, Settings2, Thermometer, Droplets, Wind, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

// UC1 - Threshold Configuration
export function ThresholdConfig() {
  const { user } = useAuth();
  const { labs } = useAppData();
  const [selectedRoom, setSelectedRoom] = useState<string>(labs[0]?.id ?? 'lab-01');
  const [thresholds, setThresholds] = useState<Record<string, ThresholdConfigType>>(defaultThresholds);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load saved thresholds from localStorage
    const saved = localStorage.getItem('lab_thresholds');
    if (saved) {
      try {
        setThresholds(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load thresholds:', error);
      }
    }
  }, []);

  const currentThreshold = thresholds[selectedRoom];
  const currentRoom = labs.find(r => r.id === selectedRoom);

  const updateThreshold = (category: keyof ThresholdConfigType, field: string, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [selectedRoom]: {
        ...prev[selectedRoom],
        [category]: {
          ...prev[selectedRoom][category as keyof Omit<ThresholdConfigType, 'roomId'>],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const saveThresholds = () => {
    localStorage.setItem('lab_thresholds', JSON.stringify(thresholds));
    setHasChanges(false);
    toast.success('Threshold Configuration Saved', {
      description: `Settings for ${currentRoom?.name} have been updated successfully.`,
    });
  };

  const resetToDefaults = () => {
    setThresholds(defaultThresholds);
    localStorage.setItem('lab_thresholds', JSON.stringify(defaultThresholds));
    setHasChanges(false);
    toast.info('Reset to Defaults', {
      description: 'All threshold configurations have been reset to default values.',
    });
  };

  const getStatusBadge = (current: number, min?: number, max?: number, warningMin?: number, warningMax?: number) => {
    if (max !== undefined && current > max) return <Badge variant="destructive">Critical</Badge>;
    if (min !== undefined && current < min) return <Badge variant="destructive">Critical</Badge>;
    if (warningMax !== undefined && current > warningMax) return <Badge className="bg-amber-500">Warning</Badge>;
    if (warningMin !== undefined && current < warningMin) return <Badge className="bg-amber-500">Warning</Badge>;
    return <Badge className="bg-green-500">Optimal</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Threshold Configuration</h1>
        <p className="text-slate-600 mt-1">Configure environmental thresholds for automated lab control</p>
      </div>

      {/* Permission Check */}
      {user?.role !== 'admin' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Only Lab Administrators can modify threshold configurations. Contact your admin for changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Room Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Laboratory</CardTitle>
          <CardDescription>Choose a lab room to configure thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRoom} onValueChange={(value) => setSelectedRoom(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {labs.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      room.status === 'optimal' ? 'bg-green-500' :
                      room.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    {room.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Room Status */}
      {currentRoom && (
        <Card>
          <CardHeader>
            <CardTitle>Current Environmental Status - {currentRoom.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Thermometer className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Temperature</p>
                  <p className="text-lg font-semibold">{currentRoom.temperature}°C</p>
                  {getStatusBadge(
                    currentRoom.temperature,
                    currentThreshold.temperature.min,
                    currentThreshold.temperature.max,
                    currentThreshold.temperature.warningMin,
                    currentThreshold.temperature.warningMax
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Droplets className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Humidity</p>
                  <p className="text-lg font-semibold">{currentRoom.humidity}%</p>
                  {getStatusBadge(
                    currentRoom.humidity,
                    currentThreshold.humidity.min,
                    currentThreshold.humidity.max,
                    currentThreshold.humidity.warningMin,
                    currentThreshold.humidity.warningMax
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Wind className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">CO₂ Level</p>
                  <p className="text-lg font-semibold">{currentRoom.co2Level} ppm</p>
                  {getStatusBadge(
                    currentRoom.co2Level,
                    undefined,
                    currentThreshold.co2Level.max,
                    undefined,
                    currentThreshold.co2Level.warningMax
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Light Level</p>
                  <p className="text-lg font-semibold">{currentRoom.lightLevel} lux</p>
                  {getStatusBadge(
                    currentRoom.lightLevel,
                    currentThreshold.lightLevel.min,
                    currentThreshold.lightLevel.max
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temperature Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-red-600" />
            <CardTitle>Temperature Thresholds (°C)</CardTitle>
          </div>
          <CardDescription>Set safe temperature ranges for automatic climate control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temp-min">Critical Minimum</Label>
              <Input
                id="temp-min"
                type="number"
                value={currentThreshold.temperature.min}
                onChange={(e) => updateThreshold('temperature', 'min', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Alert when temperature drops below this value</p>
            </div>
            <div>
              <Label htmlFor="temp-max">Critical Maximum</Label>
              <Input
                id="temp-max"
                type="number"
                value={currentThreshold.temperature.max}
                onChange={(e) => updateThreshold('temperature', 'max', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Alert when temperature exceeds this value</p>
            </div>
            <div>
              <Label htmlFor="temp-warn-min">Warning Minimum</Label>
              <Input
                id="temp-warn-min"
                type="number"
                value={currentThreshold.temperature.warningMin}
                onChange={(e) => updateThreshold('temperature', 'warningMin', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Warning when approaching minimum</p>
            </div>
            <div>
              <Label htmlFor="temp-warn-max">Warning Maximum</Label>
              <Input
                id="temp-warn-max"
                type="number"
                value={currentThreshold.temperature.warningMax}
                onChange={(e) => updateThreshold('temperature', 'warningMax', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Warning when approaching maximum</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Humidity Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            <CardTitle>Humidity Thresholds (%)</CardTitle>
          </div>
          <CardDescription>Configure acceptable humidity levels for lab equipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hum-min">Critical Minimum</Label>
              <Input
                id="hum-min"
                type="number"
                value={currentThreshold.humidity.min}
                onChange={(e) => updateThreshold('humidity', 'min', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hum-max">Critical Maximum</Label>
              <Input
                id="hum-max"
                type="number"
                value={currentThreshold.humidity.max}
                onChange={(e) => updateThreshold('humidity', 'max', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hum-warn-min">Warning Minimum</Label>
              <Input
                id="hum-warn-min"
                type="number"
                value={currentThreshold.humidity.warningMin}
                onChange={(e) => updateThreshold('humidity', 'warningMin', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hum-warn-max">Warning Maximum</Label>
              <Input
                id="hum-warn-max"
                type="number"
                value={currentThreshold.humidity.warningMax}
                onChange={(e) => updateThreshold('humidity', 'warningMax', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CO2 Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-green-600" />
            <CardTitle>CO₂ Level Thresholds (ppm)</CardTitle>
          </div>
          <CardDescription>Set air quality thresholds for ventilation control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="co2-warn">Warning Maximum</Label>
              <Input
                id="co2-warn"
                type="number"
                value={currentThreshold.co2Level.warningMax}
                onChange={(e) => updateThreshold('co2Level', 'warningMax', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Activate increased ventilation</p>
            </div>
            <div>
              <Label htmlFor="co2-max">Critical Maximum</Label>
              <Input
                id="co2-max"
                type="number"
                value={currentThreshold.co2Level.max}
                onChange={(e) => updateThreshold('co2Level', 'max', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Trigger emergency exhaust fans</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Light Level Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <CardTitle>Light Level Thresholds (lux)</CardTitle>
          </div>
          <CardDescription>Configure lighting automation ranges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="light-min">Minimum Level</Label>
              <Input
                id="light-min"
                type="number"
                value={currentThreshold.lightLevel.min}
                onChange={(e) => updateThreshold('lightLevel', 'min', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Activate lighting when below</p>
            </div>
            <div>
              <Label htmlFor="light-max">Maximum Level</Label>
              <Input
                id="light-max"
                type="number"
                value={currentThreshold.lightLevel.max}
                onChange={(e) => updateThreshold('lightLevel', 'max', parseFloat(e.target.value))}
                disabled={user?.role !== 'admin'}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Dim lights when exceeded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={user?.role !== 'admin'}
        >
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={saveThresholds}
            disabled={user?.role !== 'admin' || !hasChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">Automated Response System</p>
              <p className="text-sm text-blue-800">
                When thresholds are violated, the system automatically triggers actuators (HVAC, exhaust fans, ventilation) 
                and generates severity alerts. Critical alerts require immediate attention, while warnings indicate approaching unsafe conditions.
              </p>
              <Separator className="my-2 bg-blue-200" />
              <p className="text-xs text-blue-700">
                Threshold Configuration automatically triggers hazard responses when environmental limits are exceeded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
