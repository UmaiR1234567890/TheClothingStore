using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace ClothingStore.Api;

public sealed record StoredProductImageFile(string ImageUrl, string FullPath);

public interface IProductImageFileStore
{
    string StorageRoot { get; }
    Task<StoredProductImageFile> SaveAsync(IFormFile file, CancellationToken cancellationToken);
    void Delete(StoredProductImageFile file);
}

internal sealed class LocalProductImageFileStore(
    IWebHostEnvironment environment,
    IConfiguration configuration) : IProductImageFileStore
{
    private const long MaximumFileSize = 8 * 1024 * 1024;
    public string StorageRoot => GetStorageRoot();

    private static readonly IReadOnlyDictionary<string, string> AllowedTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

    public async Task<StoredProductImageFile> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length is <= 0 or > MaximumFileSize)
            throw new ServiceException(400, "invalid_image_size", "Choose an image file no larger than 8 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedTypes.TryGetValue(extension, out var allowedContentType) ||
            !string.Equals(file.ContentType, allowedContentType, StringComparison.OrdinalIgnoreCase))
        {
            throw new ServiceException(400, "invalid_image_type", "Supported image types are JPEG, PNG, and WebP.");
        }

        if (!await HasValidSignatureAsync(file, extension, cancellationToken))
            throw new ServiceException(400, "invalid_image_content", "The uploaded file does not match its image type.");

        var storageRoot = GetStorageRoot();
        Directory.CreateDirectory(storageRoot);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(storageRoot, fileName);
        try
        {
            await using var output = new FileStream(
                fullPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true);
            await file.CopyToAsync(output, cancellationToken);
        }
        catch
        {
            if (File.Exists(fullPath))
                File.Delete(fullPath);
            throw;
        }

        var prefix = configuration["ProductImages:PublicUrlPrefix"] ?? "/images/products";
        return new StoredProductImageFile($"{prefix.TrimEnd('/')}/{fileName}", fullPath);
    }

    public void Delete(StoredProductImageFile file)
    {
        if (File.Exists(file.FullPath))
            File.Delete(file.FullPath);
    }

    private string GetStorageRoot()
    {
        var configuredPath = configuration["ProductImages:StoragePath"];
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return Path.IsPathRooted(configuredPath)
                ? Path.GetFullPath(configuredPath)
                : Path.GetFullPath(Path.Combine(environment.ContentRootPath, configuredPath));
        }

        var repositoryAssetPath = Path.GetFullPath(Path.Combine(
            environment.ContentRootPath,
            "..",
            "..",
            "Angular",
            "public",
            "images",
            "products"));
        return Directory.Exists(Path.GetDirectoryName(repositoryAssetPath))
            ? repositoryAssetPath
            : Path.Combine(environment.ContentRootPath, "wwwroot", "images", "products");
    }

    private static async Task<bool> HasValidSignatureAsync(
        IFormFile file,
        string extension,
        CancellationToken cancellationToken)
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAsync(header.AsMemory(), cancellationToken);

        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => read >= 8 &&
                      header[0] == 0x89 && header[1] == 0x50 &&
                      header[2] == 0x4E && header[3] == 0x47 &&
                      header[4] == 0x0D && header[5] == 0x0A &&
                      header[6] == 0x1A && header[7] == 0x0A,
            ".webp" => read >= 12 &&
                       header.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
                       header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
    }
}
