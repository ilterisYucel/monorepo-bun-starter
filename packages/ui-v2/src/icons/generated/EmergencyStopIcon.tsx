import type { IconProps } from "../types";

/** Figma 3315:12486 · icon_3315_12486.svg */
export const EmergencyStopIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...props}>
    <path d="M12 1H4C2.34315 1 1 2.34315 1 4V12C1 13.6569 2.34315 15 4 15H12C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" fill="white"/>
    <path d="M10 5H6C5.44772 5 5 5.44772 5 6V10C5 10.5523 5.44772 11 6 11H10C10.5523 11 11 10.5523 11 10V6C11 5.44772 10.5523 5 10 5Z" fill="#E11D53"/>
    </svg>
);

EmergencyStopIcon.displayName = "EmergencyStopIcon";
