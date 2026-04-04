import { labRooms, type LabRoom, type IoTDevice, type Equipment } from '../data/labData';
import type { AuthAccount, ManagedUser, User } from '../types/auth';
import { backendApi } from './backendApi';

const LABS_KEY = 'smartlab_api_labs';
const USERS_KEY = 'smartlab_api_users';
const SESSION_KEY = 'smartlab_user';
const LAB01_DEVICE_CLEAR_MIGRATION_KEY = 'smartlab_migration_lab01_clear_devices_v1';

const API_DELAY_MS = 250;
const useBackendApi = import.meta.env.VITE_USE_BACKEND_API?.toString().toLowerCase() === 'true';

const cloneInitialLabs = (): LabRoom[] =>
  labRooms.map((room) => ({
    ...room,
    equipment: room.equipment.map((eq) => ({ ...eq })),
    alerts: room.alerts.map((alert) => ({ ...alert })),
    iotDevices: room.iotDevices.map((device) => ({ ...device })),
    actuators: room.actuators.map((actuator) => ({ ...actuator })),
  }));

const installationDateFromDeviceId = (deviceId: string): string => {
  const hash = [...deviceId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const installedDaysAgo = 90 + (hash % 270); // 3 to 12 months ago
  return new Date(Date.now() - installedDaysAgo * 24 * 60 * 60 * 1000).toISOString();
};

const maintenanceHoursByType = (type: 'sensor' | 'gateway' | 'actuator'): number => {
  switch (type) {
    case 'gateway':
      return 8000;
    case 'actuator':
      return 6000;
    default:
      return 4000;
  }
};

const normalizeLabs = (labs: LabRoom[]): LabRoom[] =>
  labs.map((room) => ({
    ...room,
    equipment: room.equipment.map((eq) => ({
      ...eq,
      cumulativeRuntimeHours: eq.cumulativeRuntimeHours ?? 0,
      lastRuntimeUpdateAt: eq.lastRuntimeUpdateAt ?? new Date().toISOString(),
    })),
    iotDevices: room.iotDevices.map((device) => ({
      ...device,
      installedAt: device.installedAt ?? installationDateFromDeviceId(device.id),
      estimatedMaintenanceHours:
        device.estimatedMaintenanceHours ?? maintenanceHoursByType(device.type),
    })),
  }));

const applyLab01DeviceClearMigration = (labs: LabRoom[]): LabRoom[] => {
  if (localStorage.getItem(LAB01_DEVICE_CLEAR_MIGRATION_KEY) === 'done') {
    return labs;
  }

  const migrated = labs.map((room) =>
    room.id === 'lab-01'
      ? {
          ...room,
          equipment: [],
          iotDevices: [],
          actuators: [],
        }
      : room,
  );

  localStorage.setItem(LAB01_DEVICE_CLEAR_MIGRATION_KEY, 'done');
  return migrated;
};

// Device creation helpers
const generateDeviceId = (type: 'iot' | 'equipment'): string => {
  const prefix = type === 'iot' ? 'iot' : 'eq';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

const createIoTDeviceWithDefaults = (data: Partial<IoTDevice>): IoTDevice => {
  const id = data.id || generateDeviceId('iot');
  return {
    id,
    name: data.name || 'Unnamed Device',
    type: data.type || 'sensor',
    status: data.status || 'online',
    lastSeen: data.lastSeen || new Date().toISOString(),
    signalStrength: data.signalStrength ?? 85,
    batteryLevel: data.batteryLevel,
    firmwareVersion: data.firmwareVersion || '1.0.0',
    dataRate: data.dataRate || 5,
    location: data.location || '',
    installedAt: data.installedAt || new Date().toISOString(),
    estimatedMaintenanceHours: data.estimatedMaintenanceHours || maintenanceHoursByType(data.type || 'sensor'),
  };
};

const createEquipmentWithDefaults = (data: Partial<Equipment>): Equipment => {
  const id = data.id || generateDeviceId('equipment');
  return {
    id,
    name: data.name || 'Unnamed Equipment',
    status: data.status || 'online',
    lastMaintenance: data.lastMaintenance || new Date().toISOString().split('T')[0],
    mode: data.mode || 'auto',
    isEssential: data.isEssential ?? false,
    cumulativeRuntimeHours: data.cumulativeRuntimeHours ?? 0,
    lastRuntimeUpdateAt: data.lastRuntimeUpdateAt || new Date().toISOString(),
  };
};

const defaultAccounts: AuthAccount[] = [
  // ============ ADMINISTRATORS ============
  {
    id: '1',
    username: 'admin',
    email: 'admin@smartlab.com',
    name: 'Dr. Sarah Chen',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-03-27 14:32',
    password: 'admin123',
  },
  {
    id: '101',
    username: 'sysadmin',
    email: 'sysadmin@smartlab.com',
    name: 'Michael Torres',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-03-26 16:45',
    password: 'sysadmin123',
  },
  {
    id: '102',
    username: 'labdirector',
    email: 'director@smartlab.com',
    name: 'Prof. Rebecca Williams',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-03-27 09:00',
    password: 'director123',
  },

  // ============ TECHNICIANS (GLOBAL SCOPE) ============
  {
    id: '3',
    username: 'tech',
    email: 'tech@smartlab.com',
    name: 'Emily Watson',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 13:20',
    password: 'tech123',
  },
  {
    id: '201',
    username: 'maintenance',
    email: 'maintenance@smartlab.com',
    name: 'David Park',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 10:15',
    password: 'maintenance123',
  },
  {
    id: '202',
    username: 'supervisor',
    email: 'supervisor@smartlab.com',
    name: 'Maria Rodriguez',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-25 15:30',
    password: 'supervisor123',
  },

  // ============ TECHNICIANS (LABS 1-3) ============
  {
    id: '2',
    username: 'manager',
    email: 'manager@smartlab.com',
    name: 'John Martinez',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 11:45',
    password: 'manager123',
    assignedLabs: ['lab-01', 'lab-02', 'lab-03'],
  },
  {
    id: '203',
    username: 'tech_chembio',
    email: 'tech.chembio@smartlab.com',
    name: 'Kevin O\'Brien',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 08:30',
    password: 'chembio123',
    assignedLabs: ['lab-01', 'lab-02', 'lab-03'],
  },
  {
    id: '204',
    username: 'asst_tech1',
    email: 'assistant.tech1@smartlab.com',
    name: 'Priya Patel',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-26 14:00',
    password: 'asst123',
    assignedLabs: ['lab-01', 'lab-02', 'lab-03'],
  },

  // ============ TECHNICIANS (LABS 4-6) ============
  {
    id: '5',
    username: 'manager2',
    email: 'manager2@smartlab.com',
    name: 'Lisa Anderson',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 12:10',
    password: 'manager123',
    assignedLabs: ['lab-04', 'lab-05', 'lab-06'],
  },
  {
    id: '205',
    username: 'tech_physics',
    email: 'tech.physics@smartlab.com',
    name: 'James Cohen',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-27 09:45',
    password: 'physics123',
    assignedLabs: ['lab-04', 'lab-05', 'lab-06'],
  },
  {
    id: '206',
    username: 'asst_tech2',
    email: 'assistant.tech2@smartlab.com',
    name: 'Sarah Kim',
    role: 'technician',
    status: 'inactive',
    lastLogin: '2026-03-15 10:20',
    password: 'asst456',
    assignedLabs: ['lab-04', 'lab-05', 'lab-06'],
  },

  // ============ TECHNICIANS (SINGLE LAB ASSIGNMENT) ============
  {
    id: '207',
    username: 'lab1_specialist',
    email: 'specialist.lab1@smartlab.com',
    name: 'Ahmed Hassan',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-24 11:00',
    password: 'lab1spec123',
    assignedLabs: ['lab-01'],
  },
  {
    id: '208',
    username: 'lab3_specialist',
    email: 'specialist.lab3@smartlab.com',
    name: 'Elena Vasquez',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-23 13:30',
    password: 'lab3spec123',
    assignedLabs: ['lab-03'],
  },
  {
    id: '209',
    username: 'lab6_specialist',
    email: 'specialist.lab6@smartlab.com',
    name: 'Yuki Tanaka',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-20 09:15',
    password: 'lab6spec123',
    assignedLabs: ['lab-06'],
  },

  // ============ STUDENT / GUEST ============
  {
    id: '301',
    username: 'student',
    email: 'student@smartlab.com',
    name: 'Guest Student',
    role: 'student',
    status: 'active',
    lastLogin: '2026-03-19 10:05',
    password: 'student123',
  },
];

const sleep = (ms = API_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const usernameFromEmail = (email: string): string => {
  const [localPart = 'user'] = email.toLowerCase().split('@');
  const cleaned = localPart.replace(/[^a-z0-9._-]/g, '');
  return cleaned || 'user';
};

const normalizeAccounts = (accounts: AuthAccount[]): AuthAccount[] => {
  const seen = new Set<string>();

  return accounts.map((account) => {
    const baseUsername = (account.username || usernameFromEmail(account.email)).toLowerCase();
    let username = baseUsername;
    let suffix = 1;
    const legacyRole = (account as { role: string }).role;

    while (seen.has(username)) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    seen.add(username);

    return {
      ...account,
      role:
        legacyRole === 'manager'
          ? 'technician'
          : legacyRole === 'viewer'
            ? 'student'
            : account.role,
      username,
    };
  });
};

const toPublicUser = (account: AuthAccount): User => ({
  id: account.id,
  username: account.username,
  email: account.email,
  name: account.name,
  role: account.role,
  assignedLabs: account.assignedLabs,
});

const parseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const ensureSeedData = () => {
  if (!localStorage.getItem(LABS_KEY)) {
    localStorage.setItem(LABS_KEY, JSON.stringify(cloneInitialLabs()));
  }

  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultAccounts));
  }
};

