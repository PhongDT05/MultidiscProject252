SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Smart Lab Dashboard - SQL Server Demo Seed v1
-- Requires: 001_schema.sql

MERGE smartlab.[Role] AS target
USING (VALUES
    (1, 'ADMIN', 'Administrator'),
    (2, 'TECHNICIAN', 'Technician'),
    (3, 'STUDENT', 'Student')
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
GO

-- Lab A is prepared for real telemetry onboarding: no prefilled demo sensor values.
INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-01', 'Chemistry Lab A', 'warning', NULL, NULL, NULL, NULL, 0, 20, 0
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-01');

-- Keep reseeds consistent even when lab-01 already exists from older demo data.
UPDATE smartlab.Lab
SET [Status] = 'warning',
    Temperature = NULL,
    Humidity = NULL,
    Co2Level = NULL,
    LightLevel = NULL,
    Occupancy = 0,
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

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-02', 'Biology Lab B', 'warning', 24.8, 62, 580, 720, 15, 20, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-02');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-03', 'Physics Lab C', 'optimal', 21.2, 40, 400, 880, 5, 15, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-03');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-04', 'Computer Lab D', 'critical', 27.5, 38, 720, 600, 18, 20, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-04');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-05', 'Materials Lab E', 'optimal', 23.1, 47, 430, 710, 9, 18, 1
WHERE NOT EXISTS (SELECT 1 FROM smartlab.Lab WHERE LabCode = 'lab-05');

INSERT INTO smartlab.Lab (LabCode, LabName, [Status], Temperature, Humidity, Co2Level, LightLevel, Occupancy, MaxOccupancy, PresenceDetected)
SELECT 'lab-06', 'Electronics Lab F', 'warning', 25.2, 58, 910, 760, 13, 22, 1
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
GO

DELETE t
FROM smartlab.ThresholdConfig t
INNER JOIN smartlab.Lab l ON l.LabId = t.LabId
WHERE l.LabCode = 'lab-01';
GO
