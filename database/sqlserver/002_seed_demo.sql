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
SELECT 'tech', 'tech@smartlab.local', 'tech123', 'Global Technician', 2, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'tech');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'student', 'student@smartlab.local', 'student123', 'Guest Student', 3, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'student');

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'instructor1', 'instructor1@smartlab.local', 'instructor123', 'Dr. Lan Instructor', 4, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'instructor1');

UPDATE smartlab.[User]
SET PasswordHash = 'admin123',
    AccountStatus = 'active',
    UpdatedAt = SYSUTCDATETIME()
WHERE Username = 'admin';

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
SELECT 'lab-05', 'Research Lab E', 'optimal', 22.0, 48, 450, 550, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-05');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, PresenceDetected)
SELECT 'lab-06', 'Materials Lab F', 'warning', 23.5, 55, 520, 920, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-06');

UPDATE smartlab.Lab
SET LabName = 'Biology Lab B',
    [Status] = 'warning',
    Temperature = 24.8,
    Humidity = 62,
    Co2Level = 580,
    LightLevel = 720,
    PresenceDetected = 1,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-02';

UPDATE smartlab.Lab
SET LabName = 'Physics Lab C',
    [Status] = 'optimal',
    Temperature = 21.2,
    Humidity = 40,
    Co2Level = 400,
    LightLevel = 880,
    PresenceDetected = 1,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-03';

UPDATE smartlab.Lab
SET LabName = 'Computer Lab D',
    [Status] = 'critical',
    Temperature = 27.5,
    Humidity = 38,
    Co2Level = 720,
    LightLevel = 600,
    PresenceDetected = 1,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-04';

UPDATE smartlab.Lab
SET LabName = 'Research Lab E',
    [Status] = 'optimal',
    Temperature = 22.0,
    Humidity = 48,
    Co2Level = 450,
    LightLevel = 550,
    PresenceDetected = 1,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-05';

UPDATE smartlab.Lab
SET LabName = 'Materials Lab F',
    [Status] = 'warning',
    Temperature = 23.5,
    Humidity = 55,
    Co2Level = 520,
    LightLevel = 920,
    PresenceDetected = 1,
    UpdatedAt = SYSUTCDATETIME()
WHERE LabCode = 'lab-06';
GO

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
INNER JOIN smartlab.Lab l ON l.LabCode IN ('lab-01', 'lab-02', 'lab-03', 'lab-04', 'lab-05', 'lab-06')
WHERE u.Username = 'tech'
  AND NOT EXISTS (
      SELECT 1 FROM smartlab.UserLabAssignment x
      WHERE x.UserId = u.UserId AND x.LabId = l.LabId
  );

INSERT INTO smartlab.UserLabAssignment (UserId, LabId)
SELECT u.UserId, l.LabId
FROM smartlab.[User] u
CROSS JOIN smartlab.Lab l
WHERE u.Username = 'admin'
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

-- App-aligned operational mock data (mirrors src/app/data/labData.ts).
DECLARE @Lab01Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-01' AND DeletedAt IS NULL);
DECLARE @Lab02Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-02' AND DeletedAt IS NULL);
DECLARE @Lab03Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-03' AND DeletedAt IS NULL);
DECLARE @Lab04Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-04' AND DeletedAt IS NULL);
DECLARE @Lab05Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-05' AND DeletedAt IS NULL);
DECLARE @Lab06Id BIGINT = (SELECT TOP 1 LabId FROM smartlab.Lab WHERE LabCode = 'lab-06' AND DeletedAt IS NULL);
DECLARE @TechUserId BIGINT = (SELECT TOP 1 UserId FROM smartlab.[User] WHERE Username = 'tech' AND DeletedAt IS NULL);

INSERT INTO smartlab.[User] (Username, Email, PasswordHash, DisplayName, RoleId, AccountStatus)
SELECT 'emily', 'emily@smartlab.local', 'emily123', 'Emily Watson', 2, 'active'
WHERE NOT EXISTS (SELECT 1 FROM smartlab.[User] WHERE Username = 'emily');

DECLARE @EmilyUserId BIGINT = (SELECT TOP 1 UserId FROM smartlab.[User] WHERE Username = 'emily' AND DeletedAt IS NULL);

IF @Lab01Id IS NULL OR @Lab02Id IS NULL OR @Lab03Id IS NULL OR @Lab04Id IS NULL OR @Lab05Id IS NULL OR @Lab06Id IS NULL OR @TechUserId IS NULL
BEGIN
  PRINT 'App-aligned mock data skipped: required labs/users are missing.';
