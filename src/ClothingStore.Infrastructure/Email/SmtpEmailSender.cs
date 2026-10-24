using System.Net;
using System.Net.Mail;
using ClothingStore.Application.Contracts;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ClothingStore.Infrastructure.Email;

internal sealed class SmtpEmailSender(
    IOptions<EmailOptions> options,
    IHostEnvironment environment,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly EmailOptions settings = options.Value;

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (!settings.Enabled)
        {
            logger.LogInformation(
                "Email delivery is disabled. Skipping '{Subject}' to {ToAddress}.",
                message.Subject, message.ToAddress);
            return;
        }
        if (string.IsNullOrWhiteSpace(message.ToAddress))
        {
            logger.LogWarning("Email '{Subject}' was skipped because the recipient address is empty.", message.Subject);
            return;
        }

        using var mail = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName),
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true
        };
        mail.To.Add(string.IsNullOrWhiteSpace(message.ToName)
            ? new MailAddress(message.ToAddress)
            : new MailAddress(message.ToAddress, message.ToName));
        if (!string.IsNullOrWhiteSpace(message.TextBody))
        {
            mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
                message.TextBody, null, "text/plain"));
        }

        using var client = new SmtpClient();
        if (string.Equals(settings.DeliveryMethod, "SpecifiedPickupDirectory", StringComparison.OrdinalIgnoreCase))
        {
            var directory = settings.PickupDirectoryLocation;
            if (string.IsNullOrWhiteSpace(directory))
                directory = Path.Combine(environment.ContentRootPath, "App_Data", "emails");
            if (!Path.IsPathRooted(directory))
                directory = Path.Combine(environment.ContentRootPath, directory);
            Directory.CreateDirectory(directory);
            client.DeliveryMethod = SmtpDeliveryMethod.SpecifiedPickupDirectory;
            client.PickupDirectoryLocation = directory;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(settings.SmtpHost))
                throw new InvalidOperationException("Email:SmtpHost must be configured for network delivery.");
            client.DeliveryMethod = SmtpDeliveryMethod.Network;
            client.Host = settings.SmtpHost;
            client.Port = settings.SmtpPort;
            client.EnableSsl = settings.EnableSsl;
            if (!string.IsNullOrWhiteSpace(settings.Username))
                client.Credentials = new NetworkCredential(settings.Username, settings.Password);
        }

        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            await client.SendMailAsync(mail);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to send '{Subject}' to {ToAddress}.", message.Subject, message.ToAddress);
            throw;
        }

        if (client.DeliveryMethod == SmtpDeliveryMethod.SpecifiedPickupDirectory)
        {
            logger.LogInformation(
                "Email '{Subject}' to {ToAddress} was written as an .eml file in {Directory} (no real email is sent in pickup mode).",
                message.Subject, message.ToAddress, client.PickupDirectoryLocation);
        }
        else
        {
            logger.LogInformation(
                "Sent '{Subject}' to {ToAddress} via SMTP {Host}:{Port}.",
                message.Subject, message.ToAddress, client.Host, client.Port);
        }
    }
}
