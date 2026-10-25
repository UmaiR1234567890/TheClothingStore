using ClothingStore.Application.DTOs;

namespace ClothingStore.Application.Contracts;

public interface ICatalogService
{
    Task<IReadOnlyList<DepartmentDto>> GetDepartmentsAsync(CancellationToken cancellationToken);
    Task<DepartmentDto?> GetDepartmentAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> GetDepartmentCategoriesAsync(string slug, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(int? departmentId, CancellationToken cancellationToken);
    Task<CategoryDto?> GetCategoryAsync(int id, CancellationToken cancellationToken);
    Task<CategoryDto?> GetCategoryBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> GetChildrenAsync(int id, CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken);
    Task<ProductDetailDto?> GetProductAsync(int id, CancellationToken cancellationToken);
    Task<ProductDetailDto?> GetProductBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetFeaturedAsync(int page, int size, CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetNewArrivalsAsync(int page, int size, CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetOnSaleAsync(int page, int size, CancellationToken cancellationToken);
    Task<PagedResult<ProductCardDto>> GetCategoryProductsAsync(int categoryId, int page, int size, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductVariantDto>> GetProductVariantsAsync(int productId, CancellationToken cancellationToken);
    Task<ProductVariantDto?> GetVariantAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<SaleDto>> GetActiveSalesAsync(CancellationToken cancellationToken);
    Task<SaleDto?> GetSaleAsync(int id, CancellationToken cancellationToken);
}

public interface IAuthService
{
    Task<AuthTokenDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthTokenDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthUserDto> GetCurrentUserAsync(string identityUserId, CancellationToken cancellationToken);
    Task ChangePasswordAsync(string identityUserId, ChangePasswordRequest request, CancellationToken cancellationToken);
    Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
}

public interface ICustomerService
{
    Task<int> GetCustomerIdAsync(string identityUserId, CancellationToken cancellationToken);
    Task<CustomerProfileDto> GetProfileAsync(int customerId, CancellationToken cancellationToken);
    Task<CustomerProfileDto> UpdateProfileAsync(int customerId, CustomerProfileUpdateRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<CustomerAddressDto>> GetAddressesAsync(int customerId, CancellationToken cancellationToken);
    Task<CustomerAddressDto> GetAddressAsync(int customerId, int addressId, CancellationToken cancellationToken);
    Task<CustomerAddressDto> CreateAddressAsync(int customerId, AddressWriteRequest request, CancellationToken cancellationToken);
    Task<CustomerAddressDto> UpdateAddressAsync(int customerId, int addressId, AddressWriteRequest request, CancellationToken cancellationToken);
    Task DeleteAddressAsync(int customerId, int addressId, CancellationToken cancellationToken);
    Task SetDefaultAddressAsync(int customerId, int addressId, CancellationToken cancellationToken);
    Task<PagedResult<AdminCustomerDto>> GetCustomersAsync(int page, int size, CancellationToken cancellationToken);
    Task<AdminCustomerDto> GetAdminCustomerAsync(int customerId, CancellationToken cancellationToken);
    Task SetCustomerStatusAsync(int customerId, bool active, CancellationToken cancellationToken);
}

public interface ICartService
{
    Task<(CartDto Cart, Guid? GuestToken)> GetAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken);
    Task<CartDto> AddItemAsync(int? customerId, Guid? guestToken, AddCartItemRequest request, CancellationToken cancellationToken);
    Task<CartDto> UpdateItemAsync(int? customerId, Guid? guestToken, int cartItemId, int quantity, CancellationToken cancellationToken);
    Task RemoveItemAsync(int? customerId, Guid? guestToken, int cartItemId, CancellationToken cancellationToken);
    Task ClearAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken);
    Task<CartDto> MergeAsync(int customerId, Guid guestToken, CancellationToken cancellationToken);
}

public interface ICheckoutService
{
    Task<CheckoutValidationDto> ValidateAsync(int? customerId, Guid? guestToken, CheckoutRequest request, CancellationToken cancellationToken);
    Task<CheckoutResultDto> CheckoutAsync(int? customerId, Guid? guestToken, CheckoutRequest request, CancellationToken cancellationToken);
}

public interface IOrderService
{
    Task<PagedResult<OrderDto>> GetCustomerOrdersAsync(int customerId, int page, int size, string? status, CancellationToken cancellationToken);
    Task<OrderDto> GetCustomerOrderAsync(int customerId, int orderId, CancellationToken cancellationToken);
    Task<OrderDto> GetOrderTrackingAsync(int customerId, int orderId, CancellationToken cancellationToken);
    Task<OrderDto> GetGuestOrderTrackingAsync(string orderNumber, string email, CancellationToken cancellationToken);
    Task<PagedResult<OrderDto>> GetAdminOrdersAsync(int page, int size, string? status, string? search, CancellationToken cancellationToken);
    Task<OrderDto> GetAdminOrderAsync(int orderId, CancellationToken cancellationToken);
    Task<OrderDto> UpdateStatusAsync(int orderId, string status, string actorId, CancellationToken cancellationToken);
}

public interface IPaymentService
{
    Task<PaymentDto?> GetCustomerPaymentAsync(int customerId, int orderId, CancellationToken cancellationToken);
    Task<PaymentDto> InitiateCustomerPaymentAsync(int customerId, int orderId, string method, CancellationToken cancellationToken);
    Task<PagedResult<PaymentDto>> GetAdminPaymentsAsync(int page, int size, string? search, CancellationToken cancellationToken);
    Task<PaymentDto> GetAdminPaymentAsync(int paymentId, CancellationToken cancellationToken);
    Task<PaymentDto> MarkCashCollectedAsync(int paymentId, string actorId, string reason, CancellationToken cancellationToken);
    Task<PaymentDto> RefundPaymentAsync(int paymentId, string actorId, string reason, CancellationToken cancellationToken);
}

public interface INewsletterService
{
    Task<NewsletterResultDto> SubscribeAsync(string email, CancellationToken cancellationToken);
    Task<NewsletterResultDto> UnsubscribeAsync(string email, CancellationToken cancellationToken);
}

public interface ICatalogAdminService
{
    Task<PagedResult<AdminProductCardDto>> GetProductsAsync(int page, int size, string? search, CancellationToken cancellationToken);
    Task<ProductDetailDto> GetProductAsync(int productId, CancellationToken cancellationToken);
    Task<ProductDetailDto> CreateProductAsync(ProductWriteRequest request, CancellationToken cancellationToken);
    Task<ProductDetailDto> UpdateProductAsync(int productId, ProductWriteRequest request, CancellationToken cancellationToken);
    Task SetProductStatusAsync(int productId, string status, CancellationToken cancellationToken);
    Task DeleteProductAsync(int productId, CancellationToken cancellationToken);
    Task<ProductVariantDto> CreateVariantAsync(int productId, VariantWriteRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductVariantDto>> CreateVariantsAsync(int productId, VariantBulkWriteRequest request, CancellationToken cancellationToken);
    Task<ProductVariantDto> UpdateVariantAsync(int variantId, VariantWriteRequest request, CancellationToken cancellationToken);
    Task SetVariantStatusAsync(int variantId, bool active, CancellationToken cancellationToken);
    Task<ProductImageDto> CreateImageAsync(int productId, ProductImageWriteRequest request, CancellationToken cancellationToken);
    Task<ProductImageDto> UpdateImageAsync(int imageId, ProductImageWriteRequest request, CancellationToken cancellationToken);
    Task DeleteImageAsync(int imageId, CancellationToken cancellationToken);
    Task SetPrimaryImageAsync(int imageId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DepartmentDto>> GetAdminDepartmentsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ColorOptionDto>> GetAdminColorsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<SizeOptionDto>> GetAdminSizesAsync(CancellationToken cancellationToken);
    Task<DepartmentDto> CreateDepartmentAsync(DepartmentWriteRequest request, CancellationToken cancellationToken);
    Task<DepartmentDto> UpdateDepartmentAsync(int id, DepartmentWriteRequest request, CancellationToken cancellationToken);
    Task SetDepartmentStatusAsync(int id, bool active, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> GetAdminCategoriesAsync(int? departmentId, CancellationToken cancellationToken);
    Task<CategoryDto> CreateCategoryAsync(CategoryWriteRequest request, CancellationToken cancellationToken);
    Task<CategoryDto> UpdateCategoryAsync(int id, CategoryWriteRequest request, CancellationToken cancellationToken);
    Task SetCategoryStatusAsync(int id, bool active, CancellationToken cancellationToken);
    Task DeleteCategoryAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductAttributeDefinitionDto>> GetAttributeDefinitionsAsync(CancellationToken cancellationToken);
    Task<ProductAttributeDefinitionDto> CreateAttributeDefinitionAsync(ProductAttributeDefinitionWriteRequest request, CancellationToken cancellationToken);
    Task<ProductAttributeDefinitionDto> UpdateAttributeDefinitionAsync(int id, ProductAttributeDefinitionWriteRequest request, CancellationToken cancellationToken);
    Task SetAttributeDefinitionStatusAsync(int id, bool active, CancellationToken cancellationToken);
}

public interface IPricingAdminService
{
    Task<PagedResult<SaleDto>> GetSalesAsync(int page, int size, CancellationToken cancellationToken);
    Task<SaleDto> CreateSaleAsync(SaleWriteRequest request, CancellationToken cancellationToken);
    Task<SaleDto> UpdateSaleAsync(int id, SaleWriteRequest request, CancellationToken cancellationToken);
    Task SetSaleStatusAsync(int id, bool active, CancellationToken cancellationToken);
    Task DeleteSaleAsync(int id, CancellationToken cancellationToken);
}

public interface IInventoryService
{
    Task<PagedResult<InventoryDto>> GetInventoryAsync(int page, int size, string? search, CancellationToken cancellationToken);
    Task<InventoryDto> GetVariantInventoryAsync(int variantId, CancellationToken cancellationToken);
    Task<InventoryDto> AdjustAsync(InventoryAdjustmentRequest request, string actorId, CancellationToken cancellationToken);
    Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(int page, int size, int? variantId, CancellationToken cancellationToken);
}

public interface IShipmentService
{
    Task<PagedResult<ShipmentDto>> GetAdminShipmentsAsync(int page, int size, CancellationToken cancellationToken);
    Task<ShipmentDto> CreateShipmentAsync(ShipmentWriteRequest request, CancellationToken cancellationToken);
    Task<ShipmentDto> UpdateShipmentAsync(int id, ShipmentWriteRequest request, CancellationToken cancellationToken);
    Task<ShipmentDto> UpdateShipmentStatusAsync(int id, string status, CancellationToken cancellationToken);
    Task<IReadOnlyList<CarrierDto>> GetCarriersAsync(CancellationToken cancellationToken);
}

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken);
}

public interface IPricingCalculator
{
    EffectivePrice Calculate(decimal regularPrice, IEnumerable<DiscountCandidate> candidates, DateTime utcNow);
}

public sealed record DiscountCandidate(
    string Name,
    string DiscountType,
    decimal DiscountValue,
    DateTime? StartsAt,
    DateTime? EndsAt,
    bool IsActive,
    bool IsDeleted);

public sealed record EffectivePrice(decimal Amount, bool IsOnSale, string? SaleName, DateTime? SaleEndsAt = null);
