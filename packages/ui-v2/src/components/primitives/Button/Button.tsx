import { StyledButton } from "./Button.styles";
import type { ButtonProps } from "./Button.types";

/** Buton — H32, pad 0/12, r8, 12 SemiBold. Primary = Inverse; Critical = ekipman komutu. */
export const Button = ({
  variant = "secondary",
  leftIcon,
  children,
  type = "button",
  ...rest
}: ButtonProps) => (
  <StyledButton type={type} $variant={variant} {...rest}>
    {leftIcon}
    {children}
  </StyledButton>
);

Button.displayName = "Button";
