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

const defaultAccounts: AuthAccount[] = [
  {
    id: '1',
    email: 'admin@smartlab.com',
    name: 'Dr. Sarah Chen',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-03-18 09:15',
    password: 'admin123',
  },
  {
    id: '2',
    email: 'manager@smartlab.com',
    name: 'John Martinez',
    role: 'manager',
    status: 'active',
    lastLogin: '2026-03-18 08:45',
    password: 'manager123',
    assignedLabs: ['lab-01', 'lab-02', 'lab-03'],
  },
  {
    id: '5',
    email: 'manager2@smartlab.com',
    name: 'Lisa Anderson',
    role: 'manager',
    status: 'active',
    lastLogin: '2026-03-18 08:12',
    password: 'manager123',
    assignedLabs: ['lab-04', 'lab-05', 'lab-06'],
  },
  {
    id: '3',
    email: 'tech@smartlab.com',
    name: 'Emily Watson',
    role: 'technician',
    status: 'active',
    lastLogin: '2026-03-18 07:30',
    password: 'tech123',
  },
  {
    id: '4',
    email: 'viewer@smartlab.com',
    name: 'Alex Johnson',
    role: 'viewer',
    status: 'active',
    lastLogin: '2026-03-17 16:20',
    password: 'viewer123',
  },
];

const sleep = (ms = API_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const toPublicUser = (account: AuthAccount): User => ({
  id: account.id,
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
  return Array.isArray(parsed) ? parsed : defaultAccounts;
};

const writeAccounts = (accounts: AuthAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
};

export const appApi = {
  async getLabs(): Promise<LabRoom[]> {
    ensureSeedData();
    await sleep();
    const parsed = parseJson<LabRoom[]>(localStorage.getItem(LABS_KEY));
    return Array.isArray(parsed) ? parsed : cloneInitialLabs();
  },

  async saveLabs(labs: LabRoom[]): Promise<void> {
    await sleep();
    localStorage.setItem(LABS_KEY, JSON.stringify(labs));
  },

  async resetLabs(): Promise<LabRoom[]> {
    const cloned = cloneInitialLabs();
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
    accounts.push({
      ...user,
      password: 'smartlab123',
      assignedLabs: user.role === 'manager' ? [] : undefined,
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
        assignedLabs: updates.role && updates.role !== 'manager' ? undefined : account.assignedLabs,
      };
    });
    writeAccounts(accounts);
  },

  async deleteManagedUser(userId: string): Promise<void> {
    await sleep();
    const accounts = readAccounts().filter((account) => account.id !== userId);
    writeAccounts(accounts);
  },

  async authenticate(email: string, password: string): Promise<User | null> {
    await sleep(500);
    const account = readAccounts().find((item) => item.email.toLowerCase() === email.toLowerCase());
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
