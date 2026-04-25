import express from 'express';
import cors from 'cors';
import { executeInTransaction, query, sql } from './db.js';
import { mapLabRow, mapUserRow, roleCodeFromUi } from './mappers.js';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);
const mqttBrokerUrl =
  process.env.API_MQTT_BROKER_URL ||
  process.env.MQTT_BROKER_URL ||
  '';
const mqttCommandTopic =
  process.env.API_MQTT_COMMAND_TOPIC ||
  'esp32SLG4/commands';
const mqttClientId =
  process.env.API_MQTT_CLIENT_ID ||
  `smartlab-api-${Math.random().toString(16).slice(2, 10)}`;

let mqttClientPromise = null;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createCommandEnvelope = (command, metadata) => {
  const envelope = {
    id: `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    command,
    issuedAt: new Date().toISOString(),
    source: 'smartlab-dashboard',
  };

  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    envelope.metadata = metadata;
  }

  return envelope;
};

async function getMqttClient() {
  if (!mqttBrokerUrl) {
    throw new Error('API_MQTT_BROKER_URL is missing. MQTT command publishing is not configured.');
  }

  if (mqttClientPromise) {
    return mqttClientPromise;
  }

  mqttClientPromise = import('mqtt')
    .then((mqttModule) => {
      const connect =
        typeof mqttModule.connect === 'function'
          ? mqttModule.connect
          : (mqttModule.default && typeof mqttModule.default.connect === 'function'
              ? mqttModule.default.connect
              : null);

      if (!connect) {
        throw new Error('Failed to initialize MQTT client: mqtt.connect export not found.');
      }

      return new Promise((resolve, reject) => {
        const client = connect(mqttBrokerUrl, {
          clientId: mqttClientId,
          username: process.env.API_MQTT_USERNAME,
          password: process.env.API_MQTT_PASSWORD,
          reconnectPeriod: 3000,
          connectTimeout: 10000,
          clean: true,
        });

        const handleConnect = () => {
          client.off('error', handleInitialError);
          resolve(client);
        };

        const handleInitialError = (error) => {
          client.off('connect', handleConnect);
          mqttClientPromise = null;
          try {
            client.end(true);
          } catch {
            // no-op
          }
          reject(error instanceof Error ? error : new Error('MQTT connection failed.'));
        };

        client.once('connect', handleConnect);
        client.once('error', handleInitialError);

        client.on('close', () => {
          // Allow lazy reconnect on next publish if client is permanently closed.
          mqttClientPromise = null;
        });
      });
    })
    .catch((error) => {
      mqttClientPromise = null;
      throw error;
    });

  return mqttClientPromise;
}

async function publishMqttCommand(topic, payload) {
  const client = await getMqttClient();

  await new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1, retain: false }, (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

async function assertLabsAreAvailableForInstructor(requestFactory, labs, excludeUserId = null) {
  for (const rawLabCode of labs) {
    const checkReq = requestFactory();
    checkReq.input('labCode', sql.VarChar(30), String(rawLabCode));
    checkReq.input('excludeUserId', sql.BigInt, excludeUserId);

    const existingInstructor = await checkReq.query(
      `SELECT TOP 1 l.LabCode, u.DisplayName
       FROM smartlab.UserLabAssignment ula
       INNER JOIN smartlab.[User] u ON u.UserId = ula.UserId
       INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
       INNER JOIN smartlab.Lab l ON l.LabId = ula.LabId
       WHERE u.DeletedAt IS NULL
         AND r.RoleCode = 'INSTRUCTOR'
         AND l.LabCode = @labCode
         AND (@excludeUserId IS NULL OR u.UserId <> @excludeUserId)`,
    );

    if (existingInstructor.recordset[0]) {
      const conflict = existingInstructor.recordset[0];
      throw new Error(`Lab ${conflict.LabCode} is already managed by instructor ${conflict.DisplayName}.`);
    }
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1 AS Ok');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'unknown' });
  }
});

app.post('/api/mqtt/commands', async (req, res) => {
  const command = String(req.body?.command || '').trim();
  const topic = String(req.body?.topic || mqttCommandTopic).trim();
  const metadata = req.body?.metadata;

  if (!command) {
    return res.status(400).json({ error: 'command is required.' });
  }

  if (!topic) {
    return res.status(400).json({ error: 'topic is required.' });
  }

  if (command.length > 1000) {
    return res.status(400).json({ error: 'command is too long (max 1000 chars).' });
  }

  const envelope = createCommandEnvelope(command, metadata);

  try {
    await publishMqttCommand(topic, JSON.stringify(envelope));
    return res.status(202).json({ ok: true, topic, envelope });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to publish MQTT command.',
    });
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
  const labs = Array.isArray(body.assignedLabs) ? body.assignedLabs : [];

  try {
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
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create user.' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const body = req.body || {};

  try {
    await executeInTransaction(async (requestFactory) => {
      const currentReq = requestFactory();
      currentReq.input('userId', sql.BigInt, userId);
      const currentUserRows = await currentReq.query(
        `SELECT u.UserId, r.RoleCode,
                STRING_AGG(l.LabCode, ',') WITHIN GROUP (ORDER BY l.LabCode) AS AssignedLabs
         FROM smartlab.[User] u
         INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
         LEFT JOIN smartlab.UserLabAssignment ula ON ula.UserId = u.UserId
         LEFT JOIN smartlab.Lab l ON l.LabId = ula.LabId
         WHERE u.UserId = @userId AND u.DeletedAt IS NULL
         GROUP BY u.UserId, r.RoleCode`,
      );

      const currentUser = currentUserRows.recordset[0];
      if (!currentUser) {
        throw new Error('User not found.');
      }

      const targetRoleCode = body.role ? roleCodeFromUi(body.role) : currentUser.RoleCode;
      const targetLabs = Array.isArray(body.assignedLabs)
        ? body.assignedLabs
        : (currentUser.AssignedLabs ? String(currentUser.AssignedLabs).split(',').filter(Boolean) : []);

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
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update user.' });
  }
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
    `SELECT LabId, LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected
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
      const presenceDetected = Boolean(lab.presenceDetected);
      upsertLabReq.input('presenceDetected', sql.Bit, presenceDetected ? 1 : 0);

      await upsertLabReq.query(
        `MERGE smartlab.Lab AS t
         USING (SELECT @labCode AS LabCode) AS s ON s.LabCode = t.LabCode
         WHEN MATCHED THEN
           UPDATE SET LabName = @labName, [Status] = @status, Temperature = @temperature, Humidity = @humidity,
                      Co2Level = @co2Level, LightLevel = @lightLevel, PresenceDetected = @presenceDetected,
                      UpdatedAt = SYSUTCDATETIME(), DeletedAt = NULL
         WHEN NOT MATCHED THEN
           INSERT (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
           VALUES (@labCode, @labName, @status, @temperature, @humidity, @co2Level, @lightLevel, @presenceDetected);`,
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

app.post('/api/telemetry/snapshots', async (req, res) => {
  const payloadLabs = Array.isArray(req.body?.labs) ? req.body.labs : [];
  const parsedRecordedAt = req.body?.recordedAt ? new Date(req.body.recordedAt) : new Date();
  const recordedAt = Number.isNaN(parsedRecordedAt.getTime()) ? new Date() : parsedRecordedAt;

  if (payloadLabs.length === 0) {
    return res.status(400).json({ error: 'At least one lab snapshot is required.' });
  }

  const snapshots = payloadLabs
    .map((snapshot) => ({
      labCode: String(snapshot.id || snapshot.labId || '').trim(),
      temperature: toFiniteNumberOrNull(snapshot.temperature),
      humidity: toFiniteNumberOrNull(snapshot.humidity),
      co2Level: toFiniteNumberOrNull(snapshot.co2Level),
      lightLevel: toFiniteNumberOrNull(snapshot.lightLevel),
      presenceDetected: snapshot.presenceDetected == null ? null : Boolean(snapshot.presenceDetected),
    }))
    .filter((snapshot) => snapshot.labCode.length > 0);

  if (snapshots.length === 0) {
    return res.status(400).json({ error: 'No valid lab snapshots were provided.' });
  }

  await executeInTransaction(async (requestFactory) => {
    for (const snapshot of snapshots) {
      const request = requestFactory();
      request.input('labCode', sql.VarChar(30), snapshot.labCode);
      request.input('recordedAt', sql.DateTime2, recordedAt);
      request.input('temperature', sql.Decimal(5, 2), snapshot.temperature);
      request.input('humidity', sql.Decimal(5, 2), snapshot.humidity);
      request.input('co2Level', sql.Decimal(8, 2), snapshot.co2Level);
      request.input('lightLevel', sql.Decimal(8, 2), snapshot.lightLevel);
      request.input('presenceDetected', sql.Bit, snapshot.presenceDetected == null ? null : (snapshot.presenceDetected ? 1 : 0));

      await request.query(
        `INSERT INTO smartlab.TelemetryReading (LabId, RecordedAt, Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
        SELECT l.LabId, @recordedAt, @temperature, @humidity, @co2Level, @lightLevel, @presenceDetected
         FROM smartlab.Lab l
         WHERE l.LabCode = @labCode;

         UPDATE l
         SET l.Temperature = COALESCE(@temperature, l.Temperature),
             l.Humidity = COALESCE(@humidity, l.Humidity),
             l.Co2Level = COALESCE(@co2Level, l.Co2Level),
             l.LightLevel = COALESCE(@lightLevel, l.LightLevel),
             l.PresenceDetected = COALESCE(@presenceDetected, l.PresenceDetected),
             l.UpdatedAt = SYSUTCDATETIME()
         FROM smartlab.Lab l
         WHERE l.LabCode = @labCode`,
      );
    }
  });

  res.json({ ok: true, recordedAt: recordedAt.toISOString(), count: snapshots.length });
});

app.get('/api/telemetry/history', async (req, res) => {
  const labId = String(req.query.labId || '').trim();
  const minutes = Math.max(1, Math.min(12 * 60, Number(req.query.minutes || 60)));

  if (!labId) {
    return res.status(400).json({ error: 'labId is required.' });
  }

  const rows = await query(
    `SELECT tr.RecordedAt, tr.Temperature, tr.Humidity, tr.Co2Level, tr.LightLevel, tr.PresenceDetected
     FROM smartlab.TelemetryReading tr
     INNER JOIN smartlab.Lab l ON l.LabId = tr.LabId
     WHERE l.LabCode = @labCode
       AND tr.RecordedAt >= DATEADD(MINUTE, -@minutes, SYSUTCDATETIME())
     ORDER BY tr.RecordedAt DESC`,
    { labCode: labId, minutes },
  );

  res.json(
    rows.map((row) => ({
      presenceDetected: Boolean(row.PresenceDetected),
      recordedAt: new Date(row.RecordedAt).toISOString(),
      temperature: Number(row.Temperature ?? 0),
      humidity: Number(row.Humidity ?? 0),
      co2Level: Number(row.Co2Level ?? 0),
      lightLevel: Number(row.LightLevel ?? 0),
    })),
  );
});

app.get('/api/recommendations', async (req, res) => {
  const labId = String(req.query.labId || '').trim();
  const params = {};
  let whereClause = '';

  if (labId) {
    whereClause = 'WHERE l.LabCode = @labCode';
    params.labCode = labId;
  }

  const rows = await query(
    `SELECT rec.RecommendationCode, rec.[Message], rec.[Status], rec.CreatedAt,
            l.LabCode,
            stu.DisplayName AS StudentName,
            ins.DisplayName AS InstructorName
     FROM smartlab.LabRecommendation rec
     INNER JOIN smartlab.Lab l ON l.LabId = rec.LabId
     INNER JOIN smartlab.[User] stu ON stu.UserId = rec.StudentUserId
     INNER JOIN smartlab.[User] ins ON ins.UserId = rec.InstructorUserId
     ${whereClause}
     ORDER BY rec.CreatedAt DESC`,
    params,
  );

  res.json(
    rows.map((row) => ({
      id: row.RecommendationCode,
      labId: row.LabCode,
      message: row.Message,
      status: row.Status,
      createdAt: new Date(row.CreatedAt).toISOString(),
      studentName: row.StudentName,
      instructorName: row.InstructorName,
    })),
  );
});

app.post('/api/recommendations', async (req, res) => {
  const labId = String(req.body?.labId || '').trim();
  const message = String(req.body?.message || '').trim();
  const studentUserId = Number(req.body?.studentUserId);

  if (!labId || !message || !studentUserId) {
    return res.status(400).json({ error: 'labId, message and studentUserId are required.' });
  }

  const studentRows = await query(
    `SELECT u.UserId
     FROM smartlab.[User] u
     INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
     WHERE u.UserId = @studentUserId AND u.DeletedAt IS NULL AND r.RoleCode = 'STUDENT'`,
    { studentUserId },
  );

  if (!studentRows[0]) {
    return res.status(403).json({ error: 'Only students can send recommendations.' });
  }

  const instructorRows = await query(
    `SELECT TOP 1 u.UserId
     FROM smartlab.UserLabAssignment ula
     INNER JOIN smartlab.Lab l ON l.LabId = ula.LabId
     INNER JOIN smartlab.[User] u ON u.UserId = ula.UserId
     INNER JOIN smartlab.[Role] r ON r.RoleId = u.RoleId
     WHERE l.LabCode = @labCode
       AND r.RoleCode = 'INSTRUCTOR'
       AND u.DeletedAt IS NULL`,
    { labCode: labId },
  );

  const instructorUserId = instructorRows[0]?.UserId;
  if (!instructorUserId) {
    return res.status(404).json({ error: 'No instructor is currently assigned to this lab.' });
  }

  const recommendationCode = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO smartlab.LabRecommendation (RecommendationCode, LabId, StudentUserId, InstructorUserId, [Message])
     SELECT @recommendationCode, l.LabId, @studentUserId, @instructorUserId, @message
     FROM smartlab.Lab l
     WHERE l.LabCode = @labCode`,
    { recommendationCode, labCode: labId, studentUserId, instructorUserId, message },
  );

  res.status(201).json({ ok: true, id: recommendationCode });
});

app.patch('/api/recommendations/:recommendationId/status', async (req, res) => {
  const recommendationId = String(req.params.recommendationId || '').trim();
  const status = String(req.body?.status || '').trim().toLowerCase();

  if (!recommendationId) {
    return res.status(400).json({ error: 'recommendationId is required.' });
  }

  if (!['reviewed', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'status must be reviewed or dismissed.' });
  }

  const result = await query(
    `UPDATE smartlab.LabRecommendation
     SET [Status] = @status
     WHERE RecommendationCode = @recommendationId;

     SELECT RecommendationCode
     FROM smartlab.LabRecommendation
     WHERE RecommendationCode = @recommendationId`,
    { recommendationId, status },
  );

  if (!result[0]) {
    return res.status(404).json({ error: 'Recommendation not found.' });
  }

  res.json({ ok: true, id: recommendationId, status });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
});

app.listen(PORT, () => {
  console.log(`SmartLab API running on http://localhost:${PORT}`);
});
