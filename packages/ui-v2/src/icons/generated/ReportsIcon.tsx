import type { IconProps } from "../types";

/** Figma 3315:12428 · icon_3315_12428.svg */
export const ReportsIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
    <path d="M5.5 2.25H14.5C15.1904 2.25 15.75 2.80964 15.75 3.5V16.5C15.75 17.1904 15.1904 17.75 14.5 17.75H5.5C4.80964 17.75 4.25 17.1904 4.25 16.5V3.5C4.25 2.80964 4.80964 2.25 5.5 2.25Z" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="6.5" y="6" width="7" height="1.5" fill="currentColor"/>
    <rect x="6.5" y="9.5" width="7" height="1.5" fill="currentColor"/>
    <rect x="6.5" y="13" width="7" height="1.5" fill="currentColor"/>
    </svg>
);

ReportsIcon.displayName = "ReportsIcon";
