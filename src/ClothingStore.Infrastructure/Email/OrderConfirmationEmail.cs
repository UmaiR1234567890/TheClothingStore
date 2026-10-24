using System.Globalization;
using System.Net;
using System.Text;
using ClothingStore.Domain.Entities;

namespace ClothingStore.Infrastructure.Email;

internal static class OrderConfirmationEmail
{
    private const string Brand = "The Clothing Store";

    public static (string Subject, string Html, string Text) Build(Order order)
    {
        var subject = $"Order confirmed — {order.OrderNumber}";
        var name = string.IsNullOrWhiteSpace(order.ShippingName) ? "there" : order.ShippingName.Trim();

        var rows = new StringBuilder();
        foreach (var item in order.Items)
        {
            var details = string.IsNullOrWhiteSpace(item.VariantDetails)
                ? string.Empty
                : $"<br><span style=\"color:#70756d;font-size:12px;\">{Enc(item.VariantDetails)} · SKU {Enc(item.Sku)}</span>";
            var discount = item.DiscountAmount > 0
                ? $"<br><span style=\"color:#365c43;font-size:11px;\">You saved {Money(item.DiscountAmount)}</span>"
                : string.Empty;
            rows.Append($"""
                <tr>
                  <td style="padding:12px 14px;border-bottom:1px solid #ece9e1;font-size:13px;color:#202420;">
                    <strong>{Enc(item.ProductName)}</strong>{details}{discount}
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid #ece9e1;font-size:13px;color:#202420;text-align:center;">{item.Quantity}</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #ece9e1;font-size:13px;color:#202420;text-align:right;">{Money(item.UnitPrice)}</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #ece9e1;font-size:13px;color:#202420;text-align:right;font-weight:600;">{Money(item.LineTotal)}</td>
                </tr>
                """);
        }

        var discountRow = order.DiscountAmount > 0
            ? $"""
                <tr>
                  <td style="padding:6px 14px;font-size:13px;color:#70756d;">Discount</td>
                  <td style="padding:6px 14px;font-size:13px;color:#365c43;text-align:right;">−{Money(order.DiscountAmount)}</td>
                </tr>
                """
            : string.Empty;

        var address = string.Join(", ", new[]
            {
                order.ShippingLine1, order.ShippingCity, order.ShippingRegion, order.ShippingPostalCode, order.ShippingCountry
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => Enc(x!.Trim())));

        var payment = order.Payments.OrderByDescending(x => x.CreatedAt).FirstOrDefault();
        var paymentNote = payment is null
            ? "No payment was required for this order."
            : string.Equals(payment.Method, "CashOnDelivery", StringComparison.OrdinalIgnoreCase)
                ? "Cash on delivery — please keep the order total ready when your parcel arrives."
                : $"Payment method: {Enc(payment.Method)} · Status: {Enc(payment.Status)}";

        var html = $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f6f4ef;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
                <div style="background:#202420;padding:22px 28px;text-align:center;">
                  <div style="color:#fffefa;font-family:Georgia,serif;font-size:20px;letter-spacing:0.14em;">THE CLOTHING STORE</div>
                  <div style="color:#b8beaf;font-size:10px;letter-spacing:0.22em;margin-top:6px;">ORDER CONFIRMATION</div>
                </div>
                <div style="background:#fffefa;border:1px solid #e5e4de;border-top:0;padding:28px;">
                  <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#202420;">Thank you, {{Enc(name)}}.</h1>
                  <p style="margin:0 0 20px;font-size:13px;color:#70756d;line-height:1.6;">
                    Your order has been placed successfully. We'll let you know when it's on its way.
                  </p>
                  <table role="presentation" style="width:100%;border-collapse:collapse;background:#fbfbf8;border:1px solid #e5e4de;margin-bottom:22px;">
                    <tr>
                      <td style="padding:10px 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#70756d;">Order number</td>
                      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#202420;text-align:right;">{{Enc(order.OrderNumber)}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#70756d;border-top:1px solid #ece9e1;">Placed</td>
                      <td style="padding:10px 14px;font-size:13px;color:#202420;text-align:right;border-top:1px solid #ece9e1;">{{order.PlacedAt.ToString("dd MMM yyyy, HH:mm 'UTC'", CultureInfo.InvariantCulture)}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#70756d;border-top:1px solid #ece9e1;">Payment</td>
                      <td style="padding:10px 14px;font-size:13px;color:#202420;text-align:right;border-top:1px solid #ece9e1;">{{paymentNote}}</td>
                    </tr>
                  </table>

                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
                    <thead>
                      <tr style="background:#f6f4ef;">
                        <th style="padding:10px 14px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#70756d;text-align:left;">Item</th>
                        <th style="padding:10px 14px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#70756d;text-align:center;">Qty</th>
                        <th style="padding:10px 14px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#70756d;text-align:right;">Price</th>
                        <th style="padding:10px 14px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#70756d;text-align:right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>{{rows}}</tbody>
                  </table>

                  <table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 22px;">
                    <tr>
                      <td style="padding:6px 14px;font-size:13px;color:#70756d;">Subtotal</td>
                      <td style="padding:6px 14px;font-size:13px;color:#202420;text-align:right;">{{Money(order.SubtotalAmount)}}</td>
                    </tr>
                    {{discountRow}}
                    <tr>
                      <td style="padding:6px 14px;font-size:13px;color:#70756d;">Shipping</td>
                      <td style="padding:6px 14px;font-size:13px;color:#202420;text-align:right;">{{(order.ShippingAmount <= 0 ? "Free" : Money(order.ShippingAmount))}}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#202420;border-top:2px solid #202420;">Order total</td>
                      <td style="padding:12px 14px;font-size:16px;font-weight:700;color:#202420;text-align:right;border-top:2px solid #202420;">{{Money(order.TotalAmount)}}</td>
                    </tr>
                  </table>

                  <div style="border:1px solid #e5e4de;background:#fbfbf8;padding:16px 18px;margin-bottom:22px;">
                    <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#70756d;margin-bottom:6px;">Deliver to</div>
                    <div style="font-size:13px;color:#202420;line-height:1.6;">
                      <strong>{{Enc(order.ShippingName ?? name)}}</strong><br>{{address}}
                    </div>
                  </div>

                  <p style="margin:0;font-size:12px;color:#70756d;line-height:1.6;">
                    Questions about your order? Just reply to this email and quote your order number.
                  </p>
                </div>
                <div style="padding:20px 8px;text-align:center;font-size:10px;letter-spacing:0.14em;color:#70756d;text-transform:uppercase;">
                  {{Brand}} · {{Enc(order.OrderNumber)}}
                </div>
              </div>
            </body>
            </html>
            """;

        var text = new StringBuilder()
            .AppendLine($"{Brand} — order confirmation")
            .AppendLine($"Order {order.OrderNumber} placed {order.PlacedAt:dd MMM yyyy, HH:mm} UTC.")
            .AppendLine();
        foreach (var item in order.Items)
            text.AppendLine($"- {item.ProductName} ({item.VariantDetails ?? item.Sku}) x{item.Quantity} — {Money(item.LineTotal)}");
        text.AppendLine()
            .AppendLine($"Subtotal: {Money(order.SubtotalAmount)}")
            .AppendLine($"Discount: -{Money(order.DiscountAmount)}")
            .AppendLine($"Shipping: {(order.ShippingAmount <= 0 ? "Free" : Money(order.ShippingAmount))}")
            .AppendLine($"Total: {Money(order.TotalAmount)}")
            .AppendLine()
            .AppendLine($"Deliver to: {order.ShippingName}, {address}");

        return (subject, html, text.ToString());
    }

    private static string Money(decimal amount) =>
        $"PKR {amount.ToString("N2", CultureInfo.InvariantCulture)}";

    private static string Enc(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);
}
