USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/*
    Authentication, passwords, and application roles are NOT created here.
    Phase 2 will add ASP.NET Core Identity tables:
      AspNetUsers, AspNetRoles, AspNetUserRoles, AspNetUserClaims,
      AspNetRoleClaims, AspNetUserLogins, AspNetUserTokens.

    Do not introduce parallel AdminUsers / Roles tables.
*/

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs
    (
        AuditLogId BIGINT IDENTITY(1, 1) NOT NULL,
        EntityName NVARCHAR(80) NOT NULL,
        EntityId NVARCHAR(64) NULL,
        Action NVARCHAR(20) NOT NULL,
        IdentityUserId NVARCHAR(450) NULL,
        ChangeSummary NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (AuditLogId),
        CONSTRAINT CK_AuditLogs_Action CHECK (Action IN (N'Insert', N'Update', N'Delete', N'Login', N'Other'))
    );
END
GO
