using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/shipments")]
public sealed class AdminShipmentsController(IShipmentService shipments) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ShipmentDto>>>> GetShipments(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<ShipmentDto>>.Ok(
            await shipments.GetAdminShipmentsAsync(pageNumber, pageSize, cancellationToken)));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ShipmentDto>>> Create(
        ShipmentWriteRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await shipments.CreateShipmentAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ShipmentDto>.Ok(shipment, "Shipment created."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ShipmentDto>>> Update(
        int id,
        ShipmentWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ShipmentDto>.Ok(await shipments.UpdateShipmentAsync(id, request, cancellationToken)));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<ShipmentDto>>> UpdateStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ShipmentDto>.Ok(
            await shipments.UpdateShipmentStatusAsync(id, request.Status, cancellationToken)));
}
