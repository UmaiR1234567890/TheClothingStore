using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/newsletter")]
public sealed class NewsletterController(INewsletterService newsletter) : ControllerBase
{
    [HttpPost("subscribe")]
    public async Task<ActionResult<ApiResponse<NewsletterResultDto>>> Subscribe(
        NewsletterEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await newsletter.SubscribeAsync(request.Email, cancellationToken);
        return Ok(ApiResponse<NewsletterResultDto>.Ok(
            result,
            result.Status == "AlreadySubscribed"
                ? "This email is already subscribed to our updates."
                : "Subscription saved — welcome email on its way."));
    }

    [HttpPost("unsubscribe")]
    public async Task<ActionResult<ApiResponse<NewsletterResultDto>>> Unsubscribe(
        NewsletterEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await newsletter.UnsubscribeAsync(request.Email, cancellationToken);
        return Ok(ApiResponse<NewsletterResultDto>.Ok(result, "Subscription status updated."));
    }
}
