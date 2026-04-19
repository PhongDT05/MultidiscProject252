import { labRooms, type LabRoom, type IoTDevice, type Equipment } from '../data/labData';
import type { AuthAccount, ManagedUser, User } from '../types/auth';
import { backendApi, type LabRecommendation, type TelemetrySnapshot } from './backendApi';

const LABS_KEY = 'smartlab_api_labs';
const USERS_KEY = 'smartlab_api_users';
const SESSION_KEY = 'smartlab_user';
const LAB01_EMPTY_BASELINE_MIGRATION_KEY = 'smartlab_migration_lab01_empty_baseline_v2';
const RECOMMENDATIONS_KEY = 'smartlab_lab_recommendations_v1';

const API_DELAY_MS = 250;
// Backend mode is enabled by default so frontend writes persist to SQL Server.
// Set VITE_USE_BACKEND_API=false to force localStorage demo mode.
const useBackendApi = import.meta.env.VITE_USE_BACKEND_API?.toString().toLowerCase() !== 'false';

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

const applyLab01EmptyBaselineMigration = (labs: LabRoom[]): LabRoom[] => {
  if (localStorage.getItem(LAB01_EMPTY_BASELINE_MIGRATION_KEY) === 'done') {
    return labs;
  }

  const migrated = labs.map((room) =>
    room.id === 'lab-01'
      ? {
          ...room,
          status: 'warning',
          temperature: 0,
          humidity: 0,
          co2Level: 0,
          lightLevel: 0,
          presenceDetected: false,
          alerts: [],
          equipment: [],
          iotDevices: [],
          actuators: [],
        }
      : room,
  );

  localStorage.setItem(LAB01_EMPTY_BASELINE_MIGRATION_KEY, 'done');
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

  // ============ TECHNICIANS ============
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
  // ============ INSTRUCTOR ============
  {
    id: '401',
    username: 'instructor1',
    email: 'instructor1@smartlab.com',
    name: 'Dr. Lan Instructor',
    role: 'instructor',
    status: 'active',
    lastLogin: '2026-03-27 07:45',
    password: 'instructor123',
    assignedLabs: ['lab-02', 'lab-03'],
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

const ensureRequiredMockAccounts = (accounts: AuthAccount[]): AuthAccount[] => {
  const existingByUsername = new Set(
    accounts
      .map((account) => account.username?.toLowerCase())
      .filter((username): username is string => Boolean(username)),
  );

  const missingDefaults = defaultAccounts.filter((account) => {
    const username = (account.username || '').toLowerCase();
    return username.length > 0 && !existingByUsername.has(username);
  });

  if (missingDefaults.length === 0) {
    return accounts;
  }

  return [...accounts, ...missingDefaults.map((account) => ({ ...account }))];
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
  const withRequiredMocks = ensureRequiredMockAccounts(accounts);
  const normalized = normalizeAccounts(withRequiredMocks);
  if (JSON.stringify(accounts) !== JSON.stringify(normalized)) {
    writeAccounts(normalized);
  }
  return normalized;
};

const writeAccounts = (accounts: AuthAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
};

const readRecommendations = (): LabRecommendation[] => {
  const parsed = parseJson<LabRecommendation[]>(localStorage.getItem(RECOMMENDATIONS_KEY));
  return Array.isArray(parsed) ? parsed : [];
};

const writeRecommendations = (items: LabRecommendation[]) => {
  localStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(items));
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
      const fallbackLabs = applyLab01EmptyBaselineMigration(normalizeLabs(cloneInitialLabs()));
      localStorage.setItem(LABS_KEY, JSON.stringify(fallbackLabs));
      return fallbackLabs;
    }

    const normalized = applyLab01EmptyBaselineMigration(normalizeLabs(parsed));
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

  async recordTelemetrySnapshots(labs: TelemetrySnapshot[], recordedAt: string): Promise<void> {
    if (useBackendApi) {
      await backendApi.recordTelemetrySnapshots(labs, recordedAt);
      return;
    }
    await sleep(120);
  },

  async getRecommendations(labId?: string): Promise<LabRecommendation[]> {
    if (useBackendApi) {
      return backendApi.getRecommendations(labId);
    }
    await sleep(120);
    const items = readRecommendations();
    if (!labId) return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items
      .filter((item) => item.labId === labId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async sendRecommendation(labId: string, studentUserId: string, message: string): Promise<void> {
    if (useBackendApi) {
      await backendApi.sendRecommendation(labId, studentUserId, message);
      return;
    }

    await sleep(120);
    const accounts = readAccounts();
    const student = accounts.find((account) => account.id === studentUserId && account.role === 'student');
    if (!student) {
      throw new Error('Only students can send recommendations.');
    }

    const instructor = accounts.find(
      (account) =>
        account.role === 'instructor' &&
        Array.isArray(account.assignedLabs) &&
        account.assignedLabs.includes(labId),
    );

    if (!instructor) {
      throw new Error('No instructor is currently assigned to this lab.');
    }

    const nextRecommendation: LabRecommendation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      labId,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      studentName: student.name,
      instructorName: instructor.name,
    };

    writeRecommendations([nextRecommendation, ...readRecommendations()]);
  },

  // Device creation helpers (exported for use in other services and context)
  generateDeviceId,
  createIoTDeviceWithDefaults,
  createEquipmentWithDefaults,
};
