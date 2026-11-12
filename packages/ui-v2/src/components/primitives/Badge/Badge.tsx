import { BadgeBox, CountBox } from "./Badge.styles";
import type { BadgeProps, CountBadgeProps } from "./Badge.types";

/** Durum etiketi — H20, pad 0/8, pill, Tint bg + Text, 10 SemiBold, UPPERCASE +%4 tracking. */
export const Badge = ({ tone = "neutral", children, uppercase = true, className }: BadgeProps) => (
  <BadgeBox className={className} $tone={tone} $uppercase={uppercase}>
    {children}
  </BadgeBox>
);

Badge.displayName = "Badge";

/** Sayaç rozeti — H16, min W16, pad 0/5, Critical solid, 10 SemiBold On dark. */
export const CountBadge = ({ value, className }: CountBadgeProps) => (
  <CountBox className={className}>{value}</CountBox>
);

CountBadge.displayName = "CountBadge";
