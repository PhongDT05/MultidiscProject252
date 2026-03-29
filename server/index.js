import express from 'express';
import cors from 'cors';
import { executeInTransaction, query, sql } from './db.js';
import { mapLabRow, mapUserRow, roleCodeFromUi } from './mappers.js';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1 AS Ok');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'unknown' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const rows = await query(
    `SELECT u.UserId, u.Username, u.Email, u.PasswordHash, u.DisplayName, u.AccountStatus, u.LastLoginAt,
            r.RoleCode,
            STRING_AGG(l.LabCode, ',') WITHIN GROUP (ORDER BY l.LabCode) AS AssignedLabs
     FROM smartlab.[User] u
     INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
     LEFT JOIN smartlab.UserLabAssignment ula ON ula.UserId = u.UserId
     LEFT JOIN smartlab.Lab l ON l.LabId = ula.LabId
     WHERE u.DeletedAt IS NULL AND LOWER(u.Username) = @username
     GROUP BY u.UserId, u.Username, u.Email, u.PasswordHash, u.DisplayName, u.AccountStatus, u.LastLoginAt, r.RoleCode`,
    { username },
  );

  const account = rows[0];
  if (!account || account.AccountStatus !== 'active' || account.PasswordHash !== password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  await query('UPDATE smartlab.[User] SET LastLoginAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId', { userId: account.UserId });

  const user = mapUserRow({ ...account, LastLoginAt: new Date().toISOString() });
  return res.json(user);
});

app.get('/api/users', async (_req, res) => {
  const rows = await query(
    `SELECT u.UserId, u.Username, u.Email, u.DisplayName, u.AccountStatus, u.LastLoginAt,
            r.RoleCode,
            STRING_AGG(l.LabCode, ',') WITHIN GROUP (ORDER BY l.LabCode) AS AssignedLabs
     FROM smartlab.[User] u
     INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
     LEFT JOIN smartlab.UserLabAssignment ula ON ula.UserId = u.UserId
     LEFT JOIN smartlab.Lab l ON l.LabId = ula.LabId
     WHERE u.DeletedAt IS NULL
     GROUP BY u.UserId, u.Username, u.Email, u.DisplayName, u.AccountStatus, u.LastLoginAt, r.RoleCode
     ORDER BY u.UserId`,
  );
  res.json(rows.map(mapUserRow));
});

app.post('/api/users', async (req, res) => {
  const body = req.body || {};
  const roleCode = roleCodeFromUi(body.role);

  await executeInTransaction(async (requestFactory) => {
    const request = requestFactory();
    request.input('username', sql.VarChar(50), String(body.username || '').toLowerCase());
    request.input('email', sql.VarChar(255), String(body.email || '').toLowerCase());
    request.input('displayName', sql.NVarChar(100), String(body.name || ''));
    request.input('roleCode', sql.VarChar(20), roleCode);
    request.input('status', sql.VarChar(20), body.status === 'inactive' ? 'inactive' : 'active');
    request.input('password', sql.VarChar(255), 'smartlab123');

    const inserted = await request.query(
      `INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
       OUTPUT INSERTED.UserId
       SELECT @username, @email, @password, @displayName, r.RoleId, @status
       FROM smartlab.[Role] r WHERE r.RoleCode = @roleCode`,
    );

    const userId = inserted.recordset[0]?.UserId;
    const labs = Array.isArray(body.assignedLabs) ? body.assignedLabs : [];

    for (const labCode of labs) {
      const assignReq = requestFactory();
      assignReq.input('userId', sql.BigInt, userId);
      assignReq.input('labCode', sql.VarChar(30), String(labCode));
      await assignReq.query(
        `INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
         SELECT @userId, l.LabId FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
      );
    }
  });

  res.status(201).json({ ok: true });
});

app.patch('/api/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const body = req.body || {};

  await executeInTransaction(async (requestFactory) => {
    const request = requestFactory();
    request.input('userId', sql.BigInt, userId);
    request.input('email', sql.VarChar(255), body.email ? String(body.email).toLowerCase() : null);
    request.input('displayName', sql.NVarChar(100), body.name ? String(body.name) : null);
    request.input('status', sql.VarChar(20), body.status ? String(body.status) : null);
    request.input('roleCode', sql.VarChar(20), body.role ? roleCodeFromUi(body.role) : null);

    await request.query(
      `UPDATE u
       SET u.Email = COALESCE(@email, u.Email),
           u.DisplayName = COALESCE(@displayName, u.DisplayName),
           u.AccountStatus = COALESCE(@status, u.AccountStatus),
           u.RoleId = COALESCE((SELECT r.RoleId FROM smartlab.[Role] r WHERE r.RoleCode = @roleCode), u.RoleId),
           u.UpdatedAt = SYSUTCDATETIME()
       FROM smartlab.[User] u
       WHERE u.UserId = @userId`,
    );

    if (Array.isArray(body.assignedLabs)) {
      const delReq = requestFactory();
      delReq.input('userId', sql.BigInt, userId);
      await delReq.query('DELETE FROM smartlab.UserLabAssignment WHERE UserId = @userId');
      for (const labCode of body.assignedLabs) {
        const insReq = requestFactory();
        insReq.input('userId', sql.BigInt, userId);
        insReq.input('labCode', sql.VarChar(30), String(labCode));
        await insReq.query(
          `INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
           SELECT @userId, l.LabId FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
        );
      }
    }
  });

  res.json({ ok: true });
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  await query(
    'UPDATE smartlab.[User] SET DeletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId',
    { userId },
  );
  res.json({ ok: true });
});

