using ClothingStore.Application.DTOs;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController(
    ClothingStoreDbContext db,
    ILogger<HealthController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<object>> Get() =>
        Ok(ApiResponse<object>.Ok(new { status = "healthy" }));

    [HttpGet("ready")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ApiResponse<object>>> Ready(CancellationToken cancellationToken)
    {
        try
        {
            if (await db.Database.CanConnectAsync(cancellationToken))
                return Ok(ApiResponse<object>.Ok(new { status = "ready" }));
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Readiness database check failed.");
        }

        return StatusCode(
            StatusCodes.Status503ServiceUnavailable,
            ApiResponse<object>.Fail("The application is not ready."));
    }
}
