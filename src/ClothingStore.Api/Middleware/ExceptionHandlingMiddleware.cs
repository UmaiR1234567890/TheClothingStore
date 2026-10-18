using ClothingStore.Application.DTOs;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ServiceException exception)
        {
            await WriteErrorAsync(
                context,
                exception.StatusCode,
                exception.Code,
                exception.Message);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            await WriteErrorAsync(context, 409, "unique_conflict", "The request conflicts with an existing record.");
        }
        catch (Exception exception)
        {
            var traceId = context.TraceIdentifier;
            logger.LogError(exception, "Unhandled API error. TraceId: {TraceId}", traceId);
            await WriteErrorAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "unexpected_error",
                $"An unexpected error occurred. Reference: {traceId}");
        }
    }

    private static async Task WriteErrorAsync(
        HttpContext context,
        int statusCode,
        string code,
        string message)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var payload = ApiResponse<object>.Fail(message, new ApiError(code, message));
        await context.Response.WriteAsJsonAsync(payload);
    }
}