app.post('/api/users/:id/change-password', async (req, res) => {
  const userId = Number(req.params.id);
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  const rows = await query('SELECT UserId, PasswordHash FROM smartlab.[User] WHERE UserId = @userId AND DeletedAt IS NULL', { userId });
  const account = rows[0];
  if (!account) return res.status(404).json({ success: false, error: 'User account not found.' });
  if (account.PasswordHash !== currentPassword) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
  }

  await query('UPDATE smartlab.[User] SET PasswordHash = @newPassword, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId', { userId, newPassword });
  return res.json({ success: true });
});

app.post('/api/users/:id/reset-password', async (req, res) => {
  const userId = Number(req.params.id);
  const adminUserId = Number(req.body?.adminUserId);

  const rows = await query(
    `SELECT u.UserId, r.RoleCode
     FROM smartlab.[User] u
     INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
     WHERE u.UserId = @adminUserId AND u.DeletedAt IS NULL`,
    { adminUserId },
  );

  if (!rows[0] || rows[0].RoleCode !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Only admins can reset passwords.' });
  }

  if (userId === adminUserId) {
    return res.status(400).json({ success: false, error: 'Cannot reset your own password. Use Change Password instead.' });
  }

  const newPassword = 'smartlab123';
  await query('UPDATE smartlab.[User] SET PasswordHash = @newPassword, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId', { userId, newPassword });
  return res.json({ success: true, newPassword });
});

