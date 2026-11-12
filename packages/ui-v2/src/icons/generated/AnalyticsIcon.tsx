import type { IconProps } from "../types";

/** Figma 3315:12421 · icon_3315_12421.svg */
export const AnalyticsIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
    <rect x="2" y="11" width="3" height="7" rx="1" fill="currentColor"/>
    <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor"/>
    <rect x="12" y="9" width="3" height="9" rx="1" fill="currentColor"/>
    <rect x="17" y="3" width="2" height="15" rx="1" fill="currentColor"/>
    </svg>
);

AnalyticsIcon.displayName = "AnalyticsIcon";
