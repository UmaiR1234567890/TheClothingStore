using System.Security.Claims;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;

namespace ClothingStore.Infrastructure.Services;

internal sealed class AuditLogWriter(
    ClothingStoreDbContext db,
    IHttpContextAccessor httpContextAccessor)
{
    public void Record(string entityName, string? entityId, string action, string summary)
    {
        var actorId = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = entityName,
            EntityId = entityId,
            Action = action,
            IdentityUserId = actorId,
            ChangeSummary = summary.Length <= 1000 ? summary : summary[..1000]
        });
    }
}
