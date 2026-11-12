import type { IconProps } from "../types";

/** Figma 3315:13736 · icon_3315_13736.svg */
export const DownloadIcon = ({ size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" {...props}>
    <mask id="mask0_3315_13736" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
    <rect width="20" height="20" fill="currentColor"/>
    </mask>
    <g mask="url(#mask0_3315_13736)">
    <path d="M9.99967 13.3334L5.83301 9.16671L6.99967 7.95837L9.16634 10.125V3.33337H10.833V10.125L12.9997 7.95837L14.1663 9.16671L9.99967 13.3334ZM4.99967 16.6667C4.54134 16.6667 4.14898 16.5035 3.82259 16.1771C3.4962 15.8507 3.33301 15.4584 3.33301 15V12.5H4.99967V15H14.9997V12.5H16.6663V15C16.6663 15.4584 16.5031 15.8507 16.1768 16.1771C15.8504 16.5035 15.458 16.6667 14.9997 16.6667H4.99967Z" fill="currentColor"/>
    </g>
    </svg>
);

DownloadIcon.displayName = "DownloadIcon";
