import { ProductVariantDto } from '../../core/models/catalog.models';
import { findVariant } from './variant-selection';

describe('findVariant', () => {
  const variants: ProductVariantDto[] = [
    {
      productVariantId: 1,
      sku: 'TEE-BLK-S',
      options: { colorId: 2, colorName: 'Black', sizeId: 3, sizeName: 'S', sizeType: 'Clothing', volumeMl: null },
      isActive: true,
      isDeleted: false,
      regularPrice: 4000,
      effectivePrice: 3600,
      onSale: true,
      quantityAvailable: 4,
      isAvailable: true,
    },
    {
      productVariantId: 2,
      sku: 'TEE-BLK-M',
      options: { colorId: 2, colorName: 'Black', sizeId: 4, sizeName: 'M', sizeType: 'Clothing', volumeMl: null },
      isActive: true,
      isDeleted: false,
      regularPrice: 4000,
      effectivePrice: 4000,
      onSale: false,
      quantityAvailable: 0,
      isAvailable: false,
    },
  ];

  it('requires the dimensions that identify a variant', () => {
    expect(findVariant(variants, { colorId: 2, sizeId: null, volumeMl: null })).toBeNull();
  });

  it('matches the server variant identifier and preserves out-of-stock status', () => {
    const result = findVariant(variants, { colorId: 2, sizeId: 4, volumeMl: null });

    expect(result?.productVariantId).toBe(2);
    expect(result?.isAvailable).toBeFalse();
  });
});
