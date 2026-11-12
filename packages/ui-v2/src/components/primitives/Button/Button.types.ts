import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "critical" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
}
