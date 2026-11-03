using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class NewsletterService(ClothingStoreDbContext db, IEmailSender emailSender) : INewsletterService
{
    public async Task<NewsletterResultDto> SubscribeAsync(string email, CancellationToken cancellationToken)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var subscription = await db.NewsletterSubscriptions.SingleOrDefaultAsync(x => x.Email == normalized, cancellationToken);
        if (subscription is not null)
        {
            if (subscription.Status != "Subscribed")
            {
                subscription.Status = "Subscribed";
                subscription.SubscribedAt = DateTime.UtcNow;
                subscription.UnsubscribedAt = null;
                await db.SaveChangesAsync(cancellationToken);
            }
            else
            {
                return new NewsletterResultDto("AlreadySubscribed");
            }
            return new NewsletterResultDto("Subscribed");
        }

        subscription = new Domain.Entities.NewsletterSubscription
        {
            Email = normalized,
            Status = "Subscribed"
        };
        db.NewsletterSubscriptions.Add(subscription);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            db.Entry(subscription).State = EntityState.Detached;
            var raced = await db.NewsletterSubscriptions.AsNoTracking()
                .AnyAsync(x => x.Email == normalized && x.Status == "Subscribed", cancellationToken);
            if (!raced)
                throw;
        }
        await emailSender.SendAsync(new EmailMessage(
            normalized,
            null,
            "Welcome to The Clothing Store",
            "<h2 style=\"font-family:serif\">Hello!</h2>" +
            "<p>Thanks for joining <strong>The Clothing Store</strong>. You'll be the first to hear about new drops, sales, and style updates.</p>" +
            "<p style=\"color:#888\">Welcome aboard — we're glad you're here.</p>",
            "Hello! Thanks for joining The Clothing Store. You'll be the first to hear about new drops, sales, and style updates."),
            cancellationToken);
        return new NewsletterResultDto("Subscribed");
    }

    public async Task<NewsletterResultDto> UnsubscribeAsync(string email, CancellationToken cancellationToken)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var subscription = await db.NewsletterSubscriptions.SingleOrDefaultAsync(x => x.Email == normalized, cancellationToken);
        if (subscription is not null && subscription.Status != "Unsubscribed")
        {
            subscription.Status = "Unsubscribed";
            subscription.UnsubscribedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        return new NewsletterResultDto("Unsubscribed");
    }
}
