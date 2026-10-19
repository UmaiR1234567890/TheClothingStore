import { ProductVariantDto } from '../../core/models/catalog.models';

export interface VariantSelection {
  colorId: number | null;
  sizeId: number | null;
  volumeMl: number | null;
}

export function findVariant(
  variants: ProductVariantDto[],
  selection: VariantSelection,
): ProductVariantDto | null {
  if (variants.length === 1) {
    return variants[0];
  }
  const needsColor = variants.some((variant) => variant.options.colorId !== null);
  const needsSize = variants.some((variant) => variant.options.sizeId !== null);
  const needsVolume = variants.some((variant) => variant.options.volumeMl !== null);

  if ((needsColor && selection.colorId === null) ||
      (needsSize && selection.sizeId === null) ||
      (needsVolume && selection.volumeMl === null)) {
    return null;
  }

  return variants.find((variant) =>
    variant.options.colorId === selection.colorId &&
    variant.options.sizeId === selection.sizeId &&
    variant.options.volumeMl === selection.volumeMl) ?? null;
}
