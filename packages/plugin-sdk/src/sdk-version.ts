interface VersionTuple {
  major: number;
  minor: number;
  patch: number;
}

interface Constraint {
  op: ">=" | "<";
  version: VersionTuple;
}

function parseVersion(raw: string): VersionTuple {
  const parts = raw.trim().split(".");
  const nums = parts.map((p) => Number(p));
  if (
    parts.length !== 3 ||
    nums.some((n) => !Number.isInteger(n) || n < 0)
  ) {
    throw new Error(`[SemVerRange] Gecersiz versiyon: "${raw}"`);
  }
  return { major: nums[0]!, minor: nums[1]!, patch: nums[2]! };
}

function compare(a: VersionTuple, b: VersionTuple): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Minimal semver araligi — plugin manifest sdkVersion alani icin yeterlidir.
 * Sadece ">=" ve "<" operatorlerini destekler: `">=1.0.0 <2.0.0"`.
 */
export class SemVerRange {
  private readonly constraints: Constraint[];

  constructor(expression: string) {
    const tokens = expression.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 0) {
      throw new Error("[SemVerRange] Bos aralik ifadesi");
    }
    this.constraints = tokens.map((token) => {
      let op: ">=" | "<";
      if (token.startsWith(">=")) {
        op = ">=";
      } else if (token.startsWith("<")) {
        op = "<";
      } else {
        throw new Error(
          `[SemVerRange] Desteklenmeyen operator: "${token}" (sadece >= ve <)`,
        );
      }
      return { op, version: parseVersion(token.replace(/^(>=|<)/, "")) };
    });
  }

  /** Sorgu — versiyon bu araliga dahil mi? */
  includes(version: string): boolean {
    const v = parseVersion(version);
    return this.constraints.every((c) => {
      const cmp = compare(v, c.version);
      return c.op === ">=" ? cmp >= 0 : cmp < 0;
    });
  }
}
