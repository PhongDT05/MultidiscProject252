import { useState, useMemo } from 'react';
import { useDataLog, ChangeType } from '../contexts/DataLogContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { 
  Clock, 
  Activity, 
  Thermometer, 
  Droplets, 
  Wind, 
  Users, 
  AlertCircle,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ChangeLogProps {
  roomId?: string;
  maxHeight?: string;
  showFilters?: boolean;
}

export function ChangeLog({ roomId, maxHeight = '600px', showFilters = true }: ChangeLogProps) {
  const { authorizedLogs, clearLogs, getAuthorizedLogsByRoom } = useDataLog();
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [timeWindow, setTimeWindow] = useState<string>('all');

  // Get filtered logs (using authorized logs only)
  const filteredLogs = useMemo(() => {
    let filtered = roomId ? getAuthorizedLogsByRoom(roomId) : authorizedLogs;

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.changeType === filterType);
    }

    if (filterRoom !== 'all' && !roomId) {
      filtered = filtered.filter(log => log.roomId === filterRoom);
    }

    if (timeWindow !== 'all') {
      const now = Date.now();
      const windowMinutes = Number.parseInt(timeWindow, 10);
      if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
        const cutoff = now - windowMinutes * 60 * 1000;
        filtered = filtered.filter((log) => log.timestamp.getTime() >= cutoff);
      }
    }

    return filtered;
  }, [authorizedLogs, roomId, filterType, filterRoom, timeWindow, getAuthorizedLogsByRoom]);

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
          <div className="flex gap-2">
            <div className="flex-1">
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
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!roomId && uniqueRooms.length > 0 && (
              <div className="flex-1">
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

            <div className="flex-1">
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="5">Last 5 minutes</SelectItem>
                  <SelectItem value="10">Last 10 minutes</SelectItem>
                  <SelectItem value="20">Last 20 minutes</SelectItem>
                  <SelectItem value="40">Last 40 minutes</SelectItem>
                  <SelectItem value="60">Last 1 hour</SelectItem>
                  <SelectItem value="120">Last 2 hours</SelectItem>
                  <SelectItem value="180">Last 3 hours</SelectItem>
                  <SelectItem value="240">Last 4 hours</SelectItem>
                  <SelectItem value="300">Last 5 hours</SelectItem>
                  <SelectItem value="360">Last 6 hours</SelectItem>
                  <SelectItem value="480">Last 8 hours</SelectItem>
                  <SelectItem value="720">Last 12 hours</SelectItem>
                </SelectContent>
              </Select>
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
                  <div className="flex items-start justify-between gap-3">
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
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
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
