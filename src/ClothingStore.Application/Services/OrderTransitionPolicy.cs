using ClothingStore.Domain.Constants;

namespace ClothingStore.Application.Services;

public static class OrderTransitionPolicy
{
    public static bool IsAllowed(
        string current,
        string next,
        bool paymentCaptured,
        bool shipmentShipped,
        bool shipmentDelivered)
    {
        return current switch
        {
            OrderStatuses.Pending => next switch
            {
                OrderStatuses.Processing or OrderStatuses.Cancelled => !paymentCaptured,
                OrderStatuses.Paid => paymentCaptured,
                _ => false
            },
            OrderStatuses.Paid => next == OrderStatuses.Processing,
            OrderStatuses.Processing => next switch
            {
                OrderStatuses.Shipped => shipmentShipped,
                OrderStatuses.Cancelled => !paymentCaptured,
                OrderStatuses.Paid => paymentCaptured,
                _ => false
            },
            OrderStatuses.Shipped => next == OrderStatuses.Completed && shipmentDelivered && paymentCaptured,
            _ => false
        };
    }
}
