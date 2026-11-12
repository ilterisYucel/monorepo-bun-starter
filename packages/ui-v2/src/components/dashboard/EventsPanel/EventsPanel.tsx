import { useMemo, useState } from "react";
import { EMS_ICONS } from "../../../icons";
import { Badge } from "../../primitives/Badge";
import { Tabs } from "../../primitives/Tabs";
import type { TabItem } from "../../primitives/Tabs";
import type { AlertSeverity } from "../../core/Alerts";
import {
  BadgeWrap,
  Cell,
  ColMessage,
  ColSeverity,
  ColSource,
  ColStatus,
  ColTime,
  Controls,
  ExportButton,
  LogCard,
  LogHead,
  Message,
  Row,
  SearchInput,
  SearchWrap,
  Source,
  StateCard,
  StateHead,
  StateLabel,
  StateRow,
  StateTitle,
  StateValue,
  StatesWrap,
  Status,
  TableHead,
  Time,
} from "./EventsPanel.styles";
import type { EventsLogProps, StringStatesProps } from "./EventsPanel.types";

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "ALARM",
  warning: "WARNING",
  info: "INFO",
  cold: "COLD",
  maint: "MAINT",
};

const SEVERITY_TONE: Record<AlertSeverity, "critical" | "warning" | "info" | "maint"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
  cold: "info",
  maint: "maint",
};

const matchesTab = (severity: AlertSeverity, tab: string) => {
  if (tab === "all") return true;
  if (tab === "alarms") return severity === "critical";
  if (tab === "warnings") return severity === "warning";
  return severity === "info" || severity === "cold" || severity === "maint";
};

/** Olay ve sistem günlüğü — sekmeler, arama, dışa aktarma. */
export const EventsLog = ({
  title = "Events and system log",
  events,
  tabs,
  searchPlaceholder = "Search by key word...",
  exportLabel = "Export report",
  onExport,
  className,
}: EventsLogProps) => {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const tabItems: TabItem[] = useMemo(
    () =>
      tabs ?? [
        { key: "all", label: "All" },
        { key: "alarms", label: "Alarms", countTone: "critical" },
        { key: "warnings", label: "Warnings", countTone: "warning" },
        { key: "info", label: "Info" },
      ],
    [tabs],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      if (!matchesTab(event.severity, tab)) return false;
      if (!term) return true;
      return [event.time, event.source, event.message, event.status ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [events, query, tab]);

  return (
    <LogCard className={className}>
      <LogHead>{title}</LogHead>
      <Controls>
        <Tabs items={tabItems} value={tab} onChange={setTab} variant="chips" ariaLabel="Event filters" />
        <SearchWrap>
          <EMS_ICONS.search size={20} aria-hidden="true" />
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search events"
          />
        </SearchWrap>
        <ExportButton type="button" onClick={onExport}>
          <EMS_ICONS.download size={20} aria-hidden="true" />
          {exportLabel}
        </ExportButton>
      </Controls>
      <TableHead>
        <ColTime>TIME</ColTime>
        <ColSeverity>SEVERITY</ColSeverity>
        <ColSource>SOURCE</ColSource>
        <ColMessage>MESSAGE</ColMessage>
        <ColStatus>STATUS</ColStatus>
      </TableHead>
      {visible.length === 0 ? (
        <Cell>Kriterlere uyan olay yok.</Cell>
      ) : (
        visible.map((event) => (
          <Row key={event.id} $severity={event.severity}>
            <Cell>
              <Time>{event.time}</Time>
              <BadgeWrap>
                <Badge tone={SEVERITY_TONE[event.severity]}>{SEVERITY_LABEL[event.severity]}</Badge>
              </BadgeWrap>
              <Source>{event.source}</Source>
              <Message>{event.message}</Message>
              <Status $active={Boolean(event.status && event.status !== "—")}>
                {event.status ?? "—"}
              </Status>
            </Cell>
          </Row>
        ))
      )}
    </LogCard>
  );
};

EventsLog.displayName = "EventsLog";

/** BSC durum kartları — String states (Option B). */
export const StringStates = ({ cards, className }: StringStatesProps) => (
  <StatesWrap className={className}>
    {cards.map((card) => (
      <StateCard key={card.key}>
        <StateHead>
          <StateTitle>{card.title}</StateTitle>
          <Badge tone={card.badge.tone}>{card.badge.label}</Badge>
        </StateHead>
        {card.rows.map((row) => (
          <StateRow key={row.key}>
            <StateLabel>{row.label}</StateLabel>
            <StateValue $tone={row.tone ?? "default"}>{row.value}</StateValue>
          </StateRow>
        ))}
      </StateCard>
    ))}
  </StatesWrap>
);

StringStates.displayName = "StringStates";
