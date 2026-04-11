import type { LabRoom } from '../data/labData';
import type { ManagedUser, User } from '../types/auth';

export interface TelemetrySnapshot {
  id: string;
  temperature: number;
  humidity: number;
  co2Level: number;
  lightLevel: number;
  occupancy: number;
  presenceDetected: boolean;
}

export interface LabRecommendation {
  id: string;
  labId: string;
  message: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
  studentName: string;
  instructorName: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.toString() || 'http://localhost:4000').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const backendApi = {
  async getLabs(): Promise<LabRoom[]> {
    return request<LabRoom[]>('/api/labs');
  },

  async saveLabs(labs: LabRoom[]): Promise<void> {
    await request<{ ok: boolean }>('/api/labs', {
      method: 'PUT',
      body: JSON.stringify(labs),
    });
  },

  async getManagedUsers(): Promise<ManagedUser[]> {
    return request<ManagedUser[]>('/api/users');
  },

  async createManagedUser(user: ManagedUser): Promise<void> {
    await request<{ ok: boolean }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateManagedUser(userId: string, updates: Partial<ManagedUser>): Promise<void> {
    await request<{ ok: boolean }>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteManagedUser(userId: string): Promise<void> {
    await request<{ ok: boolean }>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async authenticate(username: string, password: string): Promise<User | null> {
    try {
      return await request<User>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch {
      return null;
    }
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await request<{ success: boolean; error?: string }>(`/api/users/${userId}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to change password.' };
    }
  },

  async resetUserPassword(
    userId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; error?: string; newPassword?: string }> {
    try {
      return await request<{ success: boolean; error?: string; newPassword?: string }>(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ adminUserId }),
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password.' };
    }
  },

  async recordTelemetrySnapshots(labs: TelemetrySnapshot[], recordedAt: string): Promise<void> {
    await request<{ ok: boolean }>('/api/telemetry/snapshots', {
      method: 'POST',
      body: JSON.stringify({ labs, recordedAt }),
    });
  },

  async getRecommendations(labId?: string): Promise<LabRecommendation[]> {
    const search = labId ? `?labId=${encodeURIComponent(labId)}` : '';
    return request<LabRecommendation[]>(`/api/recommendations${search}`);
  },

  async sendRecommendation(labId: string, studentUserId: string, message: string): Promise<void> {
    await request<{ ok: boolean }>('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({ labId, studentUserId, message }),
    });
  },
};
