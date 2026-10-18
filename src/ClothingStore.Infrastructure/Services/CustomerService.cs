using System.Data;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CustomerService(ClothingStoreDbContext db, AuditLogWriter audit) : ICustomerService
{
    public async Task<int> GetCustomerIdAsync(string identityUserId, CancellationToken cancellationToken)
    {
        var customerId = await db.Customers.AsNoTracking()
            .Where(x => x.IdentityUserId == identityUserId && !x.IsDeleted)
            .Select(x => (int?)x.CustomerId)
            .SingleOrDefaultAsync(cancellationToken);
        return customerId ?? throw new ServiceException(403, "customer_profile_required", "This account has no active customer profile.");
    }

    public async Task<CustomerProfileDto> GetProfileAsync(int customerId, CancellationToken cancellationToken)
    {
        var customer = await GetActiveCustomerAsync(customerId, cancellationToken);
        return ToProfile(customer);
    }

    public async Task<CustomerProfileDto> UpdateProfileAsync(
        int customerId,
        CustomerProfileUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var customer = await GetActiveCustomerAsync(customerId, cancellationToken);
        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        customer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToProfile(customer);
    }

    public async Task<IReadOnlyList<CustomerAddressDto>> GetAddressesAsync(int customerId, CancellationToken cancellationToken) =>
        await db.CustomerAddresses.AsNoTracking()
            .Where(x => x.CustomerId == customerId && !x.IsDeleted)
            .OrderByDescending(x => x.IsDefaultShipping)
            .ThenBy(x => x.CustomerAddressId)
            .Select(ToAddressProjection())
            .ToListAsync(cancellationToken);

    public async Task<CustomerAddressDto> GetAddressAsync(
        int customerId,
        int addressId,
        CancellationToken cancellationToken)
    {
        var address = await db.CustomerAddresses.AsNoTracking()
            .SingleOrDefaultAsync(x =>
                x.CustomerAddressId == addressId &&
                x.CustomerId == customerId &&
                !x.IsDeleted,
                cancellationToken);
        return address is null
            ? throw new ServiceException(404, "address_not_found", "Address was not found.")
            : ToAddress(address);
    }

    public async Task<CustomerAddressDto> CreateAddressAsync(
        int customerId,
        AddressWriteRequest request,
        CancellationToken cancellationToken)
    {
        await GetActiveCustomerAsync(customerId, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await LockCustomerAsync(customerId, cancellationToken);
        await ClearDefaultsAsync(customerId, request.IsDefaultShipping, request.IsDefaultBilling, null, cancellationToken);
        var address = new CustomerAddress
        {
            CustomerId = customerId,
            FullName = request.FullName.Trim(),
            Line1 = request.Line1.Trim(),
            Line2 = Normalize(request.Line2),
            City = request.City.Trim(),
            Region = Normalize(request.Region),
            PostalCode = Normalize(request.PostalCode),
            Country = request.Country.Trim(),
            Phone = Normalize(request.Phone),
            IsDefaultShipping = request.IsDefaultShipping,
            IsDefaultBilling = request.IsDefaultBilling,
            IsDeleted = false
        };
        db.CustomerAddresses.Add(address);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToAddress(address);
    }

    public async Task<CustomerAddressDto> UpdateAddressAsync(
        int customerId,
        int addressId,
        AddressWriteRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await LockCustomerAsync(customerId, cancellationToken);
        var address = await db.CustomerAddresses.SingleOrDefaultAsync(x =>
            x.CustomerAddressId == addressId && x.CustomerId == customerId && !x.IsDeleted,
            cancellationToken);
        if (address is null)
            throw new ServiceException(404, "address_not_found", "Address was not found.");

        await ClearDefaultsAsync(customerId, request.IsDefaultShipping, request.IsDefaultBilling, addressId, cancellationToken);
        ApplyAddress(address, request);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToAddress(address);
    }

    public async Task DeleteAddressAsync(int customerId, int addressId, CancellationToken cancellationToken)
    {
        var address = await db.CustomerAddresses.SingleOrDefaultAsync(x =>
            x.CustomerAddressId == addressId && x.CustomerId == customerId && !x.IsDeleted,
            cancellationToken);
        if (address is null)
            throw new ServiceException(404, "address_not_found", "Address was not found.");
        address.IsDeleted = true;
        address.DeletedAt = DateTime.UtcNow;
        address.IsDefaultBilling = false;
        address.IsDefaultShipping = false;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetDefaultAddressAsync(int customerId, int addressId, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await LockCustomerAsync(customerId, cancellationToken);
        var target = await db.CustomerAddresses.SingleOrDefaultAsync(x =>
            x.CustomerAddressId == addressId && x.CustomerId == customerId && !x.IsDeleted,
            cancellationToken);
        if (target is null)
            throw new ServiceException(404, "address_not_found", "Address was not found.");

        await ClearDefaultsAsync(customerId, true, true, addressId, cancellationToken);
        target.IsDefaultShipping = true;
        target.IsDefaultBilling = true;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<PagedResult<AdminCustomerDto>> GetCustomersAsync(int page, int size, CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Customers.AsNoTracking();
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new AdminCustomerDto(
                x.CustomerId, x.Email, x.FirstName, x.LastName, x.Phone, x.IsDeleted, x.CreatedAt))
            .ToListAsync(cancellationToken);
        return new PagedResult<AdminCustomerDto>(items, page, size, count);
    }

    public async Task SetCustomerStatusAsync(int customerId, bool active, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.SingleOrDefaultAsync(x => x.CustomerId == customerId, cancellationToken);
        if (customer is null)
            throw new ServiceException(404, "customer_not_found", "Customer was not found.");
        customer.IsDeleted = !active;
        customer.DeletedAt = active ? null : DateTime.UtcNow;
        customer.UpdatedAt = DateTime.UtcNow;
        audit.Record("Customers", customerId.ToString(), "Update", $"Set customer active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<AdminCustomerDto> GetAdminCustomerAsync(int customerId, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.CustomerId == customerId, cancellationToken);
        return customer is null
            ? throw new ServiceException(404, "customer_not_found", "Customer was not found.")
            : new AdminCustomerDto(
                customer.CustomerId,
                customer.Email,
                customer.FirstName,
                customer.LastName,
                customer.Phone,
                customer.IsDeleted,
                customer.CreatedAt);
    }

    private async Task<Customer> GetActiveCustomerAsync(int customerId, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.SingleOrDefaultAsync(x => x.CustomerId == customerId && !x.IsDeleted, cancellationToken);
        return customer ?? throw new ServiceException(404, "customer_not_found", "Customer profile was not found.");
    }

    private async Task LockCustomerAsync(int customerId, CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .FromSqlInterpolated($"SELECT * FROM dbo.Customers WITH (UPDLOCK, HOLDLOCK) WHERE CustomerId = {customerId}")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        if (customer is null || customer.IsDeleted)
            throw new ServiceException(404, "customer_not_found", "Customer profile was not found.");
    }

    private async Task ClearDefaultsAsync(
        int customerId,
        bool clearShipping,
        bool clearBilling,
        int? exceptAddressId,
        CancellationToken cancellationToken)
    {
        if (!clearShipping && !clearBilling)
            return;

        var addresses = await db.CustomerAddresses
            .Where(x => x.CustomerId == customerId && !x.IsDeleted &&
                        (!exceptAddressId.HasValue || x.CustomerAddressId != exceptAddressId.Value))
            .ToListAsync(cancellationToken);
        foreach (var address in addresses)
        {
            if (clearShipping)
                address.IsDefaultShipping = false;
            if (clearBilling)
                address.IsDefaultBilling = false;
        }
    }

    private static void ApplyAddress(CustomerAddress address, AddressWriteRequest request)
    {
        address.FullName = request.FullName.Trim();
        address.Line1 = request.Line1.Trim();
        address.Line2 = Normalize(request.Line2);
        address.City = request.City.Trim();
        address.Region = Normalize(request.Region);
        address.PostalCode = Normalize(request.PostalCode);
        address.Country = request.Country.Trim();
        address.Phone = Normalize(request.Phone);
        address.IsDefaultShipping = request.IsDefaultShipping;
        address.IsDefaultBilling = request.IsDefaultBilling;
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CustomerProfileDto ToProfile(Customer customer) =>
        new(customer.CustomerId, customer.Email, customer.FirstName, customer.LastName, customer.Phone, customer.CreatedAt);

    private static CustomerAddressDto ToAddress(CustomerAddress address) =>
        new(
            address.CustomerAddressId,
            address.FullName,
            address.Line1,
            address.Line2,
            address.City,
            address.Region,
            address.PostalCode,
            address.Country,
            address.Phone,
            address.IsDefaultShipping,
            address.IsDefaultBilling);

    private static System.Linq.Expressions.Expression<Func<CustomerAddress, CustomerAddressDto>> ToAddressProjection() =>
        x => new CustomerAddressDto(
            x.CustomerAddressId,
            x.FullName,
            x.Line1,
            x.Line2,
            x.City,
            x.Region,
            x.PostalCode,
            x.Country,
            x.Phone,
            x.IsDefaultShipping,
            x.IsDefaultBilling);

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}
