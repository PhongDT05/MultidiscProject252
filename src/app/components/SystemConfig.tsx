import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { backendApi } from '../services/backendApi';
import {
  Settings,
  Bell,
  Database,
  Shield,
  Activity,
  Download,
  Upload,
  Save,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Clock,
  Thermometer,
  Droplets,
  Wind
} from 'lucide-react';

interface SystemSettings {
  alertThresholds: {
    temperature: { min: number; max: number; critical: number };
    humidity: { min: number; max: number; critical: number };
    co2: { warning: number; critical: number };
  };
  notifications: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    pushNotifications: boolean;
    alertCooldown: number; // minutes
  };
  dataRetention: {
    logsRetentionDays: number;
    metricsRetentionDays: number;
    autoArchive: boolean;
  };
  system: {
    maintenanceMode: boolean;
    autoBackup: boolean;
    backupFrequency: string;
    dataUpdateInterval: number; // seconds
  };
}

const defaultSettings: SystemSettings = {
  alertThresholds: {
    temperature: { min: 20, max: 24, critical: 26 },
    humidity: { min: 40, max: 60, critical: 70 },
    co2: { warning: 500, critical: 700 }
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    alertCooldown: 15
  },
  dataRetention: {
    logsRetentionDays: 90,
    metricsRetentionDays: 365,
    autoArchive: true
  },
  system: {
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily',
    dataUpdateInterval: 10
  }
};