app.get('/api/labs', async (_req, res) => {
  const labRows = await query(
    `SELECT LabId, LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected
     FROM smartlab.Lab WHERE DeletedAt IS NULL ORDER BY LabCode`,
  );

  const labs = labRows.map(mapLabRow);
  const byId = new Map(labs.map((lab) => [lab.id, lab]));

  const equipmentRows = await query(
    `SELECT e.EquipmentCode, e.EquipmentName, e.[Status], e.[Mode], e.IsEssential,
            e.LastMaintenanceAt, e.CumulativeRuntimeHours, e.LastRuntimeUpdateAt, l.LabCode
     FROM smartlab.Equipment e
     INNER JOIN smartlab.Lab l ON l.LabId = e.LabId
     WHERE e.DeletedAt IS NULL AND l.DeletedAt IS NULL`,
  );
  for (const row of equipmentRows) {
    const lab = byId.get(row.LabCode);
    if (!lab) continue;
    lab.equipment.push({
      id: row.EquipmentCode,
      name: row.EquipmentName,
      status: row.Status,
      mode: row.Mode,
      isEssential: Boolean(row.IsEssential),
      lastMaintenance: row.LastMaintenanceAt ? new Date(row.LastMaintenanceAt).toISOString().split('T')[0] : '',
      cumulativeRuntimeHours: Number(row.CumulativeRuntimeHours ?? 0),
      lastRuntimeUpdateAt: row.LastRuntimeUpdateAt ? new Date(row.LastRuntimeUpdateAt).toISOString() : undefined,
    });
  }

  const iotRows = await query(
    `SELECT d.DeviceCode, d.DeviceName, d.DeviceType, d.[Status], d.LastSeenAt, d.SignalStrength,
            d.BatteryLevel, d.FirmwareVersion, d.DataRate, d.[Location], d.InstalledAt, d.EstimatedMaintenanceHours, l.LabCode
     FROM smartlab.IoTDevice d
     INNER JOIN smartlab.Lab l ON l.LabId = d.LabId
     WHERE d.DeletedAt IS NULL AND l.DeletedAt IS NULL`,
  );
  for (const row of iotRows) {
    const lab = byId.get(row.LabCode);
    if (!lab) continue;
    lab.iotDevices.push({
      id: row.DeviceCode,
      name: row.DeviceName,
      type: row.DeviceType,
      status: row.Status,
      lastSeen: row.LastSeenAt ? new Date(row.LastSeenAt).toISOString() : new Date().toISOString(),
      signalStrength: Number(row.SignalStrength ?? 0),
      batteryLevel: row.BatteryLevel == null ? undefined : Number(row.BatteryLevel),
      firmwareVersion: row.FirmwareVersion || '1.0.0',
      dataRate: Number(row.DataRate ?? 0),
      location: row.Location || '',
      installedAt: row.InstalledAt ? new Date(row.InstalledAt).toISOString() : undefined,
      estimatedMaintenanceHours: row.EstimatedMaintenanceHours == null ? undefined : Number(row.EstimatedMaintenanceHours),
    });
  }

  const actuatorRows = await query(
    `SELECT a.ActuatorCode, a.ActuatorName, a.ActuatorType, a.[Status], a.[Mode], a.LastActivatedAt, l.LabCode
     FROM smartlab.Actuator a
     INNER JOIN smartlab.Lab l ON l.LabId = a.LabId
     WHERE a.DeletedAt IS NULL AND l.DeletedAt IS NULL`,
  );
  for (const row of actuatorRows) {
    const lab = byId.get(row.LabCode);
    if (!lab) continue;
    lab.actuators.push({
      id: row.ActuatorCode,
      name: row.ActuatorName,
      type: row.ActuatorType,
      status: row.Status,
      mode: row.Mode,
      lastActivated: row.LastActivatedAt ? new Date(row.LastActivatedAt).toISOString() : undefined,
    });
  }

  const alertRows = await query(
    `SELECT al.AlertCode, al.AlertType, al.Severity, al.[Message], al.ReasonCode, al.[Timestamp],
            al.IsAcknowledged, au.DisplayName AS AcknowledgedBy, al.AcknowledgedAt, al.AutoResolved, l.LabCode
     FROM smartlab.Alert al
     INNER JOIN smartlab.Lab l ON l.LabId = al.LabId
     LEFT JOIN smartlab.[User] au ON au.UserId = al.AcknowledgedByUserId
     WHERE al.DeletedAt IS NULL AND l.DeletedAt IS NULL`,
  );

  for (const row of alertRows) {
    const lab = byId.get(row.LabCode);
    if (!lab) continue;
    lab.alerts.push({
      id: row.AlertCode,
      type: row.AlertType,
      severity: row.Severity,
      message: row.Message,
      reasonCode: row.ReasonCode,
      timestamp: new Date(row.Timestamp).toISOString(),
      acknowledged: Boolean(row.IsAcknowledged),
      acknowledgedBy: row.AcknowledgedBy || undefined,
      acknowledgedAt: row.AcknowledgedAt ? new Date(row.AcknowledgedAt).toISOString() : undefined,
      autoResolved: Boolean(row.AutoResolved),
      roomId: row.LabCode,
    });
  }

  res.json(labs);
});

