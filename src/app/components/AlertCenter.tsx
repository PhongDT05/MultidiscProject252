import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { Alert as AlertType } from '../data/labData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Info, 
  AlertCircle,
  XCircle,
  User,
  MapPin,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

// UC3 - Automated Hazard Response & Alerting
export function AlertCenter() {
  const { user, hasAnyPermission } = useAuth();
  const { labs, acknowledgeAlert, acknowledgeAllAlerts } = useAppData();
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('active');

  // Get all alerts from all rooms
  const getAllAlerts = (): AlertType[] => {
    return labs.flatMap(room => room.alerts);
  };

  const allAlerts = getAllAlerts();

  // Filter alerts
  const filteredAlerts = allAlerts.filter(alert => {
    const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const roomMatch = selectedRoom === 'all' || alert.roomId === selectedRoom;
    const tabMatch = 
      (activeTab === 'active' && !alert.acknowledged) ||
      (activeTab === 'acknowledged' && alert.acknowledged) ||
      (activeTab === 'all');
    return severityMatch && roomMatch && tabMatch;
  });

  // Sort alerts by severity and timestamp
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Statistics
  const activeAlerts = allAlerts.filter(a => !a.acknowledged).length;
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const highAlerts = allAlerts.filter(a => a.severity === 'high' && !a.acknowledged).length;
  const mediumAlerts = allAlerts.filter(a => a.severity === 'medium' && !a.acknowledged).length;

  const getRoomName = (roomId: string) => {
    return labs.find(r => r.id === roomId)?.name || roomId;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-amber-500">Medium</Badge>;
      case 'low': return <Badge className="bg-blue-500">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'danger': return <Badge variant="destructive">Danger</Badge>;
      case 'warning': return <Badge className="bg-amber-500">Warning</Badge>;
      case 'info': return <Badge className="bg-blue-500">Info</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleAcknowledge = (alert: AlertType) => {
    if (!hasAnyPermission(['technician', 'admin'])) {
      toast.error('Permission Denied', {
        description: 'Only Technicians and above can acknowledge alerts.',
      });
      return;
    }

    const actorName = user?.name ?? 'Unknown User';
    const updated = acknowledgeAlert(alert.id, actorName);

    if (updated) {
      toast.success('Alert Acknowledged', {
        description: `Alert "${alert.message}" has been acknowledged by ${actorName}.`,
      });
    }
  };

  const handleSilenceAll = () => {
    if (!hasAnyPermission(['technician', 'admin'])) {
      toast.error('Permission Denied', {
        description: 'Only Technicians and above can acknowledge all alerts.',
      });
      return;
    }
    const actorName = user?.name ?? 'Unknown User';
    const count = acknowledgeAllAlerts(actorName);
    toast.success('All Alerts Silenced', {
      description: `${count} active alerts have been acknowledged.`,
    });
  };

  const getTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Alert & Notification Center</h1>
        <p className="text-slate-600 mt-1">Monitor and manage system alerts and hazard responses</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Alerts</p>
                <p className="text-3xl font-bold text-slate-900">{activeAlerts}</p>
              </div>
              <Bell className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical</p>
                <p className="text-3xl font-bold text-red-600">{criticalAlerts}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">High Priority</p>
                <p className="text-3xl font-bold text-orange-600">{highAlerts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Medium Priority</p>
                <p className="text-3xl font-bold text-amber-600">{mediumAlerts}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Alerts</CardTitle>
            {activeAlerts > 0 && (
              <Button 
                variant="outline" 
                onClick={handleSilenceAll}
                disabled={!hasAnyPermission(['technician', 'admin'])}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Acknowledge All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Severity Level</label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>
        </CardContent>
      </Card>

      {/* Alert Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active ({allAlerts.filter(a => !a.acknowledged).length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Acknowledged ({allAlerts.filter(a => a.acknowledged).length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {sortedAlerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Alerts Found</h3>
                  <p className="text-slate-600">
                    {activeTab === 'active' 
                      ? 'All systems are operating normally.'
                      : 'No alerts match your current filters.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedAlerts.map(alert => (
              <Card key={alert.id} className={`${
                alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                alert.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                alert.severity === 'medium' ? 'border-amber-300 bg-amber-50' :
                'border-blue-300 bg-blue-50'
              } ${alert.acknowledged ? 'opacity-60' : ''}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Alert Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div>{getSeverityIcon(alert.severity)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getSeverityBadge(alert.severity)}
                            {getTypeBadge(alert.type)}
                            <Badge variant="outline">
                              <MapPin className="w-3 h-3 mr-1" />
                              {getRoomName(alert.roomId)}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs">
                              {alert.reasonCode}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-slate-900 mt-2 text-lg">
                            {alert.message}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {getTimeAgo(alert.timestamp)}
                            </span>
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {!alert.acknowledged && (
                        <Button 
                          size="sm"
                          onClick={() => handleAcknowledge(alert)}
                          disabled={!hasAnyPermission(['technician', 'admin'])}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Acknowledge
                        </Button>
                      )}
                    </div>

                    {/* Acknowledgment Info */}
                    {alert.acknowledged && (
                      <>
                        <Separator />
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-slate-900">Acknowledged</span>
                            {alert.acknowledgedBy && (
                              <>
                                <span className="text-slate-600">by</span>
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-slate-600" />
                                  <span className="font-medium">{alert.acknowledgedBy}</span>
                                </div>
                              </>
                            )}
                            {alert.acknowledgedAt && (
                              <>
                                <span className="text-slate-600">at</span>
                                <Clock className="w-4 h-4 text-slate-600" />
                                <span>{new Date(alert.acknowledgedAt).toLocaleString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Auto-resolved indicator */}
                    {alert.autoResolved && (
                      <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Auto-resolved by system</span>
                        </div>
                      </div>
                    )}

                    {/* Automated Response Info */}
                    {!alert.acknowledged && alert.severity === 'critical' && (
                      <div className={`rounded-lg p-3 border ${
                        alert.severity === 'critical' ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <Activity className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                          }`} />
                          <div>
                            <p className={`font-semibold ${
                              alert.severity === 'critical' ? 'text-red-900' : 'text-amber-900'
                            }`}>
                              Automated Response Triggered
                            </p>
                            <p className={`text-sm mt-1 ${
                              alert.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                            }`}>
                              {alert.reasonCode.includes('TEMP') && 
                                'HVAC system automatically adjusted. Emergency cooling activated.'}
                              {alert.reasonCode.includes('CO2') && 
                                'Exhaust fans activated. Ventilation increased to maximum capacity.'}
                              {alert.reasonCode.includes('HUMIDITY') && 
                                'Dehumidification system engaged. Climate control optimizing.'}
                              {!alert.reasonCode.includes('TEMP') && 
                               !alert.reasonCode.includes('CO2') && 
                               !alert.reasonCode.includes('HUMIDITY') && 
                                'Appropriate actuators have been triggered based on threshold violation.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">Automated Hazard Response System</p>
              <p className="text-sm text-blue-800">
                When environmental thresholds are violated, the system automatically triggers actuators (HVAC, exhaust fans, 
                ventilation) and generates severity alerts with reason codes. Critical alerts indicate immediate danger requiring 
                urgent attention. Alerts can be acknowledged by authorized personnel (Technicians and above).
              </p>
              <Separator className="my-2 bg-blue-200" />
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div>
                  <strong>Critical:</strong> Immediate danger, automated response active
                </div>
                <div>
                  <strong>High:</strong> Urgent attention required
                </div>
                <div>
                  <strong>Medium:</strong> Warning condition, monitor closely
                </div>
                <div>
                  <strong>Low:</strong> Informational, no immediate action needed
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
