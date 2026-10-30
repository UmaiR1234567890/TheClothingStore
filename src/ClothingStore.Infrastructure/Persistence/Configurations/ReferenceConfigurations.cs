using ClothingStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClothingStore.Infrastructure.Persistence.Configurations;

internal sealed class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.DepartmentId).HasName("PK_Departments");
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => x.Name).IsUnique().HasDatabaseName("UX_Departments_Name");
        builder.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_Departments_Slug");
    }
}

internal sealed class ColorConfiguration : IEntityTypeConfiguration<Color>
{
    public void Configure(EntityTypeBuilder<Color> builder)
    {
        builder.ToTable("Colors", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Colors_HexCode",
                "[HexCode] IS NULL OR [HexCode] LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'");
        });
        builder.HasKey(x => x.ColorId).HasName("PK_Colors");
        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.HexCode).HasColumnType("char(7)").IsUnicode(false);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.Name).IsUnique().HasDatabaseName("UX_Colors_Name");
    }
}

internal sealed class SizeConfiguration : IEntityTypeConfiguration<Size>
{
    public void Configure(EntityTypeBuilder<Size> builder)
    {
        builder.ToTable("Sizes", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_Sizes_SizeType", "[SizeType] IN (N'Clothing', N'Footwear')");
        });
        builder.HasKey(x => x.SizeId).HasName("PK_Sizes");
        builder.Property(x => x.SizeType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(30).IsRequired();
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => new { x.SizeType, x.Name }).IsUnique().HasDatabaseName("UX_Sizes_Type_Name");
        builder.HasIndex(x => x.SizeGroupId).HasDatabaseName("IX_Sizes_SizeGroupId");
        builder.HasOne(x => x.SizeGroup)
            .WithMany(x => x.Sizes)
            .HasForeignKey(x => x.SizeGroupId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class SizeGroupConfiguration : IEntityTypeConfiguration<SizeGroup>
{
    public void Configure(EntityTypeBuilder<SizeGroup> builder)
    {
        builder.ToTable("SizeGroups", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.SizeGroupId).HasName("PK_SizeGroups");
        builder.Property(x => x.GroupName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.HasIndex(x => x.GroupName).IsUnique().HasDatabaseName("UX_SizeGroups_GroupName");
    }
}

internal sealed class ProductAttributeConfiguration : IEntityTypeConfiguration<ProductAttribute>
{
    public void Configure(EntityTypeBuilder<ProductAttribute> builder)
    {
        builder.ToTable("ProductAttributes", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.ProductAttributeId).HasName("PK_ProductAttributes");
        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(80).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.Name).IsUnique().HasDatabaseName("UX_ProductAttributes_Name");
        builder.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_ProductAttributes_Slug");
    }
}