app.put('/api/labs', async (req, res) => {
  const labs = Array.isArray(req.body) ? req.body : [];

  await executeInTransaction(async (requestFactory) => {
    for (const lab of labs) {
      const upsertLabReq = requestFactory();
      upsertLabReq.input('labCode', sql.VarChar(30), String(lab.id));
      upsertLabReq.input('labName', sql.NVarChar(120), String(lab.name));
      upsertLabReq.input('status', sql.VarChar(20), String(lab.status));
      upsertLabReq.input('temperature', sql.Decimal(5, 2), Number(lab.temperature));
      upsertLabReq.input('humidity', sql.Decimal(5, 2), Number(lab.humidity));
      upsertLabReq.input('co2Level', sql.Decimal(8, 2), Number(lab.co2Level));
      upsertLabReq.input('lightLevel', sql.Decimal(8, 2), Number(lab.lightLevel));
      upsertLabReq.input('occupancy', sql.Int, Number(lab.occupancy));
      upsertLabReq.input('maxOccupancy', sql.Int, Number(lab.maxOccupancy));
      upsertLabReq.input('presenceDetected', sql.Bit, lab.presenceDetected ? 1 : 0);

      await upsertLabReq.query(
        `MERGE smartlab.Lab AS t
         USING (SELECT @labCode AS LabCode) AS s ON s.LabCode = t.LabCode
         WHEN MATCHED THEN
           UPDATE SET LabName = @labName, [Status] = @status, Temperature = @temperature, Humidity = @humidity,
                      Co2Level = @co2Level, LightLevel = @lightLevel, Occupancy = @occupancy,
                      MaxOccupancy = @maxOccupancy, PresenceDetected = @presenceDetected,
                      UpdatedAt = SYSUTCDATETIME(), DeletedAt = NULL
         WHEN NOT MATCHED THEN
           INSERT (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
           VALUES (@labCode, @labName, @status, @temperature, @humidity, @co2Level, @lightLevel, @occupancy, @maxOccupancy, @presenceDetected);`,
      );

      const clearReq = requestFactory();
      clearReq.input('labCode', sql.VarChar(30), String(lab.id));
      await clearReq.query(
        `UPDATE e SET DeletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() FROM smartlab.Equipment e INNER JOIN smartlab.Lab l ON l.LabId = e.LabId WHERE l.LabCode = @labCode;
         UPDATE d SET DeletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() FROM smartlab.IoTDevice d INNER JOIN smartlab.Lab l ON l.LabId = d.LabId WHERE l.LabCode = @labCode;
         UPDATE a SET DeletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() FROM smartlab.Actuator a INNER JOIN smartlab.Lab l ON l.LabId = a.LabId WHERE l.LabCode = @labCode;
         UPDATE al SET DeletedAt = SYSUTCDATETIME() FROM smartlab.Alert al INNER JOIN smartlab.Lab l ON l.LabId = al.LabId WHERE l.LabCode = @labCode;`,
      );

      for (const item of lab.equipment || []) {
        const req = requestFactory();
        req.input('labCode', sql.VarChar(30), String(lab.id));
        req.input('code', sql.VarChar(50), String(item.id));
        req.input('name', sql.NVarChar(120), String(item.name));
        req.input('status', sql.VarChar(20), String(item.status));
        req.input('mode', sql.VarChar(20), String(item.mode));
        req.input('isEssential', sql.Bit, item.isEssential ? 1 : 0);
        req.input('lastMaintenanceAt', sql.DateTime2, item.lastMaintenance ? new Date(item.lastMaintenance) : null);
        req.input('runtime', sql.Decimal(10, 2), Number(item.cumulativeRuntimeHours ?? 0));
        req.input('lastRuntimeUpdateAt', sql.DateTime2, item.lastRuntimeUpdateAt ? new Date(item.lastRuntimeUpdateAt) : null);

        await req.query(
          `INSERT INTO smartlab.Equipment (LabId, EquipmentCode, EquipmentName, [Status], [Mode], IsEssential, LastMaintenanceAt, CumulativeRuntimeHours, LastRuntimeUpdateAt)
           SELECT l.LabId, @code, @name, @status, @mode, @isEssential, @lastMaintenanceAt, @runtime, @lastRuntimeUpdateAt
           FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
        );
      }

      for (const item of lab.iotDevices || []) {
        const req = requestFactory();
        req.input('labCode', sql.VarChar(30), String(lab.id));
        req.input('code', sql.VarChar(50), String(item.id));
        req.input('name', sql.NVarChar(120), String(item.name));
        req.input('type', sql.VarChar(20), String(item.type));
        req.input('status', sql.VarChar(20), String(item.status));
        req.input('installedAt', sql.DateTime2, item.installedAt ? new Date(item.installedAt) : null);
        req.input('maintHours', sql.Decimal(10, 2), item.estimatedMaintenanceHours == null ? null : Number(item.estimatedMaintenanceHours));
        req.input('lastSeenAt', sql.DateTime2, item.lastSeen ? new Date(item.lastSeen) : new Date());
        req.input('signalStrength', sql.TinyInt, Number(item.signalStrength ?? 0));
        req.input('batteryLevel', sql.TinyInt, item.batteryLevel == null ? null : Number(item.batteryLevel));
        req.input('firmwareVersion', sql.VarChar(50), String(item.firmwareVersion || '1.0.0'));
        req.input('dataRate', sql.Decimal(10, 2), Number(item.dataRate ?? 0));
        req.input('location', sql.NVarChar(120), String(item.location || ''));

        await req.query(
          `INSERT INTO smartlab.IoTDevice (LabId, DeviceCode, DeviceName, DeviceType, [Status], InstalledAt, EstimatedMaintenanceHours, LastSeenAt, SignalStrength, BatteryLevel, FirmwareVersion, DataRate, [Location])
           SELECT l.LabId, @code, @name, @type, @status, @installedAt, @maintHours, @lastSeenAt, @signalStrength, @batteryLevel, @firmwareVersion, @dataRate, @location
           FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
        );
      }

      for (const item of lab.actuators || []) {
        const req = requestFactory();
        req.input('labCode', sql.VarChar(30), String(lab.id));
        req.input('code', sql.VarChar(50), String(item.id));
        req.input('name', sql.NVarChar(120), String(item.name));
        req.input('type', sql.VarChar(20), String(item.type));
        req.input('status', sql.VarChar(20), String(item.status));
        req.input('mode', sql.VarChar(20), String(item.mode));
        req.input('lastActivatedAt', sql.DateTime2, item.lastActivated ? new Date(item.lastActivated) : null);

        await req.query(
          `INSERT INTO smartlab.Actuator (LabId, ActuatorCode, ActuatorName, ActuatorType, [Status], [Mode], LastActivatedAt)
           SELECT l.LabId, @code, @name, @type, @status, @mode, @lastActivatedAt
           FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
        );
      }

      for (const item of lab.alerts || []) {
        const req = requestFactory();
        req.input('labCode', sql.VarChar(30), String(lab.id));
        req.input('code', sql.VarChar(50), String(item.id));
        req.input('type', sql.VarChar(20), String(item.type));
        req.input('severity', sql.VarChar(20), String(item.severity));
        req.input('message', sql.NVarChar(500), String(item.message));
        req.input('reasonCode', sql.VarChar(50), String(item.reasonCode));
        req.input('timestamp', sql.DateTime2, item.timestamp ? new Date(item.timestamp) : new Date());
        req.input('isAcknowledged', sql.Bit, item.acknowledged ? 1 : 0);
        req.input('autoResolved', sql.Bit, item.autoResolved ? 1 : 0);

        await req.query(
          `INSERT INTO smartlab.Alert (LabId, AlertCode, AlertType, Severity, [Message], ReasonCode, [Timestamp], IsAcknowledged, AutoResolved)
           SELECT l.LabId, @code, @type, @severity, @message, @reasonCode, @timestamp, @isAcknowledged, @autoResolved
           FROM smartlab.Lab l WHERE l.LabCode = @labCode`,
        );
      }
    }
  });

  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
});

app.listen(PORT, () => {
  console.log(`SmartLab API running on http://localhost:${PORT}`);
});
