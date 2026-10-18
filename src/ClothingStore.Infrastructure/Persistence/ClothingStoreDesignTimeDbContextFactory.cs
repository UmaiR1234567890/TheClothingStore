using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ClothingStore.Infrastructure.Persistence;

public sealed class ClothingStoreDesignTimeDbContextFactory
    : IDesignTimeDbContextFactory<ClothingStoreDbContext>
{
    public ClothingStoreDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__TheClothingStore")
            ?? "Server=localhost;Database=TheClothingStore;Integrated Security=True;Encrypt=True;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<ClothingStoreDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new ClothingStoreDbContext(options);
    }
}
