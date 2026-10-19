export interface DepartmentDto {
  departmentId: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryDto {
  categoryId: number;
  departmentId: number;
  parentCategoryId: number | null;
  name: string;
  slug: string;
  sortOrder: number;
  productCount: number;
  isActive: boolean;
  isDeleted: boolean;
}

export interface ProductImageDto {
  productImageId: number;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductAttributeDto {
  name: string;
  slug: string;
  value: string;
}

export interface VariantOptionDto {
  colorId: number | null;
  colorName: string | null;
  sizeId: number | null;
  sizeName: string | null;
  sizeType: string | null;
  volumeMl: number | null;
}

export interface ProductVariantDto {
  productVariantId: number;
  sku: string;
  options: VariantOptionDto;
  isActive: boolean;
  isDeleted: boolean;
  regularPrice: number;
  effectivePrice: number;
  onSale: boolean;
  quantityAvailable: number;
  isAvailable: boolean;
}

export interface ProductCardDto {
  productId: number;
  name: string;
  slug: string;
  brand: string | null;
  primaryImageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  onSale: boolean;
  isAvailable: boolean;
}

export interface ProductDetailDto {
  productId: number;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  status: string;
  isDeleted: boolean;
  createdAt: string;
  categories: CategoryDto[];
  departments: DepartmentDto[];
  images: ProductImageDto[];
  attributes: ProductAttributeDto[];
  variants: ProductVariantDto[];
}

export interface SaleDto {
  saleId: number;
  name: string;
  discountType: 'Percentage' | 'FixedAmount' | string;
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface ProductQuery {
  Department?: string;
  Category?: string;
  Search?: string;
  MinPrice?: number;
  MaxPrice?: number;
  ColorId?: number;
  SizeId?: number;
  VolumeMl?: number;
  Attribute?: string;
  OnSale?: boolean;
  Available?: boolean;
  SortBy?: 'newest' | 'name' | 'price-asc' | 'price-desc' | 'popular';
  PageNumber?: number;
  PageSize?: number;
}

export interface VariantAvailabilityDto {
  productVariantId: number;
  quantityAvailable: number;
  isAvailable: boolean;
}
