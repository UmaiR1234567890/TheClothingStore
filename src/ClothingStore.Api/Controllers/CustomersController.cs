using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/customers/me")]
public sealed class CustomersController(ICustomerService customers) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<CustomerProfileDto>>> GetProfile(CancellationToken cancellationToken)
    {
        var profile = await customers.GetProfileAsync(await CustomerIdAsync(cancellationToken), cancellationToken);
        return Ok(ApiResponse<CustomerProfileDto>.Ok(profile));
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse<CustomerProfileDto>>> UpdateProfile(
        CustomerProfileUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var profile = await customers.UpdateProfileAsync(
            await CustomerIdAsync(cancellationToken),
            request,
            cancellationToken);
        return Ok(ApiResponse<CustomerProfileDto>.Ok(profile, "Profile updated."));
    }

    [HttpGet("addresses")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CustomerAddressDto>>>> GetAddresses(CancellationToken cancellationToken)
    {
        var addresses = await customers.GetAddressesAsync(await CustomerIdAsync(cancellationToken), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CustomerAddressDto>>.Ok(addresses));
    }

    [HttpGet("addresses/{id:int}")]
    public async Task<ActionResult<ApiResponse<CustomerAddressDto>>> GetAddress(int id, CancellationToken cancellationToken)
    {
        var address = await customers.GetAddressAsync(await CustomerIdAsync(cancellationToken), id, cancellationToken);
        return Ok(ApiResponse<CustomerAddressDto>.Ok(address));
    }

    [HttpPost("addresses")]
    public async Task<ActionResult<ApiResponse<CustomerAddressDto>>> CreateAddress(
        AddressWriteRequest request,
        CancellationToken cancellationToken)
    {
        var address = await customers.CreateAddressAsync(await CustomerIdAsync(cancellationToken), request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CustomerAddressDto>.Ok(address, "Address created."));
    }

    [HttpPut("addresses/{id:int}")]
    public async Task<ActionResult<ApiResponse<CustomerAddressDto>>> UpdateAddress(
        int id,
        AddressWriteRequest request,
        CancellationToken cancellationToken)
    {
        var address = await customers.UpdateAddressAsync(
            await CustomerIdAsync(cancellationToken), id, request, cancellationToken);
        return Ok(ApiResponse<CustomerAddressDto>.Ok(address, "Address updated."));
    }

    [HttpDelete("addresses/{id:int}")]
    public async Task<IActionResult> DeleteAddress(int id, CancellationToken cancellationToken)
    {
        await customers.DeleteAddressAsync(await CustomerIdAsync(cancellationToken), id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("addresses/{id:int}/default")]
    public async Task<ActionResult<ApiResponse<object>>> SetDefaultAddress(int id, CancellationToken cancellationToken)
    {
        await customers.SetDefaultAddressAsync(await CustomerIdAsync(cancellationToken), id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { addressId = id }, "Default shipping and billing address updated."));
    }

    private async Task<int> CustomerIdAsync(CancellationToken cancellationToken)
    {
        var identityId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(identityId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        return await customers.GetCustomerIdAsync(identityId, cancellationToken);
    }
}
