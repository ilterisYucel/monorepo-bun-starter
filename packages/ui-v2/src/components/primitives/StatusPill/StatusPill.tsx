import { Dot, Pill } from "./StatusPill.styles";
import type { StatusPillProps } from "./StatusPill.types";

/** Top bar durum pill'i — H28, pad 0/12, gap 6, pill, Surface + Small shadow, 7 px dot. */
export const StatusPill = ({ tone = "neutral", children, dot = true, className }: StatusPillProps) => (
  <Pill className={className}>
    {dot ? <Dot $tone={tone} aria-hidden="true" /> : null}
    <span>{children}</span>
  </Pill>
);

StatusPill.displayName = "StatusPill";
