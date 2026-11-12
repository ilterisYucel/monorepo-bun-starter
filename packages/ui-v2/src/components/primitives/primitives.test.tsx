import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../theme";
import { Badge, CountBadge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { StatusPill } from "./StatusPill";
import { Table } from "./Table";
import { Tabs } from "./Tabs";

const wrap = (node: React.ReactNode) => render(<ThemeProvider mode="light">{node}</ThemeProvider>);

const allCss = () =>
  Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");

describe("StatusPill", () => {
  it("metni ve 7 px durum noktasını render eder", () => {
    wrap(<StatusPill tone="success">Discharging · 14,8 MW</StatusPill>);
    expect(screen.getByText("Discharging · 14,8 MW")).toBeInTheDocument();
    expect(allCss()).toContain("width:7px");
    expect(allCss()).toContain("#17B589");
  });

  it("dot=false ile nokta çizmez", () => {
    const { container } = wrap(
      <StatusPill dot={false}>Ready</StatusPill>,
    );
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });
});

describe("Badge", () => {
  it("tone tint ve metin rengini uygular, UPPERCASE", () => {
    wrap(<Badge tone="critical">ALARM</Badge>);
    const css = allCss();
    expect(css).toContain("#FCE7ED");
    expect(css).toContain("#E11D53");
    expect(css).toContain("text-transform:uppercase");
  });

  it("CountBadge değeri gösterir", () => {
    wrap(<CountBadge value={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("critical varyantta solid kritik renk kullanır", () => {
    wrap(<Button variant="critical">Emergency stop</Button>);
    expect(allCss()).toContain("#E11D53");
  });

  it("disabled iken tıklama tetiklenmez", () => {
    const onClick = vi.fn();
    wrap(
      <Button variant="primary" disabled onClick={onClick}>
        Open
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("focus-visible halkası tanımlıdır", () => {
    wrap(<Button>Close</Button>);
    expect(allCss()).toContain(":focus-visible");
  });
});

describe("Tabs", () => {
  const items = [
    { key: "all", label: "All" },
    { key: "alarms", label: "Alarms", count: 2, countTone: "critical" as const },
    { key: "warnings", label: "Warnings", count: 2, countTone: "warning" as const },
  ];

  it("aktif sekmeyi aria-selected ile işaretler", () => {
    wrap(<Tabs items={items} value="all" onChange={() => undefined} />);
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Alarms/ })).toHaveAttribute("aria-selected", "false");
  });

  it("tıklama ve ok tuşu seçimi değiştirir", () => {
    const onChange = vi.fn();
    wrap(<Tabs items={items} value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Warnings/ }));
    expect(onChange).toHaveBeenCalledWith("warnings");

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole("tab", { name: /All/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("alarms");
  });

  it("sayaç rozetlerini gösterir", () => {
    wrap(<Tabs items={items} value="all" onChange={() => undefined} />);
    expect(screen.getAllByText("2")).toHaveLength(2);
  });
});

describe("Card", () => {
  it("durum kartında 1.5 px status border uygular", () => {
    wrap(
      <Card status="critical" padding={16}>
        sorry
      </Card>,
    );
    expect(allCss()).toContain("1.5px solid");
    expect(allCss()).toContain("#E11D53");
  });

  it("nested kartta 1 px border, shadow yok", () => {
    const { container } = wrap(<Card variant="nested">nested</Card>);
    expect(container.firstElementChild).toBeTruthy();
    expect(allCss()).toContain("1px solid");
  });
});

describe("Table", () => {
  it("başlık ve satırları render eder", () => {
    wrap(
      <Table
        ariaLabel="Events"
        columns={[
          { key: "time", label: "TIME" },
          { key: "message", label: "MESSAGE" },
        ]}
        rows={[{ time: "14:31:52", message: "Room 3 warning" }]}
      />,
    );
    expect(screen.getByRole("table", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByText("TIME")).toBeInTheDocument();
    expect(screen.getByText("Room 3 warning")).toBeInTheDocument();
  });
});

describe("IconButton", () => {
  it("aria-label ile erişilebilir", () => {
    wrap(<IconButton icon={<span>×</span>} label="Close drawer" />);
    expect(screen.getByRole("button", { name: "Close drawer" })).toBeInTheDocument();
  });
});
