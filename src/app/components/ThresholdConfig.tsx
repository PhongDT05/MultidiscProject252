import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { defaultThresholds, ThresholdConfig as ThresholdConfigType } from '../data/labData';
import { useDataLog } from '../contexts/DataLogContext';
import { useAppData } from '../contexts/AppDataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Save, AlertTriangle, Thermometer, Droplets, Wind, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

type ThresholdSection = keyof Omit<ThresholdConfigType, 'roomId'>;
const thresholdSections: ThresholdSection[] = ['temperature', 'humidity', 'co2Level', 'lightLevel'];

const thresholdSectionLabels: Record<ThresholdSection, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  co2Level: 'CO₂ Level',
  lightLevel: 'Light Level',
};

const thresholdFieldLabels: Record<string, string> = {
  min: 'minimum',
  max: 'maximum',
  warningMin: 'warning minimum',
  warningMax: 'warning maximum',
};

const readStoredThresholds = (): Record<string, ThresholdConfigType> => {
  const saved = localStorage.getItem('lab_thresholds');
  if (!saved) return defaultThresholds;

  try {
    return JSON.parse(saved) as Record<string, ThresholdConfigType>;
  } catch {
    return defaultThresholds;
  }
};

const buildThresholdHistoryEntries = (
  roomId: string,
  previousConfig: ThresholdConfigType,
  nextConfig: ThresholdConfigType,
  roomName: string,
  actorName: string,
  actionLabel: 'updated' | 'reset',
) => {
  const entries: Array<{
    roomId: string;
    roomName: string;
    labId: string;
    changeType: 'threshold';
    field: string;
    oldValue: number;
    newValue: number;
    user: string;
    description: string;
  }> = [];

  thresholdSections.forEach((section) => {
    const previousSection = previousConfig[section];
    const nextSection = nextConfig[section];

    Object.entries(nextSection).forEach(([field, nextValue]) => {
      const previousValue = previousSection[field as keyof typeof previousSection];
      if (previousValue === nextValue) return;

      const sectionLabel = thresholdSectionLabels[section];
      const fieldLabel = thresholdFieldLabels[field] ?? field;

      entries.push({
        roomId,
        roomName,
        labId: roomId,
        changeType: 'threshold',
        field: `${sectionLabel} ${fieldLabel}`,
        oldValue: Number(previousValue),
        newValue: Number(nextValue),
        user: actorName,
        description: `${sectionLabel} ${fieldLabel} ${actionLabel} from ${previousValue} to ${nextValue}`,
      });
    });
  });

  return entries;
};

