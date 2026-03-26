import type { User } from '../types/auth';

/**
 * Determines if a user can manage devices (add/edit/delete) in a specific lab
 * 
 * Rules:
 * - Admin: Can manage devices in all labs
 * - Technician with assignedLabs: Can only manage in assigned labs
 * - Technician without assignedLabs (global): Can manage in all labs
 * - Student (read-only): Cannot manage devices
 */
export function canUserManageDeviceInLab(user: User | null, labId: string): boolean {
  // Not authenticated = no management access
  if (!user) return false;

  // Only technician and above can manage devices
  if (user.role !== 'technician' && user.role !== 'admin') {
    return false;
  }

  // Admin can manage devices in all labs
  if (user.role === 'admin') {
    return true;
  }

  // Technician with no assigned labs = global access
  if (!user.assignedLabs || user.assignedLabs.length === 0) {
    return true;
  }

  // Technician with assigned labs = check if this lab is assigned
  return user.assignedLabs.includes(labId);
}

/**
 * Determines if a user can view device management UI in a specific lab
 * (Slightly more permissive - allows viewing the button/form)
 */
export function canUserViewDeviceManagement(user: User | null, labId: string): boolean {
  return canUserManageDeviceInLab(user, labId);
}

/**
 * Error message for device management access denied
 */
export function getDeviceAccessDeniedMessage(user: User | null, labId: string): string {
  if (!user) {
    return 'You must be logged in as a technician or administrator to manage devices.';
  }

  if (user.role !== 'technician' && user.role !== 'admin') {
    return `Your role (${user.role}) does not have permission to manage devices. Only technicians and administrators can manage devices.`;
  }

  if (user.role === 'technician' && user.assignedLabs && !user.assignedLabs.includes(labId)) {
    return `This lab (${labId}) is not assigned to you. Assigned labs: ${user.assignedLabs.join(', ') || 'none'}`;
  }

  return 'You do not have permission to manage devices in this lab.';
}
