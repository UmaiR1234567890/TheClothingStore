namespace ClothingStore.Infrastructure.Email;

public sealed class EmailOptions
{
    public bool Enabled { get; set; }

    /// <summary>Network (real SMTP) or SpecifiedPickupDirectory (drops .eml files into a folder).</summary>
    public string DeliveryMethod { get; set; } = "SpecifiedPickupDirectory";

    public string? PickupDirectoryLocation { get; set; }

    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = true;

    public string FromAddress { get; set; } = "no-reply@theclothingstore.local";
    public string FromName { get; set; } = "The Clothing Store";
}
