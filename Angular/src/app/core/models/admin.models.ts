export interface AdminProductCardDto {
  productId: number;
  name: string;
  slug: string;
  brand: string | null;
  status: string;
  isDeleted: boolean;
  primaryImageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  variantCount: number;
}

export interface ProductAttributeInput {
  slug: string;
  value: string;
}

export interface ProductWriteRequest {
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  status: 'Draft' | 'Active' | 'Inactive';
  departmentIds: number[];
  categoryIds: number[];
  attributes: ProductAttributeInput[];
}

export interface VariantWriteRequest {
  sku: string;
  colorId: number | null;
  sizeId: number | null;
  volumeMl: number | null;
  regularPrice: number;
  isActive: boolean;
}

export interface ProductImageWriteRequest {
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  colorId: number | null;
}

export interface ProductImageUploadMetadata {
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  colorId: number | null;
}

export interface DepartmentWriteRequest {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface CategoryWriteRequest {
  departmentId: number;
  parentCategoryId: number | null;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ProductAttributeDefinitionDto {
  productAttributeId: number;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface ProductAttributeDefinitionWriteRequest {
  name: string;
  slug: string;
}

export interface SaleWriteRequest {
  name: string;
  discountType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  productIds: number[];
}

export interface InventoryAdjustmentRequest {
  productVariantId: number;
  quantityChange: number;
  reason: string;
}

export interface InventoryDto {
  productVariantId: number;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  updatedAt: string;
}

export interface InventoryTransactionDto {
  inventoryTransactionId: number;
  productVariantId: number;
  sku: string;
  transactionType: string;
  quantityChange: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdAt: string;
}

export interface AdminCustomerDto {
  customerId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface DashboardSummaryDto {
  productCount: number;
  customerCount: number;
  pendingOrderCount: number;
  capturedRevenue: number;
}

export interface StatusUpdateRequest {
  status: string;
}

export interface ShipmentWriteRequest {
  orderId: number;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
}

export interface PaymentStatusUpdateRequest {
  status: 'Captured';
  reason: string;
}
