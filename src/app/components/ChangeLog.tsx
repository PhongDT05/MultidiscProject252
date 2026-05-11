import { useState, useMemo } from 'react';
import { useDataLog, ChangeType } from '../contexts/DataLogContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  Clock, 
  Activity, 
  Thermometer, 
  Droplets, 
  Wind, 
  Users, 
  AlertCircle,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X,
  Search,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ChangeLogProps {
  roomId?: string;
  maxHeight?: string;
  showFilters?: boolean;
}

type EventFilter = 'all' | 'open-door' | 'fan' | 'cooling' | 'light' | 'alert';
type DeviceCategory = 'all' | 'sensor' | 'equipment' | 'actuator';

export function ChangeLog({ roomId, maxHeight = '600px', showFilters = true }: ChangeLogProps) {
  const { authorizedLogs, clearLogs, getAuthorizedLogsByRoom } = useDataLog();
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [filterEvent, setFilterEvent] = useState<EventFilter>('all');
  const [filterDevice, setFilterDevice] = useState<DeviceCategory>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date/time filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState<string>(oneDayAgo.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endDate, setEndDate] = useState<string>(now.toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState<string>('23:59');

  const matchesEventFilter = (event: EventFilter, log: { changeType: ChangeType; field: string; description: string; oldValue: string | number; newValue: string | number }) => {
    if (event === 'all') return true;

    const haystack = `${log.field} ${log.description} ${log.oldValue} ${log.newValue}`.toLowerCase();

    switch (event) {
      case 'open-door':
        return haystack.includes('door') ||
          haystack.includes('presence detected') ||
          (log.changeType === 'presence' && haystack.includes('detected'));
      case 'fan':
        return haystack.includes('fan') || haystack.includes('ventilation');
      case 'cooling':
        return haystack.includes('cooling') || haystack.includes('hvac');
      case 'light':
        return haystack.includes('light') || haystack.includes('lighting');
      case 'alert':
        return log.changeType === 'alert' || haystack.includes('alert') || haystack.includes('critical') || haystack.includes('warning');
      default:
        return true;
    }
  };

  // Map device categories to relevant change types
  const getRelevantChangeTypes = (device: DeviceCategory): (ChangeType | 'all')[] => {
    switch (device) {
      case 'sensor':
        return ['temperature', 'humidity', 'co2', 'presence'];
      case 'equipment':
        return ['equipment', 'status'];
      case 'actuator':
        return ['equipment', 'status', 'alert'];
      case 'all':
      default:
        return ['all'];
    }
  };

  // Get filtered logs (using authorized logs only)
  const filteredLogs = useMemo(() => {
    let filtered = roomId ? getAuthorizedLogsByRoom(roomId) : authorizedLogs;

    // Apply device filter first (which determines relevant change types)
    if (filterDevice !== 'all') {
      const relevantTypes = getRelevantChangeTypes(filterDevice);
      if (relevantTypes[0] !== 'all') {
        filtered = filtered.filter(log => relevantTypes.includes(log.changeType));
      }
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.changeType === filterType);
    }

    if (filterEvent !== 'all') {
      filtered = filtered.filter((log) => matchesEventFilter(filterEvent, log));
    }

    if (filterRoom !== 'all' && !roomId) {
      filtered = filtered.filter(log => log.roomId === filterRoom);
    }

    // Apply timestamp filter
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:59`);
      filtered = filtered.filter((log) => {
        const logTime = log.timestamp.getTime();
        return logTime >= startDateTime.getTime() && logTime <= endDateTime.getTime();
      });
    } catch (e) {
      // Invalid date format, skip filtering
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => {
        const searchText = `${log.field} ${log.description} ${log.oldValue} ${log.newValue} ${log.changeType} ${log.roomName || ''}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    return filtered;
  }, [authorizedLogs, roomId, filterType, filterEvent, filterDevice, filterRoom, searchQuery, startDate, startTime, endDate, endTime, getAuthorizedLogsByRoom]);

  // Get unique rooms from authorized logs only
  const uniqueRooms = useMemo(() => {
    const rooms = new Map<string, string>();
    authorizedLogs.forEach(log => {
      if (log.roomId && log.roomName) {
        rooms.set(log.roomId, log.roomName);
      }
    });
    return Array.from(rooms.entries());
  }, [authorizedLogs]);

  const getChangeIcon = (type: ChangeType) => {
    switch (type) {
      case 'temperature':
        return <Thermometer className="w-4 h-4" />;
      case 'humidity':
        return <Droplets className="w-4 h-4" />;
      case 'co2':
        return <Wind className="w-4 h-4" />;
      case 'presence':
        return <Users className="w-4 h-4" />;
      case 'equipment':
        return <Settings className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      case 'status':
        return <Activity className="w-4 h-4" />;
      case 'threshold':
        return <SlidersHorizontal className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getChangeBadgeColor = (type: ChangeType) => {
    switch (type) {
      case 'temperature':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'humidity':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'co2':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'presence':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'equipment':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'alert':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'status':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'threshold':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getValueChangeIndicator = (oldValue: string | number, newValue: string | number) => {
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      if (newValue > oldValue) {
        return <TrendingUp className="w-3 h-3 text-red-500" />;
      } else if (newValue < oldValue) {
        return <TrendingDown className="w-3 h-3 text-green-500" />;
      }
      return <Minus className="w-3 h-3 text-gray-400" />;
    }
    return null;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Data Change Log</h3>
            <Badge variant="outline" className="ml-2">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
          {authorizedLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Device</p>
              <Select value={filterDevice} onValueChange={(value) => setFilterDevice(value as DeviceCategory)}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Filter by device" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="sensor">Sensors (Temperature, Humidity, CO₂, etc.)</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="actuator">Actuators (HVAC, Fans, Lights)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Type</p>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as ChangeType | 'all')}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Filter by type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="co2">CO₂ Level</SelectItem>
                  <SelectItem value="presence">Presence</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="alert">Alerts</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="threshold">Thresholds</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Event</p>
              <Select value={filterEvent} onValueChange={(value) => setFilterEvent(value as EventFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="open-door">Open Door</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="cooling">Cooling</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!roomId && uniqueRooms.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Room</p>
                <Select value={filterRoom} onValueChange={setFilterRoom}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Filter by room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {uniqueRooms.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search Box - Full Width */}
            <div className="sm:col-span-2 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search logs by content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Date/Time Range Filters */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From Date</p>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From Time</p>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">To Date</p>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">To Time</p>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}

        {/* Log Entries */}
        <ScrollArea style={{ maxHeight }}>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No data changes recorded yet</p>
              <p className="text-sm mt-1">Changes will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${getChangeBadgeColor(log.changeType)}`}>
                        {getChangeIcon(log.changeType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getChangeBadgeColor(log.changeType)}`}
                          >
                            {log.changeType}
                          </Badge>
                          {log.roomName && (
                            <span className="text-xs text-gray-500 font-medium">
                              {log.roomName}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 mb-2">
                          {log.description}
                        </p>

                        {/* Value Change */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">
                            {log.field}:
                          </span>
                          <code className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                            {log.oldValue}
                          </code>
                          <div className="flex items-center">
                            {getValueChangeIndicator(log.oldValue, log.newValue)}
                          </div>
                          <code className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">
                            {log.newValue}
                          </code>
                        </div>

                        {log.user && (
                          <p className="text-xs text-gray-500 mt-1">
                            Modified by: {log.user}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span>{log.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
}