// UC1 - Threshold Configuration
export function ThresholdConfig() {
  const { user, canAccessLab } = useAuth();
  const { addLog } = useDataLog();
  const { labs } = useAppData();
  const [selectedRoom, setSelectedRoom] = useState<string>(labs[0]?.id ?? 'lab-01');
  const [thresholds, setThresholds] = useState<Record<string, ThresholdConfigType>>(defaultThresholds);
  const [hasChanges, setHasChanges] = useState(false);
  const [instructorTempOverrideTracker, setInstructorTempOverrideTracker] = useState<Record<string, string>>({});

  const THRESHOLDS_KEY = 'lab_thresholds';
  const INSTRUCTOR_TEMP_OVERRIDE_KEY = 'lab_threshold_instructor_temp_overrides_v1';

  const getLocalDayKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // Load saved thresholds from localStorage
    let loadedThresholds = readStoredThresholds();

    const trackerRaw = localStorage.getItem(INSTRUCTOR_TEMP_OVERRIDE_KEY);
    let nextTracker: Record<string, string> = {};
    if (trackerRaw) {
      try {
        nextTracker = JSON.parse(trackerRaw);
      } catch (error) {
        console.error('Failed to load instructor temporary override tracker:', error);
      }
    }

    const todayKey = getLocalDayKey(new Date());
    let didResetExpired = false;
    const sanitizedTracker: Record<string, string> = {};

    Object.entries(nextTracker).forEach(([labId, dayKey]) => {
      if (dayKey === todayKey) {
        sanitizedTracker[labId] = dayKey;
        return;
      }

      if (defaultThresholds[labId]) {
        loadedThresholds = {
          ...loadedThresholds,
          [labId]: defaultThresholds[labId],
        };
        didResetExpired = true;
      }
    });

    if (didResetExpired) {
      localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(loadedThresholds));
    }
    localStorage.setItem(INSTRUCTOR_TEMP_OVERRIDE_KEY, JSON.stringify(sanitizedTracker));

    setThresholds(loadedThresholds);
    setInstructorTempOverrideTracker(sanitizedTracker);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor';
  const selectableLabs = isInstructor ? labs.filter((lab) => canAccessLab(lab.id)) : labs;

  useEffect(() => {
    if (selectableLabs.length === 0) return;
    if (!selectableLabs.some((lab) => lab.id === selectedRoom)) {
      setSelectedRoom(selectableLabs[0].id);
    }
  }, [selectedRoom, selectableLabs]);

  const currentThreshold = thresholds[selectedRoom];
  const currentRoom = labs.find(r => r.id === selectedRoom);
  const todayKey = getLocalDayKey(new Date());
  const hasActiveTemporaryOverride = instructorTempOverrideTracker[selectedRoom] === todayKey;
  const nextDayStart = new Date();
  nextDayStart.setHours(24, 0, 0, 0);
  const msUntilReset = Math.max(0, nextDayStart.getTime() - Date.now());
  const hoursUntilReset = Math.max(1, Math.ceil(msUntilReset / (60 * 60 * 1000)));
  const instructorCanEditNow = canAccessLab(selectedRoom);
  const canEditThresholds = Boolean(
    isAdmin ||
      (isInstructor && canAccessLab(selectedRoom) && instructorCanEditNow),
  );

  if (!currentThreshold) {
    return null;
  }

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
    const previousThresholds = readStoredThresholds();
    const previousRoomThreshold = previousThresholds[selectedRoom] ?? thresholds[selectedRoom];
    const nextRoomThreshold = thresholds[selectedRoom];

    if (previousRoomThreshold && nextRoomThreshold) {
      buildThresholdHistoryEntries(
        selectedRoom,
        previousRoomThreshold,
        nextRoomThreshold,
        currentRoom?.name ?? selectedRoom,
        user?.name ?? 'System',
        'updated',
      ).forEach((entry) => addLog(entry));
    }

    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));

    if (isInstructor && !isAdmin) {
      const nextTracker = {
        ...instructorTempOverrideTracker,
        [selectedRoom]: getLocalDayKey(new Date()),
      };
      setInstructorTempOverrideTracker(nextTracker);
      localStorage.setItem(INSTRUCTOR_TEMP_OVERRIDE_KEY, JSON.stringify(nextTracker));
    }

    setHasChanges(false);
    toast.success('Threshold Configuration Saved', {
      description: isInstructor && !isAdmin
        ? `Temporary settings for ${currentRoom?.name} are active until the end of today.`
        : `Settings for ${currentRoom?.name} have been updated successfully.`,
    });
  };

  const resetToDefaults = () => {
    const previousThresholds = readStoredThresholds();

    Object.entries(defaultThresholds).forEach(([roomId, nextThreshold]) => {
      const previousThreshold = previousThresholds[roomId];
      if (!previousThreshold) return;

      buildThresholdHistoryEntries(
        roomId,
        previousThreshold,
        nextThreshold,
        labs.find((room) => room.id === roomId)?.name ?? roomId,
        user?.name ?? 'System',
        'reset',
      ).forEach((entry) => addLog(entry));
    });

    setThresholds(defaultThresholds);
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(defaultThresholds));
    setInstructorTempOverrideTracker({});
    localStorage.setItem(INSTRUCTOR_TEMP_OVERRIDE_KEY, JSON.stringify({}));
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
      {!isAdmin && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {isInstructor
              ? (hasActiveTemporaryOverride
                ? `Instructor mode: this lab is using temporary thresholds and will reset in about ${hoursUntilReset} hour(s).`
                : 'Instructor mode: changes are temporary and automatically reset at the end of the day.')
              : 'Only Lab Administrators can modify threshold configurations. Contact your admin for changes.'}
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
              {selectableLabs.map(room => (
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
          <CardDescription>Set warning range for temperature monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temp-warn-min">Warning Minimum</Label>
              <Input
                id="temp-warn-min"
                type="number"
                value={currentThreshold.temperature.warningMin}
                onChange={(e) => updateThreshold('temperature', 'warningMin', parseFloat(e.target.value))}
                disabled={!canEditThresholds}
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
                disabled={!canEditThresholds}
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
          <CardDescription>Set warning range for humidity monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hum-warn-min">Warning Minimum</Label>
              <Input
                id="hum-warn-min"
                type="number"
                value={currentThreshold.humidity.warningMin}
                onChange={(e) => updateThreshold('humidity', 'warningMin', parseFloat(e.target.value))}
                disabled={!canEditThresholds}
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
                disabled={!canEditThresholds}
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
          <CardDescription>Set warning level for air quality monitoring</CardDescription>
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
                disabled={!canEditThresholds}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Activate increased ventilation</p>
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
                disabled={!canEditThresholds}
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
                disabled={!canEditThresholds}
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
          disabled={!isAdmin}
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
            disabled={!canEditThresholds || !hasChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </div>

    </div>
  );
}
