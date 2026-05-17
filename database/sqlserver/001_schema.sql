SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Smart Lab Dashboard - SQL Server Relational Schema v1
-- Apply order (fresh setup): 001_schema.sql -> 002_seed_demo.sql
-- This file is the consolidated latest schema for reset-based setup.

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'smartlab')
BEGIN
    EXEC('CREATE SCHEMA smartlab');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Role' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.[Role] (
        RoleId TINYINT NOT NULL,
        RoleCode VARCHAR(20) NOT NULL,
        RoleName NVARCHAR(50) NOT NULL,
        CONSTRAINT PK_Role PRIMARY KEY (RoleId),
        CONSTRAINT UQ_Role_RoleCode UNIQUE (RoleCode)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'User' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.[User] (
        UserId BIGINT IDENTITY(1,1) NOT NULL,
        Username VARCHAR(50) NOT NULL,
        Email VARCHAR(255) NOT NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        DisplayName NVARCHAR(100) NOT NULL,
        RoleId TINYINT NOT NULL,
        AccountStatus VARCHAR(20) NOT NULL CONSTRAINT DF_User_AccountStatus DEFAULT ('active'),
        LastLoginAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_User_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_User_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_User PRIMARY KEY (UserId),
        CONSTRAINT FK_User_Role FOREIGN KEY (RoleId) REFERENCES smartlab.[Role](RoleId),
        CONSTRAINT CK_User_AccountStatus CHECK (AccountStatus IN ('active', 'inactive'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Lab' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.Lab (
        LabId BIGINT IDENTITY(1,1) NOT NULL,
        LabCode VARCHAR(30) NOT NULL,
        LabName NVARCHAR(120) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        Temperature DECIMAL(5,2) NULL,
        Humidity DECIMAL(5,2) NULL,
        Co2Level DECIMAL(8,2) NULL,
        LightLevel DECIMAL(8,2) NULL,
        PresenceDetected BIT NOT NULL CONSTRAINT DF_Lab_PresenceDetected DEFAULT (0),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Lab_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Lab_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Lab PRIMARY KEY (LabId),
        CONSTRAINT CK_Lab_Status CHECK ([Status] IN ('optimal', 'warning', 'critical'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserLabAssignment' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.UserLabAssignment (
        UserId BIGINT NOT NULL,
        LabId BIGINT NOT NULL,
        AssignedAt DATETIME2(3) NOT NULL CONSTRAINT DF_UserLabAssignment_AssignedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_UserLabAssignment PRIMARY KEY (UserId, LabId),
        CONSTRAINT FK_UserLabAssignment_User FOREIGN KEY (UserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT FK_UserLabAssignment_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Equipment' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.Equipment (
        EquipmentId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        EquipmentCode VARCHAR(50) NOT NULL,
        EquipmentName NVARCHAR(120) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        [Mode] VARCHAR(20) NOT NULL CONSTRAINT DF_Equipment_Mode DEFAULT ('auto'),
        IsEssential BIT NOT NULL CONSTRAINT DF_Equipment_IsEssential DEFAULT (0),
        LastMaintenanceAt DATETIME2(3) NULL,
        CumulativeRuntimeHours DECIMAL(10,2) NOT NULL CONSTRAINT DF_Equipment_CumulativeRuntimeHours DEFAULT (0),
        LastRuntimeUpdateAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Equipment_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Equipment_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Equipment PRIMARY KEY (EquipmentId),
        CONSTRAINT FK_Equipment_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT CK_Equipment_Status CHECK ([Status] IN ('online', 'offline', 'maintenance')),
        CONSTRAINT CK_Equipment_Mode CHECK ([Mode] IN ('auto', 'manual')),
        CONSTRAINT CK_Equipment_Runtime CHECK (CumulativeRuntimeHours >= 0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IoTDevice' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.IoTDevice (
        IoTDeviceId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        DeviceCode VARCHAR(50) NOT NULL,
        DeviceName NVARCHAR(120) NOT NULL,
        DeviceType VARCHAR(20) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        InstalledAt DATETIME2(3) NULL,
        EstimatedMaintenanceHours DECIMAL(10,2) NULL,
        LastSeenAt DATETIME2(3) NULL,
        SignalStrength TINYINT NOT NULL,
        BatteryLevel TINYINT NULL,
        FirmwareVersion VARCHAR(50) NULL,
        DataRate DECIMAL(10,2) NULL,
        [Location] NVARCHAR(120) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_IoTDevice_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_IoTDevice_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_IoTDevice PRIMARY KEY (IoTDeviceId),
        CONSTRAINT FK_IoTDevice_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT CK_IoTDevice_DeviceType CHECK (DeviceType IN ('sensor', 'gateway', 'actuator')),
        CONSTRAINT CK_IoTDevice_Status CHECK ([Status] IN ('online', 'offline', 'error', 'warning')),
        CONSTRAINT CK_IoTDevice_SignalStrength CHECK (SignalStrength BETWEEN 0 AND 100),
        CONSTRAINT CK_IoTDevice_BatteryLevel CHECK (BatteryLevel IS NULL OR BatteryLevel BETWEEN 0 AND 100),
        CONSTRAINT CK_IoTDevice_MaintHours CHECK (EstimatedMaintenanceHours IS NULL OR EstimatedMaintenanceHours >= 0),
        CONSTRAINT CK_IoTDevice_DataRate CHECK (DataRate IS NULL OR DataRate >= 0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Actuator' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.Actuator (
        ActuatorId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        ActuatorCode VARCHAR(50) NOT NULL,
        ActuatorName NVARCHAR(120) NOT NULL,
        ActuatorType VARCHAR(20) NOT NULL,
        [Status] VARCHAR(20) NOT NULL,
        [Mode] VARCHAR(20) NOT NULL,
        LastActivatedAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Actuator_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Actuator_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Actuator PRIMARY KEY (ActuatorId),
        CONSTRAINT FK_Actuator_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT CK_Actuator_Type CHECK (ActuatorType IN ('hvac', 'exhaust_fan', 'lighting', 'ventilation')),
        CONSTRAINT CK_Actuator_Status CHECK ([Status] IN ('on', 'off', 'auto')),
        CONSTRAINT CK_Actuator_Mode CHECK ([Mode] IN ('auto', 'manual'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ThresholdConfig' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.ThresholdConfig (
        ThresholdConfigId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        TemperatureMin DECIMAL(5,2) NOT NULL,
        TemperatureMax DECIMAL(5,2) NOT NULL,
        TemperatureWarningMin DECIMAL(5,2) NOT NULL,
        TemperatureWarningMax DECIMAL(5,2) NOT NULL,
        HumidityMin DECIMAL(5,2) NOT NULL,
        HumidityMax DECIMAL(5,2) NOT NULL,
        HumidityWarningMin DECIMAL(5,2) NOT NULL,
        HumidityWarningMax DECIMAL(5,2) NOT NULL,
        Co2Max DECIMAL(8,2) NOT NULL,
        Co2WarningMax DECIMAL(8,2) NOT NULL,
        LightLevelMin DECIMAL(8,2) NOT NULL,
        LightLevelMax DECIMAL(8,2) NOT NULL,
        UpdatedByUserId BIGINT NULL,
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ThresholdConfig_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ThresholdConfig PRIMARY KEY (ThresholdConfigId),
        CONSTRAINT UQ_ThresholdConfig_LabId UNIQUE (LabId),
        CONSTRAINT FK_ThresholdConfig_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT FK_ThresholdConfig_UpdatedByUser FOREIGN KEY (UpdatedByUserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT CK_ThresholdConfig_Temp CHECK (TemperatureMin < TemperatureWarningMin AND TemperatureWarningMin < TemperatureWarningMax AND TemperatureWarningMax < TemperatureMax),
        CONSTRAINT CK_ThresholdConfig_Humidity CHECK (HumidityMin < HumidityWarningMin AND HumidityWarningMin < HumidityWarningMax AND HumidityWarningMax < HumidityMax),
        CONSTRAINT CK_ThresholdConfig_Co2 CHECK (Co2WarningMax < Co2Max),
        CONSTRAINT CK_ThresholdConfig_Light CHECK (LightLevelMin < LightLevelMax)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Alert' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.Alert (
        AlertId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        AlertCode VARCHAR(50) NOT NULL,
        AlertType VARCHAR(20) NOT NULL,
        Severity VARCHAR(20) NOT NULL,
        [Message] NVARCHAR(500) NOT NULL,
        ReasonCode VARCHAR(50) NOT NULL,
        [Timestamp] DATETIME2(3) NOT NULL,
        IsAcknowledged BIT NOT NULL CONSTRAINT DF_Alert_IsAcknowledged DEFAULT (0),
        AcknowledgedByUserId BIGINT NULL,
        AcknowledgedAt DATETIME2(3) NULL,
        AutoResolved BIT NOT NULL CONSTRAINT DF_Alert_AutoResolved DEFAULT (0),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Alert_CreatedAt DEFAULT (SYSUTCDATETIME()),
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Alert PRIMARY KEY (AlertId),
        CONSTRAINT FK_Alert_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT FK_Alert_AcknowledgedByUser FOREIGN KEY (AcknowledgedByUserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT CK_Alert_Type CHECK (AlertType IN ('info', 'warning', 'critical', 'danger')),
        CONSTRAINT CK_Alert_Severity CHECK (Severity IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT CK_Alert_Acknowledgment CHECK ((IsAcknowledged = 0 AND AcknowledgedAt IS NULL) OR (IsAcknowledged = 1 AND AcknowledgedAt IS NOT NULL))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AutomatedAction' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.AutomatedAction (
        AutomatedActionId BIGINT IDENTITY(1,1) NOT NULL,
        ActionCode VARCHAR(50) NOT NULL,
        LabId BIGINT NOT NULL,
        AlertId BIGINT NULL,
        ActuatorId BIGINT NULL,
        [Timestamp] DATETIME2(3) NOT NULL,
        TriggerDescription NVARCHAR(200) NOT NULL,
        ActionDescription NVARCHAR(200) NOT NULL,
        [Success] BIT NOT NULL,
        ReasonCode VARCHAR(50) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AutomatedAction_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_AutomatedAction PRIMARY KEY (AutomatedActionId),
        CONSTRAINT UQ_AutomatedAction_ActionCode UNIQUE (ActionCode),
        CONSTRAINT FK_AutomatedAction_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT FK_AutomatedAction_Alert FOREIGN KEY (AlertId) REFERENCES smartlab.Alert(AlertId),
        CONSTRAINT FK_AutomatedAction_Actuator FOREIGN KEY (ActuatorId) REFERENCES smartlab.Actuator(ActuatorId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DataChangeLog' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.DataChangeLog (
        DataChangeLogId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        ChangedByUserId BIGINT NULL,
        ChangeType VARCHAR(30) NOT NULL,
        FieldName NVARCHAR(100) NOT NULL,
        OldValue NVARCHAR(MAX) NULL,
        NewValue NVARCHAR(MAX) NULL,
        Description NVARCHAR(500) NULL,
        ChangedAt DATETIME2(3) NOT NULL CONSTRAINT DF_DataChangeLog_ChangedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_DataChangeLog PRIMARY KEY (DataChangeLogId),
        CONSTRAINT FK_DataChangeLog_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT FK_DataChangeLog_ChangedByUser FOREIGN KEY (ChangedByUserId) REFERENCES smartlab.[User](UserId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TelemetryReading' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.TelemetryReading (
        TelemetryReadingId BIGINT IDENTITY(1,1) NOT NULL,
        LabId BIGINT NOT NULL,
        RecordedAt DATETIME2(3) NOT NULL,
        Temperature DECIMAL(5,2) NULL,
        Humidity DECIMAL(5,2) NULL,
        Co2Level DECIMAL(8,2) NULL,
        LightLevel DECIMAL(8,2) NULL,
        PresenceDetected BIT NULL,
        CONSTRAINT PK_TelemetryReading PRIMARY KEY (TelemetryReadingId),
        CONSTRAINT FK_TelemetryReading_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabRecommendation' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.LabRecommendation (
        LabRecommendationId BIGINT IDENTITY(1,1) NOT NULL,
        RecommendationCode VARCHAR(50) NOT NULL,
        LabId BIGINT NOT NULL,
        StudentUserId BIGINT NOT NULL,
        InstructorUserId BIGINT NOT NULL,
        [Message] NVARCHAR(1000) NOT NULL,
        [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_LabRecommendation_Status DEFAULT ('pending'),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_LabRecommendation_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_LabRecommendation PRIMARY KEY (LabRecommendationId),
        CONSTRAINT UQ_LabRecommendation_RecommendationCode UNIQUE (RecommendationCode),
        CONSTRAINT FK_LabRecommendation_Lab FOREIGN KEY (LabId) REFERENCES smartlab.Lab(LabId),
        CONSTRAINT FK_LabRecommendation_Student FOREIGN KEY (StudentUserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT FK_LabRecommendation_Instructor FOREIGN KEY (InstructorUserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT CK_LabRecommendation_Status CHECK ([Status] IN ('pending', 'reviewed', 'dismissed'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemSetting' AND schema_id = SCHEMA_ID('smartlab'))
BEGIN
    CREATE TABLE smartlab.SystemSetting (
        SettingKey VARCHAR(100) NOT NULL,
        SettingValue NVARCHAR(MAX) NOT NULL,
        ValueType VARCHAR(20) NOT NULL,
        UpdatedByUserId BIGINT NULL,
        UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_SystemSetting_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_SystemSetting PRIMARY KEY (SettingKey),
        CONSTRAINT FK_SystemSetting_UpdatedByUser FOREIGN KEY (UpdatedByUserId) REFERENCES smartlab.[User](UserId),
        CONSTRAINT CK_SystemSetting_ValueType CHECK (ValueType IN ('string', 'number', 'boolean', 'json'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_User_RoleId' AND object_id = OBJECT_ID('smartlab.[User]'))
    CREATE INDEX IX_User_RoleId ON smartlab.[User] (RoleId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_User_Username_Active' AND object_id = OBJECT_ID('smartlab.[User]'))
    CREATE UNIQUE INDEX UX_User_Username_Active ON smartlab.[User] (Username) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_User_Email_Active' AND object_id = OBJECT_ID('smartlab.[User]'))
    CREATE UNIQUE INDEX UX_User_Email_Active ON smartlab.[User] (Email) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserLabAssignment_LabId_UserId' AND object_id = OBJECT_ID('smartlab.UserLabAssignment'))
    CREATE INDEX IX_UserLabAssignment_LabId_UserId ON smartlab.UserLabAssignment (LabId, UserId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Lab_LabCode_Active' AND object_id = OBJECT_ID('smartlab.Lab'))
    CREATE UNIQUE INDEX UX_Lab_LabCode_Active ON smartlab.Lab (LabCode) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Equipment_LabId_Status' AND object_id = OBJECT_ID('smartlab.Equipment'))
    CREATE INDEX IX_Equipment_LabId_Status ON smartlab.Equipment (LabId, [Status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Equipment_EquipmentCode_Active' AND object_id = OBJECT_ID('smartlab.Equipment'))
    CREATE UNIQUE INDEX UX_Equipment_EquipmentCode_Active ON smartlab.Equipment (EquipmentCode) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IoTDevice_LabId_Status' AND object_id = OBJECT_ID('smartlab.IoTDevice'))
    CREATE INDEX IX_IoTDevice_LabId_Status ON smartlab.IoTDevice (LabId, [Status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_IoTDevice_DeviceCode_Active' AND object_id = OBJECT_ID('smartlab.IoTDevice'))
    CREATE UNIQUE INDEX UX_IoTDevice_DeviceCode_Active ON smartlab.IoTDevice (DeviceCode) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Actuator_LabId_Status' AND object_id = OBJECT_ID('smartlab.Actuator'))
    CREATE INDEX IX_Actuator_LabId_Status ON smartlab.Actuator (LabId, [Status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Actuator_ActuatorCode_Active' AND object_id = OBJECT_ID('smartlab.Actuator'))
    CREATE UNIQUE INDEX UX_Actuator_ActuatorCode_Active ON smartlab.Actuator (ActuatorCode) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Alert_LabId_Acknowledged_Timestamp' AND object_id = OBJECT_ID('smartlab.Alert'))
    CREATE INDEX IX_Alert_LabId_Acknowledged_Timestamp ON smartlab.Alert (LabId, IsAcknowledged, [Timestamp] DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Alert_AlertCode_Active' AND object_id = OBJECT_ID('smartlab.Alert'))
    CREATE UNIQUE INDEX UX_Alert_AlertCode_Active ON smartlab.Alert (AlertCode) WHERE DeletedAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AutomatedAction_LabId_Timestamp' AND object_id = OBJECT_ID('smartlab.AutomatedAction'))
    CREATE INDEX IX_AutomatedAction_LabId_Timestamp ON smartlab.AutomatedAction (LabId, [Timestamp] DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DataChangeLog_LabId_ChangedAt' AND object_id = OBJECT_ID('smartlab.DataChangeLog'))
    CREATE INDEX IX_DataChangeLog_LabId_ChangedAt ON smartlab.DataChangeLog (LabId, ChangedAt DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TelemetryReading_LabId_RecordedAt' AND object_id = OBJECT_ID('smartlab.TelemetryReading'))
    CREATE INDEX IX_TelemetryReading_LabId_RecordedAt ON smartlab.TelemetryReading (LabId, RecordedAt DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LabRecommendation_LabId_CreatedAt' AND object_id = OBJECT_ID('smartlab.LabRecommendation'))
    CREATE INDEX IX_LabRecommendation_LabId_CreatedAt ON smartlab.LabRecommendation (LabId, CreatedAt DESC);
GO

CREATE OR ALTER VIEW smartlab.vwUserAccessibleLab
AS
SELECT
    ula.UserId,
    l.LabId,
    l.LabCode,
    l.LabName
FROM smartlab.UserLabAssignment ula
INNER JOIN smartlab.Lab l ON l.LabId = ula.LabId
WHERE l.DeletedAt IS NULL;
GO

CREATE OR ALTER PROCEDURE smartlab.usp_GetAuthorizedDataChangeLog
    @RequestUserId BIGINT,
    @LabCode VARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        dcl.DataChangeLogId,
        l.LabCode,
        l.LabName,
        dcl.ChangeType,
        dcl.FieldName,
        dcl.OldValue,
        dcl.NewValue,
        dcl.Description,
        dcl.ChangedAt,
        dcl.ChangedByUserId,
        u.Username AS ChangedByUsername,
        u.DisplayName AS ChangedByDisplayName
    FROM smartlab.DataChangeLog dcl
    INNER JOIN smartlab.vwUserAccessibleLab ual
        ON ual.LabId = dcl.LabId
       AND ual.UserId = @RequestUserId
    INNER JOIN smartlab.Lab l ON l.LabId = dcl.LabId
    LEFT JOIN smartlab.[User] u ON u.UserId = dcl.ChangedByUserId
    WHERE (@LabCode IS NULL OR l.LabCode = @LabCode)
    ORDER BY dcl.ChangedAt DESC, dcl.DataChangeLogId DESC;
END
GO

CREATE OR ALTER PROCEDURE smartlab.usp_AddDataChangeLog
    @LabCode VARCHAR(30),
    @ChangedByUserId BIGINT = NULL,
    @ChangeType VARCHAR(30),
    @FieldName NVARCHAR(100),
    @OldValue NVARCHAR(MAX) = NULL,
    @NewValue NVARCHAR(MAX) = NULL,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LabId BIGINT;
    SELECT @LabId = LabId
    FROM smartlab.Lab
    WHERE LabCode = @LabCode
      AND DeletedAt IS NULL;

    IF @LabId IS NULL
    BEGIN
        THROW 50001, 'Lab not found or deleted.', 1;
    END

    IF @ChangedByUserId IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM smartlab.UserLabAssignment
           WHERE UserId = @ChangedByUserId
             AND LabId = @LabId
       )
    BEGIN
        THROW 50002, 'User is not assigned to the target lab.', 1;
    END

    INSERT INTO smartlab.DataChangeLog (
        LabId,
        ChangedByUserId,
        ChangeType,
        FieldName,
        OldValue,
        NewValue,
        Description
    )
    VALUES (
        @LabId,
        @ChangedByUserId,
        @ChangeType,
        @FieldName,
        @OldValue,
        @NewValue,
        @Description
    );
END
GO
