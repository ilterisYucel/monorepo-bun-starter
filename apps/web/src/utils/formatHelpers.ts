// frontend/src/utils/formatHelpers.ts

export const formatTelemetryValue = (
  value: number | string | boolean,
): string => {
  if (typeof value !== "number") return String(value);

  // Çok küçük sayıları 0 olarak göster
  if (Math.abs(value) < 0.000001) return "0";

  // 1'den büyük sayıları 2 haneli ondalık
  if (Math.abs(value) >= 1) return value.toFixed(2);

  // Küçük sayıları 4 haneli ondalık
  return value.toFixed(4);
};