export function SystemConfig() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'notifications' | 'data' | 'system'>('thresholds');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [commandTopic, setCommandTopic] = useState('esp32SLG4/commands');
  const [commandPayload, setCommandPayload] = useState('off');
  const [commandStatus, setCommandStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [commandFeedback, setCommandFeedback] = useState('');
  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  const [seedFeedback, setSeedFeedback] = useState('');

  // Only admins can access this component
  if (!hasPermission('admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">Only administrators can access system configuration.</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setSaveStatus('saving');
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const handleExportConfig = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smartlab-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings(importedSettings);
          alert('Configuration imported successfully');
        } catch (error) {
          alert('Invalid configuration file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSendGatewayCommand = async () => {
    const command = commandPayload.trim();
    const topic = commandTopic.trim();

    if (!command || !topic) {
      setCommandStatus('error');
      setCommandFeedback('Both topic and command are required.');
      return;
    }

    setCommandStatus('sending');
    setCommandFeedback('');

    try {
      const result = await backendApi.sendMqttCommand(command, {
        topic,
        metadata: {
          panel: 'SystemConfig',
        },
      });
      setCommandStatus('success');
      setCommandFeedback(`Published to ${result.topic} (id: ${result.envelope.id})`);
    } catch (error) {
      setCommandStatus('error');
      setCommandFeedback(error instanceof Error ? error.message : 'Failed to publish MQTT command.');
    }
  };

  const publishSingleParameterCommand = async (command: string) => {
    const topic = commandTopic.trim();
    const trimmedCommand = command.trim();

    if (!topic || !trimmedCommand) {
      return;
    }

    setCommandStatus('sending');
    setCommandFeedback('');

    try {
      const result = await backendApi.sendMqttCommand(trimmedCommand, {
        topic,
        metadata: {
          panel: 'SystemConfig',
          mode: 'single-parameter',
        },
      });
      setCommandStatus('success');
      setCommandFeedback(`Published ${trimmedCommand} to ${result.topic}`);
    } catch (error) {
      setCommandStatus('error');
      setCommandFeedback(error instanceof Error ? error.message : 'Failed to publish MQTT command.');
    }
  };

  const handleSeedDatabase = async () => {
    setSeedStatus('seeding');
    setSeedFeedback('');

    try {
      const result = await backendApi.seedDemo('dev-secret');
      setSeedStatus('success');
      setSeedFeedback(`Database seeded successfully. Files: ${result.seeded.join(', ')}`);
      setTimeout(() => setSeedStatus('idle'), 3000);
    } catch (error) {
      setSeedStatus('error');
      setSeedFeedback(error instanceof Error ? error.message : 'Failed to seed database.');
    }
  };

  const tabs = [
    { id: 'thresholds' as const, label: 'Alert Thresholds', icon: Activity },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'data' as const, label: 'Data Retention', icon: Database },
    { id: 'system' as const, label: 'System Settings', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">System Configuration</h2>
            <p className="text-slate-600 mt-1">Manage global system settings and thresholds</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportConfig}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Warning Banner */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Administrator Access</p>
            <p className="text-sm text-amber-700 mt-1">
              Changes made here will affect all lab rooms and users. Please review carefully before saving.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <div className="space-y-6">
          {/* Temperature */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Temperature Thresholds</h3>
                <p className="text-sm text-slate-600">Optimal and critical temperature ranges (°C)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Minimum (Optimal)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.temperature.min}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      temperature: { ...settings.alertThresholds.temperature, min: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`temp_min=${settings.alertThresholds.temperature.min}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maximum (Optimal)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.temperature.max}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      temperature: { ...settings.alertThresholds.temperature, max: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`temp_max=${settings.alertThresholds.temperature.max}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Critical Threshold
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.temperature.critical}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      temperature: { ...settings.alertThresholds.temperature, critical: Number(e.target.value) }
                    }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Humidity Thresholds</h3>
                <p className="text-sm text-slate-600">Optimal and critical humidity ranges (%)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Minimum (Optimal)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.humidity.min}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      humidity: { ...settings.alertThresholds.humidity, min: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`hum_min=${settings.alertThresholds.humidity.min}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maximum (Optimal)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.humidity.max}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      humidity: { ...settings.alertThresholds.humidity, max: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`hum_max=${settings.alertThresholds.humidity.max}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Critical Threshold
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.humidity.critical}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      humidity: { ...settings.alertThresholds.humidity, critical: Number(e.target.value) }
                    }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* CO2 */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">CO₂ Thresholds</h3>
                <p className="text-sm text-slate-600">Warning and critical CO₂ levels (ppm)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Warning Level
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.co2.warning}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      co2: { ...settings.alertThresholds.co2, warning: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`air_min=${settings.alertThresholds.co2.warning}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Critical Level
                </label>
                <input
                  type="number"
                  value={settings.alertThresholds.co2.critical}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: {
                      ...settings.alertThresholds,
                      co2: { ...settings.alertThresholds.co2, critical: Number(e.target.value) }
                    }
                  })}
                  onBlur={() => {
                    void publishSingleParameterCommand(`air_max=${settings.alertThresholds.co2.critical}`);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Alert Channels</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Email Alerts</p>
                    <p className="text-sm text-slate-600">Send alerts via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailAlerts}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailAlerts: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">SMS Alerts</p>
                    <p className="text-sm text-slate-600">Send alerts via SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.smsAlerts}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, smsAlerts: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Push Notifications</p>
                    <p className="text-sm text-slate-600">Send browser push notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, pushNotifications: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alert Cooldown Period (minutes)
              </label>
              <p className="text-sm text-slate-600 mb-3">
                Minimum time between duplicate alerts for the same condition
              </p>
              <input
                type="number"
                value={settings.notifications.alertCooldown}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, alertCooldown: Number(e.target.value) }
                })}
                className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Data Retention Policies</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Change Logs Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.dataRetention.logsRetentionDays}
                  onChange={(e) => setSettings({
                    ...settings,
                    dataRetention: { ...settings.dataRetention, logsRetentionDays: Number(e.target.value) }
                  })}
                  className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Environmental Metrics Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.dataRetention.metricsRetentionDays}
                  onChange={(e) => setSettings({
                    ...settings,
                    dataRetention: { ...settings.dataRetention, metricsRetentionDays: Number(e.target.value) }
                  })}
                  className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Auto-Archive Old Data</p>
                    <p className="text-sm text-slate-600">Automatically archive data after retention period</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dataRetention.autoArchive}
                  onChange={(e) => setSettings({
                    ...settings,
                    dataRetention: { ...settings.dataRetention, autoArchive: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">System Operation</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Maintenance Mode</p>
                    <p className="text-sm text-slate-600">Temporarily disable alerts and notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.system.maintenanceMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, maintenanceMode: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Automatic Backups</p>
                    <p className="text-sm text-slate-600">Enable scheduled system backups</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.system.autoBackup}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, autoBackup: e.target.checked }
                  })}
                  className="w-5 h-5"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Backup Frequency
                </label>
                <select
                  value={settings.system.backupFrequency}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, backupFrequency: e.target.value }
                  })}
                  className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!settings.system.autoBackup}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data Update Interval (seconds)
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  How frequently environmental data is refreshed
                </p>
                <input
                  type="number"
                  value={settings.system.dataUpdateInterval}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, dataUpdateInterval: Number(e.target.value) }
                  })}
                  onBlur={() => {
                    const intervalMs = Math.round(settings.system.dataUpdateInterval * 1000);
                    void publishSingleParameterCommand(`interval=${intervalMs}`);
                  }}
                  className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="60"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Database Management</h3>
            <p className="text-sm text-slate-600 mb-4">
              Seed the database with demo data including labs, equipment, IoT devices, and alerts.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                This will populate all tables with application-aligned mock data including 6 labs, 16 equipment items, 19 IoT devices, and 13 actuators.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSeedDatabase}
                disabled={seedStatus === 'seeding'}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {seedStatus === 'seeding' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    Seeding...
                  </>
                ) : (
                  'Seed Database'
                )}
              </button>
              {seedStatus === 'success' && <span className="text-sm text-green-700">{seedFeedback}</span>}
              {seedStatus === 'error' && <span className="text-sm text-red-700">{seedFeedback}</span>}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-2">MQTT Command Bridge</h3>
            <p className="text-sm text-slate-600 mb-4">
              Publish control commands for the external gateway computer that connects directly to devices.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Supported formats: mode=auto, mode=manual, exhaust=on/off, cooling=on/off, alarm=on/off,
              light=on/off, interval=&lt;ms&gt;, temp_min/max, hum_min/max, light_min/max, air_min/max, show, reset.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  MQTT Topic
                </label>
                <input
                  type="text"
                  value={commandTopic}
                  onChange={(e) => setCommandTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="esp32SLG4/commands"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Command Payload
                </label>
                <input
                  type="text"
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='off or {"command":"off"}'
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSendGatewayCommand}
                disabled={commandStatus === 'sending'}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {commandStatus === 'sending' ? 'Sending...' : 'Send Command'}
              </button>
              {commandStatus === 'success' && <span className="text-sm text-green-700">{commandFeedback}</span>}
              {commandStatus === 'error' && <span className="text-sm text-red-700">{commandFeedback}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
