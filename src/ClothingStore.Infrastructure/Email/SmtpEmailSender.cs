using ClothingStore.Application.Contracts;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

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

        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        mime.To.Add(string.IsNullOrWhiteSpace(message.ToName)
            ? MailboxAddress.Parse(message.ToAddress)
            : new MailboxAddress(message.ToName, message.ToAddress));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder
        {
            HtmlBody = message.HtmlBody,
            TextBody = message.TextBody ?? string.Empty,
        }.ToMessageBody();

        if (string.Equals(settings.DeliveryMethod, "SpecifiedPickupDirectory", StringComparison.OrdinalIgnoreCase))
        {
            var directory = settings.PickupDirectoryLocation;
            if (string.IsNullOrWhiteSpace(directory))
                directory = Path.Combine(environment.ContentRootPath, "App_Data", "emails");
            if (!Path.IsPathRooted(directory))
                directory = Path.Combine(environment.ContentRootPath, directory);
            Directory.CreateDirectory(directory);
            var file = Path.Combine(directory, $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}.eml");
            await using (var stream = File.Create(file))
            {
                await mime.WriteToAsync(stream, cancellationToken);
            }
            logger.LogInformation(
                "Email '{Subject}' to {ToAddress} was written as an .eml file in {Directory} (no real email is sent in pickup mode).",
                message.Subject, message.ToAddress, directory);
            return;
        }

        if (string.IsNullOrWhiteSpace(settings.SmtpHost))
            throw new InvalidOperationException("Email:SmtpHost must be configured for network delivery.");

        using var client = new SmtpClient();
        try
        {
            var socketOptions = settings.SmtpPort == 465
                ? SecureSocketOptions.SslOnConnect
                : settings.EnableSsl
                    ? SecureSocketOptions.StartTls
                    : SecureSocketOptions.None;
            await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, socketOptions, cancellationToken);
            if (!string.IsNullOrWhiteSpace(settings.Username))
                await client.AuthenticateAsync(settings.Username, settings.Password ?? string.Empty, cancellationToken);
            await client.SendAsync(mime, cancellationToken);
            logger.LogInformation(
                "Sent '{Subject}' to {ToAddress} via SMTP {Host}:{Port}.",
                message.Subject, message.ToAddress, settings.SmtpHost, settings.SmtpPort);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to send '{Subject}' to {ToAddress} via {Host}:{Port}. The order itself is unaffected.",
                message.Subject, message.ToAddress, settings.SmtpHost, settings.SmtpPort);
        }
        finally
        {
            if (client.IsConnected)
                await client.DisconnectAsync(true, cancellationToken);
        }
    }
}
