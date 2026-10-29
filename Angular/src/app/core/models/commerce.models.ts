import { VariantOptionDto } from './catalog.models';

export interface AuthUserDto {
  userId: string;
  email: string;
  customerId: number | null;
  roles: string[];
}

export interface AuthTokenDto {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUserDto;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordEmailRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface AddCartItemRequest {
  productVariantId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CustomerProfileDto {
  customerId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
}

export interface CustomerProfileUpdateRequest {
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface AddressWriteRequest {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface CustomerAddressDto extends AddressWriteRequest {
  customerAddressId: number;
}

export interface CartLineDto {
  cartItemId: number;
  productVariantId: number;
  productName: string;
  sku: string;
  productSlug: string | null;
  imageUrl: string | null;
  options: VariantOptionDto;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  quantityAvailable: number;
  isAvailable: boolean;
}

export interface CartDto {
  cartId: number;
  items: CartLineDto[];
  subtotal: number;
  totalQuantity: number;
}

export interface CheckoutRequest {
  guestEmail?: string | null;
  shippingAddressId?: number | null;
  guestShippingAddress?: GuestShippingAddressRequest | null;
  paymentMethod: 'COD';
  idempotencyKey: string;
}

export interface GuestShippingAddressRequest {
  fullName: string;
  line1: string;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
}

export interface CheckoutValidationDto {
  isValid: boolean;
  errors: string[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface OrderItemDto {
  productName: string;
  sku: string;
  variantDetails: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  productVariantId: number | null;
}

export interface PaymentDto {
  paymentId: number;
  orderId: number;
  amount: number;
  method: string;
  provider: string | null;
  providerReference: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
  orderNumber?: string | null;
}

export interface ShipmentDto {
  shipmentId: number;
  orderId: number;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  orderNumber?: string | null;
}

export interface OrderDto {
  orderId: number;
  orderNumber: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  placedAt: string;
  guestEmail: string | null;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  items: OrderItemDto[];
  payments: PaymentDto[];
  shipments: ShipmentDto[];
}

export interface CheckoutResultDto {
  order: OrderDto;
  paymentStatus: string;
  message: string;
  wasAlreadyProcessed: boolean;
}

export interface NewsletterEmailRequest {
  email: string;
}

export interface NewsletterResultDto {
  status: string;
}
