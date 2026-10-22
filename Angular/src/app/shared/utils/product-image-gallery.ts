import { ProductImageDto, ProductVariantDto } from '../../core/models/catalog.models';

export function defaultColorIdForProduct(
  images: readonly ProductImageDto[],
  variants: readonly ProductVariantDto[],
): number | null {
  const primaryColorId = images.find((image) => image.isPrimary && image.colorId != null)?.colorId;
  return primaryColorId ?? variants.find((variant) => variant.options.colorId !== null)?.options.colorId ?? null;
}

export function imagesForColor(
  images: readonly ProductImageDto[],
  colorId: number | null,
): ProductImageDto[] {
  const sortImages = (items: readonly ProductImageDto[]) =>
    [...items].sort((left, right) =>
      Number(right.isPrimary) - Number(left.isPrimary) ||
      left.displayOrder - right.displayOrder ||
      left.productImageId - right.productImageId);

  if (colorId !== null) {
    const colorImages = images.filter((image) => image.colorId === colorId);
    if (colorImages.length > 0) {
      return sortImages(colorImages);
    }
  }

  const sharedImages = images.filter((image) => image.colorId == null);
  if (sharedImages.length > 0) {
    return sortImages(sharedImages);
  }

  return colorId === null ? sortImages(images) : [];
}
