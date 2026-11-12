import { CardBox, CardTitle } from "./Card.styles";
import type { CardProps } from "./Card.types";

/** Kart — top-level r16 + Card shadow; nested r12 + 1 px border; durum kartı status Solid 1.5 px. */
export const Card = ({
  variant = "top",
  status = "normal",
  padding,
  title,
  children,
  ...rest
}: CardProps & { title?: string }) => (
  <CardBox $variant={variant} $status={status} $padding={padding ?? (variant === "top" ? 24 : 16)} {...rest}>
    {title ? <CardTitle>{title}</CardTitle> : null}
    {children}
  </CardBox>
);

Card.displayName = "Card";
