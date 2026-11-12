import type { IconProps } from "../types";

/** Figma 3315:12435 · icon_3315_12435.svg */
export const HistoryIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
    <path d="M17.25 10C17.25 14.0041 14.0041 17.25 10 17.25C5.99594 17.25 2.75 14.0041 2.75 10C2.75 5.99594 5.99594 2.75 10 2.75C14.0041 2.75 17.25 5.99594 17.25 10Z" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="9.25" y="5" width="1.5" height="5" fill="currentColor"/>
    <rect x="9.25" y="9" width="4" height="1.5" fill="currentColor"/>
    </svg>
);

HistoryIcon.displayName = "HistoryIcon";
