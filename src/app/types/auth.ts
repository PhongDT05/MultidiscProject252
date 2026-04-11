export type UserRole = 'admin' | 'technician' | 'instructor' | 'student';

export interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  assignedLabs?: string[];
}

export interface ManagedUser {
  id: string;
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
  status: 'active' | 'inactive';
  assignedLabs?: string[];
}

export interface AuthAccount extends ManagedUser {
  password: string;
  assignedLabs?: string[];
}