END
ELSE
BEGIN
  -- Keep threshold config aligned with app defaults.
  MERGE smartlab.ThresholdConfig AS t
  USING (
    SELECT @Lab01Id AS LabId, 18.0 AS TemperatureMin, 24.0 AS TemperatureMax, 20.0 AS TemperatureWarningMin, 23.0 AS TemperatureWarningMax, 30.0 AS HumidityMin, 60.0 AS HumidityMax, 35.0 AS HumidityWarningMin, 55.0 AS HumidityWarningMax, 1000.0 AS Co2Max, 800.0 AS Co2WarningMax, 300.0 AS LightLevelMin, 1000.0 AS LightLevelMax
    UNION ALL SELECT @Lab02Id, 20.0, 25.0, 21.0, 24.0, 40.0, 60.0, 42.0, 58.0, 1000.0, 800.0, 400.0, 1000.0
    UNION ALL SELECT @Lab03Id, 18.0, 24.0, 20.0, 23.0, 30.0, 50.0, 35.0, 45.0, 1000.0, 800.0, 500.0, 1200.0
    UNION ALL SELECT @Lab04Id, 18.0, 22.0, 19.0, 21.0, 35.0, 50.0, 38.0, 48.0, 1000.0, 800.0, 400.0, 1000.0
    UNION ALL SELECT @Lab05Id, 20.0, 24.0, 21.0, 23.0, 40.0, 55.0, 42.0, 52.0, 1000.0, 800.0, 350.0, 900.0
    UNION ALL SELECT @Lab06Id, 19.0, 26.0, 20.0, 25.0, 35.0, 65.0, 40.0, 60.0, 1200.0, 1000.0, 500.0, 1500.0
  ) AS s
  ON t.LabId = s.LabId
  WHEN MATCHED THEN
    UPDATE SET
      TemperatureMin = s.TemperatureMin,
      TemperatureMax = s.TemperatureMax,
      TemperatureWarningMin = s.TemperatureWarningMin,
      TemperatureWarningMax = s.TemperatureWarningMax,
      HumidityMin = s.HumidityMin,
      HumidityMax = s.HumidityMax,
      HumidityWarningMin = s.HumidityWarningMin,
      HumidityWarningMax = s.HumidityWarningMax,
      Co2Max = s.Co2Max,
      Co2WarningMax = s.Co2WarningMax,
      LightLevelMin = s.LightLevelMin,
      LightLevelMax = s.LightLevelMax,
      UpdatedByUserId = @TechUserId,
      UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (LabId, TemperatureMin, TemperatureMax, TemperatureWarningMin, TemperatureWarningMax, HumidityMin, HumidityMax, HumidityWarningMin, HumidityWarningMax, Co2Max, Co2WarningMax, LightLevelMin, LightLevelMax, UpdatedByUserId)
    VALUES (s.LabId, s.TemperatureMin, s.TemperatureMax, s.TemperatureWarningMin, s.TemperatureWarningMax, s.HumidityMin, s.HumidityMax, s.HumidityWarningMin, s.HumidityWarningMax, s.Co2Max, s.Co2WarningMax, s.LightLevelMin, s.LightLevelMax, @TechUserId);

  -- Reset dynamic data for labs 02-06 so reseeding matches app mock arrays exactly.
  UPDATE e SET e.DeletedAt = SYSUTCDATETIME(), e.UpdatedAt = SYSUTCDATETIME()
  FROM smartlab.Equipment e
  WHERE e.LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);

  UPDATE d SET d.DeletedAt = SYSUTCDATETIME(), d.UpdatedAt = SYSUTCDATETIME()
  FROM smartlab.IoTDevice d
  WHERE d.LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);

  UPDATE a SET a.DeletedAt = SYSUTCDATETIME(), a.UpdatedAt = SYSUTCDATETIME()
  FROM smartlab.Actuator a
  WHERE a.LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);

  UPDATE al SET al.DeletedAt = SYSUTCDATETIME()
  FROM smartlab.Alert al
  WHERE al.LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);

  DELETE FROM smartlab.AutomatedAction WHERE LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);
  DELETE FROM smartlab.TelemetryReading WHERE LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);
  DELETE FROM smartlab.DataChangeLog WHERE LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);
  DELETE FROM smartlab.LabRecommendation WHERE LabId IN (@Lab02Id, @Lab03Id, @Lab04Id, @Lab05Id, @Lab06Id);

  INSERT INTO smartlab.Equipment (LabId, EquipmentCode, EquipmentName, [Status], [Mode], IsEssential, LastMaintenanceAt, CumulativeRuntimeHours, LastRuntimeUpdateAt)
  VALUES
    (@Lab02Id, 'eq-05', N'Incubator 1', 'online', 'auto', 1, '2026-02-01', 0, SYSUTCDATETIME()),
    (@Lab02Id, 'eq-06', N'Incubator 2', 'online', 'auto', 1, '2026-02-01', 0, SYSUTCDATETIME()),
    (@Lab02Id, 'eq-07', N'PCR Machine', 'online', 'manual', 0, '2026-01-25', 0, SYSUTCDATETIME()),
    (@Lab02Id, 'eq-08', N'Microscope', 'offline', 'manual', 0, '2026-01-10', 0, SYSUTCDATETIME()),
    (@Lab03Id, 'eq-09', N'Oscilloscope 1', 'online', 'manual', 0, '2026-02-20', 0, SYSUTCDATETIME()),
    (@Lab03Id, 'eq-10', N'Oscilloscope 2', 'online', 'manual', 0, '2026-02-20', 0, SYSUTCDATETIME()),
    (@Lab03Id, 'eq-11', N'Signal Generator', 'online', 'manual', 0, '2026-02-18', 0, SYSUTCDATETIME()),
    (@Lab04Id, 'eq-12', N'Server Rack 1', 'online', 'auto', 1, '2026-02-10', 0, SYSUTCDATETIME()),
    (@Lab04Id, 'eq-13', N'Server Rack 2', 'online', 'auto', 1, '2026-02-10', 0, SYSUTCDATETIME()),
    (@Lab04Id, 'eq-14', N'HVAC System', 'maintenance', 'manual', 1, '2026-02-25', 0, SYSUTCDATETIME()),
    (@Lab05Id, 'eq-15', N'Spectrometer', 'online', 'manual', 1, '2026-02-22', 0, SYSUTCDATETIME()),
    (@Lab05Id, 'eq-16', N'Chromatograph', 'online', 'manual', 1, '2026-02-20', 0, SYSUTCDATETIME()),
    (@Lab06Id, 'eq-17', N'3D Printer 1', 'online', 'manual', 0, '2026-02-12', 0, SYSUTCDATETIME()),
    (@Lab06Id, 'eq-18', N'3D Printer 2', 'online', 'manual', 0, '2026-02-12', 0, SYSUTCDATETIME()),
    (@Lab06Id, 'eq-19', N'CNC Machine', 'maintenance', 'manual', 0, '2026-02-08', 0, SYSUTCDATETIME()),
    (@Lab06Id, 'eq-20', N'Laser Cutter', 'online', 'manual', 0, '2026-02-15', 0, SYSUTCDATETIME());

  INSERT INTO smartlab.IoTDevice (LabId, DeviceCode, DeviceName, DeviceType, [Status], InstalledAt, EstimatedMaintenanceHours, LastSeenAt, SignalStrength, BatteryLevel, FirmwareVersion, DataRate, [Location])
  VALUES
    (@Lab02Id, 'iot-06', N'Temp/Humidity Combo', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 87, NULL, '2.0.1', 6, N'Ceiling'),
    (@Lab02Id, 'iot-07', N'CO2 Monitor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 91, NULL, '1.9.2', 2, N'Wall'),
    (@Lab02Id, 'iot-08', N'Presence Sensor', 'sensor', 'warning', NULL, NULL, DATEADD(MINUTE, -3, SYSUTCDATETIME()), 65, 25, '1.4.8', 1, N'Ceiling'),
    (@Lab02Id, 'iot-09', N'Light Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 93, NULL, '1.7.0', 4, N'Window'),
    (@Lab03Id, 'iot-10', N'Environmental Monitor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 98, NULL, '3.0.0', 10, N'Central'),
    (@Lab03Id, 'iot-11', N'Presence Detector', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 94, 92, '1.5.0', 1, N'Entrance'),
    (@Lab03Id, 'iot-12', N'Gateway Hub', 'gateway', 'online', NULL, NULL, SYSUTCDATETIME(), 100, NULL, '3.2.1', 25, N'Server Closet'),
    (@Lab04Id, 'iot-13', N'Precision Temp Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 96, NULL, '2.1.5', 12, N'Server Rack 1'),
    (@Lab04Id, 'iot-14', N'Backup Temp Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 94, NULL, '2.1.5', 12, N'Server Rack 2'),
    (@Lab04Id, 'iot-15', N'Air Quality Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 89, NULL, '1.9.2', 2, N'Ceiling'),
    (@Lab04Id, 'iot-16', N'HVAC Controller', 'actuator', 'error', NULL, NULL, DATEADD(MINUTE, -5, SYSUTCDATETIME()), 45, NULL, '2.3.1', 0, N'Mechanical Room'),
    (@Lab05Id, 'iot-17', N'Climate Monitor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 99, NULL, '3.0.0', 10, N'Ceiling'),
    (@Lab05Id, 'iot-18', N'Motion Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 96, 78, '1.5.0', 1, N'Corner'),
    (@Lab05Id, 'iot-19', N'Edge Gateway', 'gateway', 'online', NULL, NULL, SYSUTCDATETIME(), 100, NULL, '3.3.0', 20, N'Wall Mount'),
    (@Lab06Id, 'iot-20', N'Combo Sensor 1', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 90, NULL, '2.0.1', 6, N'Zone A'),
    (@Lab06Id, 'iot-21', N'Combo Sensor 2', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 88, NULL, '2.0.1', 6, N'Zone B'),
    (@Lab06Id, 'iot-22', N'Air Quality Monitor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 85, NULL, '1.9.5', 2, N'Center'),
    (@Lab06Id, 'iot-23', N'Presence Sensor', 'sensor', 'online', NULL, NULL, SYSUTCDATETIME(), 92, 68, '1.6.2', 1, N'Doorway');

  INSERT INTO smartlab.Actuator (LabId, ActuatorCode, ActuatorName, ActuatorType, [Status], [Mode], LastActivatedAt)
  VALUES
    (@Lab02Id, 'act-04', N'Climate Control', 'hvac', 'auto', 'auto', DATEADD(MINUTE, -30, SYSUTCDATETIME())),
    (@Lab02Id, 'act-05', N'Ventilation Fan', 'ventilation', 'on', 'auto', DATEADD(MINUTE, -10, SYSUTCDATETIME())),
    (@Lab02Id, 'act-06', N'Smart Lighting', 'lighting', 'on', 'auto', DATEADD(HOUR, -3, SYSUTCDATETIME())),
    (@Lab03Id, 'act-07', N'Air Handler', 'hvac', 'auto', 'auto', NULL),
    (@Lab03Id, 'act-08', N'Lab Lighting', 'lighting', 'on', 'manual', DATEADD(HOUR, -4, SYSUTCDATETIME())),
    (@Lab04Id, 'act-09', N'Primary HVAC', 'hvac', 'off', 'manual', NULL),
    (@Lab04Id, 'act-10', N'Emergency Exhaust', 'exhaust_fan', 'on', 'auto', DATEADD(MINUTE, -3, SYSUTCDATETIME())),
    (@Lab04Id, 'act-11', N'Ceiling Fans', 'ventilation', 'on', 'manual', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
    (@Lab05Id, 'act-12', N'Climate System', 'hvac', 'auto', 'auto', DATEADD(MINUTE, -90, SYSUTCDATETIME())),
    (@Lab05Id, 'act-13', N'Task Lighting', 'lighting', 'on', 'manual', DATEADD(MINUTE, -150, SYSUTCDATETIME())),
    (@Lab06Id, 'act-14', N'Main HVAC', 'hvac', 'auto', 'auto', DATEADD(MINUTE, -45, SYSUTCDATETIME())),
    (@Lab06Id, 'act-15', N'Exhaust System', 'exhaust_fan', 'on', 'auto', DATEADD(MINUTE, -15, SYSUTCDATETIME())),
    (@Lab06Id, 'act-16', N'Workshop Lighting', 'lighting', 'on', 'manual', DATEADD(MINUTE, -210, SYSUTCDATETIME()));

  INSERT INTO smartlab.Alert (LabId, AlertCode, AlertType, Severity, [Message], ReasonCode, [Timestamp], IsAcknowledged, AcknowledgedByUserId, AcknowledgedAt, AutoResolved)
  VALUES
    (@Lab02Id, 'alert-01', 'warning', 'medium', N'Humidity level above optimal range', 'HUMIDITY_HIGH', '2026-03-18T10:30:00', 0, NULL, NULL, 0),
    (@Lab02Id, 'alert-02', 'info', 'low', N'Microscope offline for scheduled maintenance', 'MAINTENANCE_SCHEDULED', '2026-03-18T09:00:00', 1, @EmilyUserId, '2026-03-18T09:05:00', 0),
    (@Lab04Id, 'alert-03', 'critical', 'critical', N'Temperature exceeds safe operating range', 'TEMP_CRITICAL_HIGH', '2026-03-18T11:15:00', 0, NULL, NULL, 0),
    (@Lab04Id, 'alert-04', 'critical', 'critical', N'CO2 level critically high - ventilation needed', 'CO2_CRITICAL', '2026-03-18T11:20:00', 0, NULL, NULL, 0),
    (@Lab06Id, 'alert-05', 'warning', 'medium', N'CO2 level elevated', 'CO2_WARNING', '2026-03-18T10:45:00', 0, NULL, NULL, 0);

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

  PRINT 'App-aligned mock data seeded/updated.';
END
GO
