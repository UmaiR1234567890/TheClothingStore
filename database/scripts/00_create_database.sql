-- Creates the development database if it does not exist.
-- Does not drop or alter existing databases.

IF DB_ID(N'TheClothingStore') IS NULL
BEGIN
    CREATE DATABASE [TheClothingStore];
END
GO
