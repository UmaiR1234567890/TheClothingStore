using ClothingStore.Application.Services;
using ClothingStore.Domain.Constants;

namespace ClothingStore.UnitTests.Services;

public sealed class OrderTransitionPolicyTests
{
    [Fact]
    public void PendingCodOrderCanEnterProcessing()
    {
        Assert.True(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Pending,
            OrderStatuses.Processing,
            paymentCaptured: false,
            shipmentShipped: false,
            shipmentDelivered: false));
    }

    [Fact]
    public void OrderCannotBeMarkedPaidBeforePaymentCapture()
    {
        Assert.False(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Pending,
            OrderStatuses.Paid,
            paymentCaptured: false,
            shipmentShipped: false,
            shipmentDelivered: false));
    }

    [Fact]
    public void ProcessingOrderCannotShipWithoutShipment()
    {
        Assert.False(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Processing,
            OrderStatuses.Shipped,
            paymentCaptured: false,
            shipmentShipped: false,
            shipmentDelivered: false));
    }

    [Fact]
    public void ShippedOrderRequiresDeliveryAndPaymentBeforeCompletion()
    {
        Assert.False(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Shipped,
            OrderStatuses.Completed,
            paymentCaptured: true,
            shipmentShipped: true,
            shipmentDelivered: false));
        Assert.True(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Shipped,
            OrderStatuses.Completed,
            paymentCaptured: true,
            shipmentShipped: true,
            shipmentDelivered: true));
    }

    [Fact]
    public void CapturedOrderCannotBeCancelledWithoutRefundFlow()
    {
        Assert.False(OrderTransitionPolicy.IsAllowed(
            OrderStatuses.Processing,
            OrderStatuses.Cancelled,
            paymentCaptured: true,
            shipmentShipped: false,
            shipmentDelivered: false));
    }
}
