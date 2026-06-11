// packages/ui/src/components/RackCard/utils.ts

export const formatTelemetryValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "N/A";
  return value.toFixed(1);
};

export const formatValue = (
  value: number | null | undefined,
  unit: string,
  decimals: number = 1,
): string => {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(decimals)} ${unit}`;
};