export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  assignedLabs?: string[];
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
  status: 'active' | 'inactive';
}

export interface AuthAccount extends ManagedUser {
  password: string;
  assignedLabs?: string[];
}
