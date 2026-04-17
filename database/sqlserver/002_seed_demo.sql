SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Smart Lab Dashboard - SQL Server Demo Seed v1
-- Requires: 001_schema.sql

MERGE smartlab.[Role] AS target
USING (VALUES
    (1, 'ADMIN', 'Administrator'),
    (2, 'TECHNICIAN', 'Technician'),
  (3, 'STUDENT', 'Student'),
  (4, 'INSTRUCTOR', 'Instructor')
) AS source (RoleId, RoleCode, RoleName)
ON target.RoleId = source.RoleId
WHEN MATCHED THEN
    UPDATE SET RoleCode = source.RoleCode, RoleName = source.RoleName
WHEN NOT MATCHED THEN
    INSERT (RoleId, RoleCode, RoleName)
    VALUES (source.RoleId, source.RoleCode, source.RoleName);
GO

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'admin', 'admin@smartlab.local', 'admin123', 'System Admin', 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'admin');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'manager', 'manager@smartlab.local', 'manager123', 'Lab Manager 1', 2, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'manager');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'manager2', 'manager2@smartlab.local', 'manager123', 'Lab Manager 2', 2, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'manager2');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'tech', 'tech@smartlab.local', 'tech123', 'Global Technician', 2, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'tech');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'student', 'student@smartlab.local', 'student123', 'Guest Student', 3, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'student');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'student2', 'student2@smartlab.local', 'student123', 'Student Nguyen', 3, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'student2');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'instructor1', 'instructor1@smartlab.local', 'instructor123', 'Dr. Lan Instructor', 4, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'instructor1');

UPDATE smartlab.[User]
SET PasswordHash = 'admin123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'admin';

UPDATE smartlab.[User]
SET PasswordHash = 'manager123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'manager';

UPDATE smartlab.[User]
SET PasswordHash = 'manager123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'manager2';

UPDATE smartlab.[User]
SET PasswordHash = 'tech123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'tech';

UPDATE smartlab.[User]
SET PasswordHash = 'student123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'student';

UPDATE smartlab.[User]
SET PasswordHash = 'student123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'student2';

UPDATE smartlab.[User]
SET PasswordHash = 'instructor123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'instructor1';
GO

-- Lab A is prepared for real telemetry onboarding: no prefilled demo sensor values.
INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-01', 'Chemistry Lab A', 'warning', NULL, NULL, NULL, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-01');

-- Keep reseeds consistent even when lab-01 already exists from older demo data.
UPDATE smartlab.Lab
SET [Status] = 'warning',
    Temperature = NULL,
    Humidity = NULL,
    Co2Level = NULL,
    LightLevel = NULL,
    PresenceDetected = 0,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-01';

-- Clear all Lab A operational data so live sensor onboarding starts from a clean state.
DECLARE @Lab01Id BIGINT = (
  SELECT LabId
  FROM smartlab.Lab
  WHERE LabCode = 'lab-01'
);

IF @Lab01Id IS NOT NULL
BEGIN
  UPDATE smartlab.Equipment
  SET DeletedAt = SYSUTCDATETIME(),
    UpdatedAt = SYSUTCDATETIME()
  WHERE LabId = @Lab01Id;

  UPDATE smartlab.IoTDevice
  SET DeletedAt = SYSUTCDATETIME(),
    UpdatedAt = SYSUTCDATETIME()
  WHERE LabId = @Lab01Id;

  UPDATE smartlab.Actuator
  SET DeletedAt = SYSUTCDATETIME(),
    UpdatedAt = SYSUTCDATETIME()
  WHERE LabId = @Lab01Id;

  UPDATE smartlab.Alert
  SET DeletedAt = SYSUTCDATETIME()
  WHERE LabId = @Lab01Id;

  DELETE FROM smartlab.AutomatedAction
  WHERE LabId = @Lab01Id;

  DELETE FROM smartlab.TelemetryReading
  WHERE LabId = @Lab01Id;

  DELETE FROM smartlab.DataChangeLog
  WHERE LabId = @Lab01Id;
