import { labRooms, type LabRoom } from '../data/labData';
import type { AuthAccount, ManagedUser, User } from '../types/auth';

const LABS_KEY = 'smartlab_api_labs';
const USERS_KEY = 'smartlab_api_users';
const SESSION_KEY = 'smartlab_user';

const API_DELAY_MS = 250;

const cloneInitialLabs = (): LabRoom[] =>
  labRooms.map((room) => ({
    ...room,
    equipment: room.equipment.map((eq) => ({ ...eq })),
    alerts: room.alerts.map((alert) => ({ ...alert })),
    iotDevices: room.iotDevices.map((device) => ({ ...device })),
    actuators: room.actuators.map((actuator) => ({ ...actuator })),
  }));

const normalizeLabs = (labs: LabRoom[]): LabRoom[] =>
  labs.map((room) => ({
    ...room,
    equipment: room.equipment.map((eq) => ({
      ...eq,
      cumulativeRuntimeHours: eq.cumulativeRuntimeHours ?? 0,
      lastRuntimeUpdateAt: eq.lastRuntimeUpdateAt ?? new Date().toISOString(),
    })),
  }));

const defaultAccounts: AuthAccount[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@smartlab.com',
    name: 'Dr. Sarah Chen',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-03-18 09:15',
    password: 'admin123',
  },
  {
    id: '2',
    username: 'manager',
    email: 'manager@smartlab.com',
    name: 'John Martinez',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-18 08:45',
    password: 'manager123',
    assignedLabs: ['lab-01', 'lab-02', 'lab-03'],
  },
  {
    id: '5',
    username: 'manager2',
    email: 'manager2@smartlab.com',
    name: 'Lisa Anderson',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-18 08:12',
    password: 'manager123',
    assignedLabs: ['lab-04', 'lab-05', 'lab-06'],
  },
  {
    id: '3',
    username: 'tech',
    email: 'tech@smartlab.com',
    name: 'Emily Watson',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-18 07:30',
    password: 'tech123',
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
      role: legacyRole === 'manager' ? 'technician' : account.role,
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
  const filtered = accounts.filter((account) => account.role !== 'viewer');
  const normalized = normalizeAccounts(filtered);
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
    ensureSeedData();
    await sleep();
    const parsed = parseJson<LabRoom[]>(localStorage.getItem(LABS_KEY));
    if (!Array.isArray(parsed)) {
      return normalizeLabs(cloneInitialLabs());
    }

    const normalized = normalizeLabs(parsed);
    localStorage.setItem(LABS_KEY, JSON.stringify(normalized));
    return normalized;
  },

  async saveLabs(labs: LabRoom[]): Promise<void> {
    await sleep();
    localStorage.setItem(LABS_KEY, JSON.stringify(normalizeLabs(labs)));
  },

  async resetLabs(): Promise<LabRoom[]> {
    const cloned = normalizeLabs(cloneInitialLabs());
    await this.saveLabs(cloned);
    return cloned;
  },

  async getManagedUsers(): Promise<ManagedUser[]> {
    await sleep();
    return readAccounts().map(({ password: _password, assignedLabs: _assignedLabs, ...user }) => user);
  },

  async createManagedUser(user: ManagedUser): Promise<void> {
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
    await sleep();
    const accounts = readAccounts().filter((account) => account.id !== userId);
    writeAccounts(accounts);
  },

  async authenticate(username: string, password: string): Promise<User | null> {
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
};