const readAccounts = (): AuthAccount[] => {
  ensureSeedData();
  const parsed = parseJson<AuthAccount[]>(localStorage.getItem(USERS_KEY));
  const accounts = Array.isArray(parsed) ? parsed : defaultAccounts;
  const normalized = normalizeAccounts(accounts);
  if (JSON.stringify(accounts) !== JSON.stringify(normalized)) {
    writeAccounts(normalized);
  }
  return normalized;
};

const writeAccounts = (accounts: AuthAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
};

export const appApi = {
  async getLabs(): Promise<LabRoom[]> {
    if (useBackendApi) {
      return backendApi.getLabs();
    }
    ensureSeedData();
    await sleep();
    const parsed = parseJson<LabRoom[]>(localStorage.getItem(LABS_KEY));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const fallbackLabs = applyLab01DeviceClearMigration(normalizeLabs(cloneInitialLabs()));
      localStorage.setItem(LABS_KEY, JSON.stringify(fallbackLabs));
      return fallbackLabs;
    }

    const normalized = applyLab01DeviceClearMigration(normalizeLabs(parsed));
    localStorage.setItem(LABS_KEY, JSON.stringify(normalized));
    return normalized;
  },

  async saveLabs(labs: LabRoom[]): Promise<void> {
    if (useBackendApi) {
      await backendApi.saveLabs(labs);
      return;
    }
    await sleep();
    localStorage.setItem(LABS_KEY, JSON.stringify(normalizeLabs(labs)));
  },

  async resetLabs(): Promise<LabRoom[]> {
    const cloned = normalizeLabs(cloneInitialLabs());
    await this.saveLabs(cloned);
    return cloned;
  },

  async getManagedUsers(): Promise<ManagedUser[]> {
    if (useBackendApi) {
      return backendApi.getManagedUsers();
    }
    await sleep();
    return readAccounts().map(({ password: _password, assignedLabs: _assignedLabs, ...user }) => user);
  },

  async createManagedUser(user: ManagedUser): Promise<void> {
    if (useBackendApi) {
      await backendApi.createManagedUser(user);
      return;
    }
    await sleep();
    const accounts = readAccounts();
    const baseUsername = (user.username || usernameFromEmail(user.email)).toLowerCase();
    const existingUsernames = new Set(accounts.map((account) => account.username?.toLowerCase() ?? ''));
    let username = baseUsername;
    let suffix = 1;

    while (existingUsernames.has(username)) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    accounts.push({
      ...user,
      username,
      password: 'smartlab123',
      assignedLabs: user.assignedLabs,
    });
    writeAccounts(accounts);
  },

  async updateManagedUser(userId: string, updates: Partial<ManagedUser>): Promise<void> {
    if (useBackendApi) {
      await backendApi.updateManagedUser(userId, updates);
      return;
    }
    await sleep();
    const accounts = readAccounts().map((account) => {
      if (account.id !== userId) return account;

      return {
        ...account,
        ...updates,
        assignedLabs: updates.assignedLabs ?? account.assignedLabs,
      };
    });
    writeAccounts(accounts);
  },

  async deleteManagedUser(userId: string): Promise<void> {
    if (useBackendApi) {
      await backendApi.deleteManagedUser(userId);
      return;
    }
    await sleep();
    const accounts = readAccounts().filter((account) => account.id !== userId);
    writeAccounts(accounts);
  },

  async authenticate(username: string, password: string): Promise<User | null> {
    if (useBackendApi) {
      const user = await backendApi.authenticate(username, password);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }
      return user;
    }
    await sleep(500);
    const normalizedUsername = username.trim().toLowerCase();
    const account = readAccounts().find((item) => item.username?.toLowerCase() === normalizedUsername);
    if (!account) return null;
    if (account.password !== password || account.status !== 'active') return null;

    const withLogin = {
      ...account,
      lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const accounts = readAccounts().map((item) => (item.id === withLogin.id ? withLogin : item));
    writeAccounts(accounts);

    const user = toPublicUser(withLogin);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  async getSessionUser(): Promise<User | null> {
    await sleep(120);
    const parsed = parseJson<User>(localStorage.getItem(SESSION_KEY));
    return parsed ?? null;
  },

  async clearSession(): Promise<void> {
    await sleep(120);
    localStorage.removeItem(SESSION_KEY);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (useBackendApi) {
      return backendApi.changePassword(userId, currentPassword, newPassword);
    }
    await sleep(300);

    if (!currentPassword.trim()) {
      return { success: false, error: 'Current password is required.' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const accounts = readAccounts();
    const account = accounts.find((item) => item.id === userId);

    if (!account) {
      return { success: false, error: 'User account not found.' };
    }

    if (account.password !== currentPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const updatedAccounts = accounts.map((item) =>
      item.id === userId
        ? {
            ...item,
            password: newPassword,
          }
        : item,
    );

    writeAccounts(updatedAccounts);
    return { success: true };
  },

  async resetUserPassword(
    userId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; error?: string; newPassword?: string }> {
    if (useBackendApi) {
      return backendApi.resetUserPassword(userId, adminUserId);
    }
    await sleep(300);

    const accounts = readAccounts();
    const adminAccount = accounts.find((item) => item.id === adminUserId);

    if (!adminAccount || adminAccount.role !== 'admin') {
      return { success: false, error: 'Only admins can reset passwords.' };
    }

    const targetAccount = accounts.find((item) => item.id === userId);

    if (!targetAccount) {
      return { success: false, error: 'User account not found.' };
    }

    if (userId === adminUserId) {
      return { success: false, error: 'Cannot reset your own password. Use Change Password instead.' };
    }

    const newPassword = 'smartlab123';
    const updatedAccounts = accounts.map((item) =>
      item.id === userId
        ? {
            ...item,
            password: newPassword,
          }
        : item,
    );

    writeAccounts(updatedAccounts);
    return { success: true, newPassword };
  },

  // Device creation helpers (exported for use in other services and context)
  generateDeviceId,
  createIoTDeviceWithDefaults,
  createEquipmentWithDefaults,
};