END

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-02', 'Biology Lab B', 'warning', 24.8, 62, 580, 720, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-02');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-03', 'Physics Lab C', 'optimal', 21.2, 40, 400, 880, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-03');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-04', 'Computer Lab D', 'critical', 27.5, 38, 720, 600, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-04');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-05', 'Materials Lab E', 'optimal', 23.1, 47, 430, 710, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-05');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-06', 'Electronics Lab F', 'warning', 25.2, 58, 910, 760, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-06');
GO

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
INNER JOIN smartlab.Lab l ON l.LabCode IN ('lab-01', 'lab-02', 'lab-03')
WHERE u.Username = 'manager'
  AND NOT EXISTS (
      SELECT 1 FROM smartlab.UserLabAssignment x
      WHERE x.UserId = u.UserId AND x.LabId = l.LabId
  );

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
INNER JOIN smartlab.Lab l ON l.LabCode IN ('lab-04', 'lab-05', 'lab-06')
WHERE u.Username = 'manager2'
  AND NOT EXISTS (
      SELECT 1 FROM smartlab.UserLabAssignment x
      WHERE x.UserId = u.UserId AND x.LabId = l.LabId
  );

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
CROSS JOIN smartlab.Lab l
WHERE u.Username = 'tech'
  AND NOT EXISTS (
      SELECT 1 FROM smartlab.UserLabAssignment x
      WHERE x.UserId = u.UserId AND x.LabId = l.LabId
  );

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
INNER JOIN smartlab.Lab l ON l.LabCode IN ('lab-02', 'lab-03')
WHERE u.Username = 'instructor1'
  AND NOT EXISTS (
      SELECT 1 FROM smartlab.UserLabAssignment x
      WHERE x.UserId = u.UserId AND x.LabId = l.LabId
  );
GO

DELETE t
FROM smartlab.ThresholdConfig t
INNER JOIN smartlab.Lab l ON l.LabId = t.LabId
WHERE l.LabCode = 'lab-01';
GO

-- Mock operational data for validation (idempotent).
DECLARE @Lab02Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-02' AND DeletedAt IS NULL);
DECLARE @Lab03Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-03' AND DeletedAt IS NULL);
DECLARE @TechUserId BIGINT = (SELECT TOP 1 UserId FROM smartlab.[User] WHERE Username = 'tech' AND DeletedAt IS NULL);
DECLARE @StudentUserId BIGINT = (SELECT TOP 1 UserId FROM smartlab.[User] WHERE Username = 'student2' AND DeletedAt IS NULL);
DECLARE @InstructorUserId BIGINT = (SELECT TOP 1 UserId FROM smartlab.[User] WHERE Username = 'instructor1' AND DeletedAt IS NULL);

IF @Lab02Id IS NULL OR @Lab03Id IS NULL OR @TechUserId IS NULL OR @StudentUserId IS NULL OR @InstructorUserId IS NULL
BEGIN
  PRINT 'Mock operational data skipped: required labs/users are missing.';
