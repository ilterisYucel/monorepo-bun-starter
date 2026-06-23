// packages/simulators/src/xrack/math.ts

export const SOC_POINTS: number[] = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
];

export const VOLTAGE_POINTS: number[] = [
  1101.6, 1224, 1272.96, 1297.44, 1313.76, 1326, 1334.16, 1342.32, 1348.44,
  1352.52, 1356.6, 1360.68, 1366.8, 1374.96, 1387.2, 1403.52, 1423.92, 1436.16,
  1456.56, 1464.72, 1468.8,
];

export const CAPACITY_POINTS: number[] = [
  0, 178.4, 356.8, 535.2, 713.6, 892, 1070.4, 1248.8, 1427.2, 1605.6, 1784,
  1962.4, 2140.8, 2319.2, 2497.6, 2676, 2854.4, 3032.8, 3211.2, 3389.6, 3568,
];

export const SYSTEM_CAPACITY_KWH = 3568.0;
export const MAX_SOC_PERCENT = 97.0;
export const MIN_SOC_PERCENT = 3.5;

function interpolate(
  x: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
): number {
  if (x2 === x1) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

export function capacityToSocVoltage(capacityKwh: number): {
  soc: number;
  voltage: number;
} {
  const firstCap = CAPACITY_POINTS[0] as number;
  const lastCap = CAPACITY_POINTS[CAPACITY_POINTS.length - 1] as number;

  if (capacityKwh <= firstCap) {
    return {
      soc: SOC_POINTS[0] as number,
      voltage: VOLTAGE_POINTS[0] as number,
    };
  }
  if (capacityKwh >= lastCap) {
    return {
      soc: SOC_POINTS[SOC_POINTS.length - 1] as number,
      voltage: VOLTAGE_POINTS[VOLTAGE_POINTS.length - 1] as number,
    };
  }

  for (let i = 0; i < CAPACITY_POINTS.length - 1; i++) {
    const cap1 = CAPACITY_POINTS[i] as number;
    const cap2 = CAPACITY_POINTS[i + 1] as number;

    if (capacityKwh >= cap1 && capacityKwh <= cap2) {
      const soc1 = SOC_POINTS[i] as number;
      const soc2 = SOC_POINTS[i + 1] as number;
      const volt1 = VOLTAGE_POINTS[i] as number;
      const volt2 = VOLTAGE_POINTS[i + 1] as number;

      return {
        soc: interpolate(capacityKwh, cap1, cap2, soc1, soc2),
        voltage: interpolate(capacityKwh, cap1, cap2, volt1, volt2),
      };
    }
  }

  return {
    soc: SOC_POINTS[SOC_POINTS.length - 1] as number,
    voltage: VOLTAGE_POINTS[VOLTAGE_POINTS.length - 1] as number,
  };
}

export function socToCapacity(socPercent: number): number {
  const firstSoc = SOC_POINTS[0] as number;
  const lastSoc = SOC_POINTS[SOC_POINTS.length - 1] as number;

  if (socPercent <= firstSoc) return CAPACITY_POINTS[0] as number;
  if (socPercent >= lastSoc)
    return CAPACITY_POINTS[CAPACITY_POINTS.length - 1] as number;

  for (let i = 0; i < SOC_POINTS.length - 1; i++) {
    const soc1 = SOC_POINTS[i] as number;
    const soc2 = SOC_POINTS[i + 1] as number;

    if (socPercent >= soc1 && socPercent <= soc2) {
      const cap1 = CAPACITY_POINTS[i] as number;
      const cap2 = CAPACITY_POINTS[i + 1] as number;
      return interpolate(socPercent, soc1, soc2, cap1, cap2);
    }
  }

  return CAPACITY_POINTS[CAPACITY_POINTS.length - 1] as number;
}

export const MAX_USABLE_CAPACITY_KWH = Math.min(
  socToCapacity(MAX_SOC_PERCENT),
  SYSTEM_CAPACITY_KWH,
);
