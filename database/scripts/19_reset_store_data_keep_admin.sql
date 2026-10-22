USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/*
    Development reset only. It refuses to run unless @ConfirmReset is set to 1
    after reviewing the scope. The checked-in default remains 0.

    By default, operational/catalog content is cleared but department, category,
    color, size, and attribute lookup rows are retained so the Admin dashboard
    can create products immediately. Set @DeleteReferenceData = 1 to clear
    those lookup tables too; run 08_seed_reference_data.sql afterward.

    The selected Admin's Identity account, Admin role, and role link are kept.
    Image files on disk are not deleted; only ProductImages database rows are.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ConfirmReset BIT = 0;
DECLARE @DeleteReferenceData BIT = 0;
DECLARE @AdminEmail NVARCHAR(256) = N'superadmin@theclothingstore.local';
DECLARE @AdminUserId NVARCHAR(450);
DECLARE @AdminRoleId NVARCHAR(450);

IF DB_NAME() <> N'TheClothingStore'
BEGIN
    ;THROW 51901, N'This reset script is restricted to TheClothingStore.', 1;
END;

IF @ConfirmReset <> 1
BEGIN
    ;THROW 51902, N'Reset not run. Review this script and set @ConfirmReset = 1 to proceed.', 1;
END;

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NULL
BEGIN
    ;THROW 51903, N'ASP.NET Identity tables are required so the Admin login can be preserved.', 1;
END;

SELECT @AdminUserId = Id
FROM dbo.AspNetUsers
WHERE NormalizedEmail = UPPER(@AdminEmail);

SELECT @AdminRoleId = Id
FROM dbo.AspNetRoles
WHERE NormalizedName = N'ADMIN';

IF @AdminUserId IS NULL OR @AdminRoleId IS NULL
BEGIN
    ;THROW 51904, N'The specified Admin user or Admin role was not found; no reset was run.', 1;
END;

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.AspNetUserRoles
    WHERE UserId = @AdminUserId
      AND RoleId = @AdminRoleId
)
BEGIN
    ;THROW 51905, N'The specified account is not linked to the Admin role; no reset was run.', 1;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM dbo.AspNetUserClaims
    WHERE UserId <> @AdminUserId;

    DELETE FROM dbo.AspNetUserLogins
    WHERE UserId <> @AdminUserId;

    DELETE FROM dbo.AspNetUserTokens
    WHERE UserId <> @AdminUserId;

    DELETE FROM dbo.AspNetRoleClaims
    WHERE RoleId <> @AdminRoleId;

    DELETE FROM dbo.AspNetUserRoles
    WHERE UserId <> @AdminUserId
       OR RoleId <> @AdminRoleId;

    DELETE FROM dbo.AspNetUsers
    WHERE Id <> @AdminUserId;

    DELETE FROM dbo.AspNetRoles
    WHERE Id <> @AdminRoleId;

    DELETE FROM dbo.CartItems;
    DELETE FROM dbo.OrderItems;
    DELETE FROM dbo.Payments;
    DELETE FROM dbo.Shipments;
    DELETE FROM dbo.InventoryTransactions;
    DELETE FROM dbo.ProductImages;
    DELETE FROM dbo.ProductAttributeValues;
    DELETE FROM dbo.SaleProducts;
    DELETE FROM dbo.Inventory;
    DELETE FROM dbo.ProductVariants;
    DELETE FROM dbo.ProductDepartments;
    DELETE FROM dbo.ProductCategories;
    DELETE FROM dbo.Orders;
    DELETE FROM dbo.Carts;
    DELETE FROM dbo.CustomerAddresses;
    DELETE FROM dbo.Customers;
    DELETE FROM dbo.NewsletterSubscriptions;
    DELETE FROM dbo.AuditLogs;
    DELETE FROM dbo.Products;
    DELETE FROM dbo.Sales;

    IF @DeleteReferenceData = 1
    BEGIN
        WHILE EXISTS (SELECT 1 FROM dbo.Categories)
        BEGIN
            DELETE category
            FROM dbo.Categories AS category
            WHERE NOT EXISTS
            (
                SELECT 1
                FROM dbo.Categories AS child
                WHERE child.ParentCategoryId = category.CategoryId
            );

            IF @@ROWCOUNT = 0
            BEGIN
                ;THROW 51906, N'Category tree could not be cleared; check for a parent cycle.', 1;
            END;
        END;

        DELETE FROM dbo.ProductAttributes;
        DELETE FROM dbo.Sizes;
        DELETE FROM dbo.Colors;
        DELETE FROM dbo.Departments;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

SELECT
    u.UserName,
    u.Email,
    role.Name AS PreservedRole
FROM dbo.AspNetUsers AS u
INNER JOIN dbo.AspNetUserRoles AS userRole ON userRole.UserId = u.Id
INNER JOIN dbo.AspNetRoles AS role ON role.Id = userRole.RoleId
WHERE u.Id = @AdminUserId
  AND role.Id = @AdminRoleId;

SELECT
    (SELECT COUNT(*) FROM dbo.Products) AS Products,
    (SELECT COUNT(*) FROM dbo.Orders) AS Orders,
    (SELECT COUNT(*) FROM dbo.Carts) AS Carts,
    (SELECT COUNT(*) FROM dbo.Customers) AS Customers,
    (SELECT COUNT(*) FROM dbo.AspNetUsers) AS IdentityUsers;
GO
