const roleMapToUi = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  STUDENT: 'student',
};

const roleMapToDb = {
  admin: 'ADMIN',
  technician: 'TECHNICIAN',
  student: 'STUDENT',
};

export function mapUserRow(row) {
  return {
    id: String(row.UserId),
    username: row.Username,
    email: row.Email,
    name: row.DisplayName,
    role: roleMapToUi[row.RoleCode] || 'student',
    status: row.AccountStatus,
    lastLogin: row.LastLoginAt ? new Date(row.LastLoginAt).toISOString().slice(0, 16).replace('T', ' ') : undefined,
    assignedLabs: row.AssignedLabs ? row.AssignedLabs.split(',').filter(Boolean) : undefined,
  };
}

export function roleCodeFromUi(role) {
  return roleMapToDb[role] || 'STUDENT';
}

export function mapLabRow(row) {
  return {
    id: row.LabCode,
    name: row.LabName,
    status: row.Status,
    temperature: Number(row.Temperature ?? 0),
    humidity: Number(row.Humidity ?? 0),
    co2Level: Number(row.Co2Level ?? 0),
    lightLevel: Number(row.LightLevel ?? 0),
    occupancy: Number(row.Occupancy ?? 0),
    maxOccupancy: Number(row.MaxOccupancy ?? 0),
    presenceDetected: Boolean(row.PresenceDetected),
    equipment: [],
    alerts: [],
    iotDevices: [],
    actuators: [],
  };
}
