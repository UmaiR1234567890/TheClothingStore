import { ProductImageDto, ProductVariantDto } from '../../core/models/catalog.models';
import { defaultColorIdForProduct, imagesForColor } from './product-image-gallery';

describe('product image galleries', () => {
  const image = (
    productImageId: number,
    colorId: number | null,
    isPrimary = false,
    displayOrder = 0,
  ): ProductImageDto => ({
    productImageId,
    imageUrl: `/images/${productImageId}.jpg`,
    altText: null,
    displayOrder,
    isPrimary,
    colorId,
    colorName: null,
  });

  const variant = (colorId: number | null): ProductVariantDto => ({
    productVariantId: 1,
    sku: 'TEST-1',
    options: {
      colorId,
      colorName: colorId === null ? null : 'Black',
      sizeId: null,
      sizeName: null,
      sizeType: null,
      volumeMl: null,
    },
    isActive: true,
    isDeleted: false,
    regularPrice: 1,
    effectivePrice: 1,
    onSale: false,
    quantityAvailable: 0,
    isAvailable: false,
  });

  it('uses only the selected color gallery and sorts its primary image first', () => {
    const images = [
      image(1, null, true),
      image(2, 4, false, 1),
      image(3, 4, true, 2),
      image(4, 5, true),
    ];

    expect(imagesForColor(images, 4).map((item) => item.productImageId)).toEqual([3, 2]);
  });

  it('falls back to shared images when the selected color has no gallery', () => {
    const images = [image(1, null, false, 2), image(2, null, true, 1), image(3, 5, true)];

    expect(imagesForColor(images, 4).map((item) => item.productImageId)).toEqual([2, 1]);
  });

  it('does not show another color gallery when no shared fallback exists', () => {
    expect(imagesForColor([image(1, 5, true)], 4)).toEqual([]);
  });

  it('defaults to the primary color gallery, then to the first variant color', () => {
    expect(defaultColorIdForProduct(
      [image(1, null, true), image(2, 4, true)],
      [variant(3)],
    )).toBe(4);

    expect(defaultColorIdForProduct([image(1, null, true)], [variant(3)])).toBe(3);
  });
});
