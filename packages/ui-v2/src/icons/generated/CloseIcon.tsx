import type { IconProps } from "../types";

/** Figma manual · drawer close X */
export const CloseIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}><path d="M12 12L20 20M20 12L12 20" strokeWidth="1.8" strokeLinecap="round" stroke="currentColor"/></svg>
);

CloseIcon.displayName = "CloseIcon";
