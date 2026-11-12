import type { IconProps } from "../types";

/** Figma 3315:12416 · icon_3315_12416.svg */
export const ControlIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
    <path d="M6 6.75H14C15.7949 6.75 17.25 8.20507 17.25 10C17.25 11.7949 15.7949 13.25 14 13.25H6C4.20507 13.25 2.75 11.7949 2.75 10C2.75 8.20507 4.20507 6.75 6 6.75Z" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="14" cy="10" r="4" fill="currentColor"/>
    </svg>
);

ControlIcon.displayName = "ControlIcon";
