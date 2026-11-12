import { StyledIconButton } from "./IconButton.styles";
import type { IconButtonProps } from "./IconButton.types";

/** 32×32 ikon butonu — drawer/modal kapatma. */
export const IconButton = ({ icon, label, type = "button", ...rest }: IconButtonProps) => (
  <StyledIconButton type={type} aria-label={label} {...rest}>
    {icon}
  </StyledIconButton>
);

IconButton.displayName = "IconButton";
