import { useRef } from "react";
import { Count, Item, Track } from "./Tabs.styles";
import type { TabsProps } from "./Tabs.types";

/** Sekme/segmented kontrol — track r12 pad4, item r8; aktif Inverse + On dark. */
export const Tabs = ({
  items,
  value,
  onChange,
  variant = "segmented",
  ariaLabel,
  className,
}: TabsProps) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (direction: 1 | -1, index: number) => {
    const next = (index + direction + items.length) % items.length;
    const item = items[next];
    if (!item) return;
    onChange(item.key);
    refs.current[next]?.focus();
  };

  return (
    <Track role="tablist" aria-label={ariaLabel} className={className} $variant={variant}>
      {items.map((item, index) => {
        const active = item.key === value;
        return (
          <Item
            key={item.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            $active={active}
            $variant={variant}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                move(1, index);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(-1, index);
              }
            }}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <Count $tone={item.countTone ?? "neutral"}>{item.count}</Count>
            ) : null}
          </Item>
        );
      })}
    </Track>
  );
};

Tabs.displayName = "Tabs";
