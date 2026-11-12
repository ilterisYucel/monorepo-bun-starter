/** Türkçe ondalık ayraçlı sayı biçimlendirici. */
export const formatNumber = (value: number, digits = 1): string =>
  value.toFixed(digits).replace(".", ",");

export const formatPercent = (value: number, digits = 1): string =>
  `${formatNumber(value, digits)} %`;