END
ELSE
BEGIN
  IF NOT EXISTS (SELECT 1 FROM smartlab.ThresholdConfig)
  BEGIN
    INSERT INTO smartlab.ThresholdConfig (
      LabId,
      TemperatureMin, TemperatureMax, TemperatureWarningMin, TemperatureWarningMax,
      HumidityMin, HumidityMax, HumidityWarningMin, HumidityWarningMax,
      Co2Max, Co2WarningMax,
      LightLevelMin, LightLevelMax,
      UpdatedByUserId
    )
    VALUES
      (@Lab02Id, 18, 26, 20, 24, 35, 65, 40, 60, 1000, 800, 300, 1200, @TechUserId),
      (@Lab03Id, 18, 25, 20, 23, 30, 60, 35, 55, 900, 700, 350, 1100, @TechUserId);
  END

  INSERT INTO smartlab.Equipment (
    LabId, EquipmentCode, EquipmentName, [Status], [Mode], IsEssential,
    LastMaintenanceAt, CumulativeRuntimeHours, LastRuntimeUpdateAt
  )
  SELECT @Lab02Id, 'EQ-L2-001', N'Incubator A', 'online', 'auto', 1,
       DATEADD(DAY, -30, SYSUTCDATETIME()), 124.5, SYSUTCDATETIME()
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Equipment WHERE EquipmentCode = 'EQ-L2-001' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab02Id, 'EQ-L2-002', N'Microscope A', 'maintenance', 'manual', 0,
       DATEADD(DAY, -7, SYSUTCDATETIME()), 42.0, SYSUTCDATETIME()
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Equipment WHERE EquipmentCode = 'EQ-L2-002' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab03Id, 'EQ-L3-001', N'Oscilloscope A', 'online', 'manual', 0,
       DATEADD(DAY, -14, SYSUTCDATETIME()), 210.0, SYSUTCDATETIME()
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Equipment WHERE EquipmentCode = 'EQ-L3-001' AND DeletedAt IS NULL);

  INSERT INTO smartlab.IoTDevice (
    LabId, DeviceCode, DeviceName, DeviceType, [Status], InstalledAt,
    EstimatedMaintenanceHours, LastSeenAt, SignalStrength, BatteryLevel,
    FirmwareVersion, DataRate, [Location]
  )
  SELECT @Lab02Id, 'IOT-L2-TEMP', N'Temp Sensor L2', 'sensor', 'online', DATEADD(DAY, -90, SYSUTCDATETIME()),
       2000, SYSUTCDATETIME(), 92, 88, '1.2.0', 6.0, N'Ceiling'
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.IoTDevice WHERE DeviceCode = 'IOT-L2-TEMP' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab02Id, 'IOT-L2-PRES', N'Presence Sensor L2', 'sensor', 'online', DATEADD(DAY, -60, SYSUTCDATETIME()),
       1500, SYSUTCDATETIME(), 85, 72, '1.1.4', 2.0, N'Doorway'
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.IoTDevice WHERE DeviceCode = 'IOT-L2-PRES' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab03Id, 'IOT-L3-AIR', N'Air Sensor L3', 'sensor', 'warning', DATEADD(DAY, -120, SYSUTCDATETIME()),
       2200, DATEADD(MINUTE, -2, SYSUTCDATETIME()), 76, NULL, '1.0.9', 1.0, N'Wall'
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.IoTDevice WHERE DeviceCode = 'IOT-L3-AIR' AND DeletedAt IS NULL);

  INSERT INTO smartlab.Actuator (
    LabId, ActuatorCode, ActuatorName, ActuatorType, [Status], [Mode], LastActivatedAt
  )
  SELECT @Lab02Id, 'ACT-L2-HVAC', N'HVAC L2', 'hvac', 'auto', 'auto', DATEADD(MINUTE, -15, SYSUTCDATETIME())
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Actuator WHERE ActuatorCode = 'ACT-L2-HVAC' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab03Id, 'ACT-L3-LIGHT', N'Lighting L3', 'lighting', 'on', 'manual', DATEADD(HOUR, -1, SYSUTCDATETIME())
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Actuator WHERE ActuatorCode = 'ACT-L3-LIGHT' AND DeletedAt IS NULL);

  INSERT INTO smartlab.Alert (
    LabId, AlertCode, AlertType, Severity, [Message], ReasonCode, [Timestamp],
    IsAcknowledged, AcknowledgedByUserId, AcknowledgedAt, AutoResolved
  )
  SELECT @Lab02Id, 'ALT-L2-001', 'warning', 'medium', N'Humidity above warning range', 'HUMIDITY_HIGH', DATEADD(MINUTE, -20, SYSUTCDATETIME()),
       0, NULL, NULL, 0
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Alert WHERE AlertCode = 'ALT-L2-001' AND DeletedAt IS NULL)
  UNION ALL
  SELECT @Lab03Id, 'ALT-L3-001', 'info', 'low', N'Air sensor transient warning resolved', 'AIR_TRANSIENT', DATEADD(HOUR, -2, SYSUTCDATETIME()),
       1, @TechUserId, DATEADD(HOUR, -1, SYSUTCDATETIME()), 1
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.Alert WHERE AlertCode = 'ALT-L3-001' AND DeletedAt IS NULL);

  INSERT INTO smartlab.AutomatedAction (
    ActionCode, LabId, AlertId, ActuatorId, [Timestamp], TriggerDescription, ActionDescription, [Success], ReasonCode
  )
  SELECT 'AUTO-L2-001',
       @Lab02Id,
       (SELECT TOP 1 AlertId FROM smartlab.Alert WHERE AlertCode = 'ALT-L2-001' AND DeletedAt IS NULL),
       (SELECT TOP 1 ActuatorId FROM smartlab.Actuator WHERE ActuatorCode = 'ACT-L2-HVAC' AND DeletedAt IS NULL),
       DATEADD(MINUTE, -18, SYSUTCDATETIME()),
       N'Humidity warning trigger',
       N'Set HVAC to automatic dehumidification profile',
       1,
       'AUTO_HUMIDITY_CTRL'
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.AutomatedAction WHERE ActionCode = 'AUTO-L2-001');

  INSERT INTO smartlab.DataChangeLog (
    LabId, ChangedByUserId, ChangeType, FieldName, OldValue, NewValue, Description, ChangedAt
  )
  SELECT @Lab02Id, @TechUserId, 'presence', N'PresenceDetected', N'0', N'1', N'Mock validation: presence detected in lab-02', '2026-04-01T08:00:00'
  WHERE NOT EXISTS (
    SELECT 1 FROM smartlab.DataChangeLog
    WHERE LabId = @Lab02Id AND FieldName = N'PresenceDetected' AND ChangedAt = '2026-04-01T08:00:00'
  )
  UNION ALL
  SELECT @Lab02Id, @TechUserId, 'temperature', N'Temperature', N'23.9', N'24.8', N'Mock validation: adjusted temperature baseline for lab-02', '2026-04-01T08:10:00'
  WHERE NOT EXISTS (
    SELECT 1 FROM smartlab.DataChangeLog
    WHERE LabId = @Lab02Id AND FieldName = N'Temperature' AND ChangedAt = '2026-04-01T08:10:00'
  );

  INSERT INTO smartlab.TelemetryReading (
    LabId, RecordedAt, Temperature, Humidity, Co2Level, LightLevel, PresenceDetected
  )
  SELECT @Lab02Id, '2026-04-01T08:00:00', 24.1, 58.0, 560.0, 700.0, 1
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.TelemetryReading WHERE LabId = @Lab02Id AND RecordedAt = '2026-04-01T08:00:00')
  UNION ALL
  SELECT @Lab02Id, '2026-04-01T08:10:00', 24.6, 61.0, 575.0, 710.0, 1
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.TelemetryReading WHERE LabId = @Lab02Id AND RecordedAt = '2026-04-01T08:10:00')
  UNION ALL
  SELECT @Lab03Id, '2026-04-01T08:20:00', 21.3, 41.0, 405.0, 885.0, 0
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.TelemetryReading WHERE LabId = @Lab03Id AND RecordedAt = '2026-04-01T08:20:00');

  INSERT INTO smartlab.LabRecommendation (
    RecommendationCode, LabId, StudentUserId, InstructorUserId, [Message], [Status]
  )
  SELECT 'REC-L2-001', @Lab02Id, @StudentUserId, @InstructorUserId,
       N'Please review humidity fluctuations during peak hours.', 'pending'
  WHERE NOT EXISTS (SELECT 1 FROM smartlab.LabRecommendation WHERE RecommendationCode = 'REC-L2-001');

  MERGE smartlab.SystemSetting AS target
  USING (
    VALUES
      ('telemetry.snapshot.interval.seconds', N'10', 'number', @TechUserId),
      ('alerts.autoResolve.enabled', N'true', 'boolean', @TechUserId),
      ('ui.defaultLabView', N'dashboard', 'string', @TechUserId)
  ) AS source (SettingKey, SettingValue, ValueType, UpdatedByUserId)
  ON target.SettingKey = source.SettingKey
  WHEN MATCHED THEN
    UPDATE SET
      target.SettingValue = source.SettingValue,
      target.ValueType = source.ValueType,
      target.UpdatedByUserId = source.UpdatedByUserId,
      target.UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (SettingKey, SettingValue, ValueType, UpdatedByUserId)
    VALUES (source.SettingKey, source.SettingValue, source.ValueType, source.UpdatedByUserId);

  PRINT 'Mock operational data seeded/updated.';
END
GO
