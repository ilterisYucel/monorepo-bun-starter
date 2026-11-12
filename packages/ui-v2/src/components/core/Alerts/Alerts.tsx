import { Badge } from "../../primitives/Badge";
import {
  AlertCard,
  Cards,
  FilterChip,
  FilterDot,
  FilterRow,
  Foot,
  Group,
  GroupHead,
  Head,
  HeadChips,
  List,
  Panel,
  Row,
  RowMessage,
  RowSource,
  RowStatus,
  RowTime,
  Stripe,
  TONE,
  Title,
} from "./Alerts.styles";
import type { AlertItem, AlertsProps, AlertSeverity } from "./Alerts.types";

const LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  cold: "Cold",
  maint: "Maint",
};

const countBy = (items: AlertItem[], severity: AlertSeverity) =>
  items.filter((item) => item.severity === severity).length;

const RowContent = ({ item }: { item: AlertItem }) => (
  <>
    <Stripe $severity={item.severity} aria-hidden="true" />
    <RowTime>{item.time}</RowTime>
    <Badge tone={TONE[item.severity]}>{LABEL[item.severity]}</Badge>
    <RowSource>{item.source}</RowSource>
    <RowMessage>{item.message}</RowMessage>
    <RowStatus>{item.status ?? "—"}</RowStatus>
  </>
);

const Filters = ({ items }: { items: AlertItem[] }) => (
  <FilterRow>
    <FilterChip>All · {items.length}</FilterChip>
    {(["critical", "warning", "cold", "maint", "info"] as AlertSeverity[]).map((severity) => (
      <FilterChip key={severity} $severity={severity}>
        <FilterDot $severity={severity} aria-hidden="true" />
        {LABEL[severity]} · {countBy(items, severity)}
      </FilterChip>
    ))}
  </FilterRow>
);

/** Uyarı listeleri — A dense stripe, B severity grubu, C kart. */
export const Alerts = ({ variant = "a", title = "Needs attention", items, className }: AlertsProps) => {
  const unack = items.filter((item) => item.unacknowledged).length;

  if (variant === "b") {
    const severities = (["critical", "warning", "maint", "info", "cold"] as AlertSeverity[]).filter(
      (severity) => countBy(items, severity) > 0,
    );

    return (
      <Panel className={className}>
        <Head>
          <Title>{title}</Title>
          <HeadChips>
            <Badge tone="critical">{unack} unack.</Badge>
            <Badge tone="neutral">{items.length} records</Badge>
          </HeadChips>
        </Head>
        {severities.map((severity) => (
          <Group key={severity}>
            <GroupHead $severity={severity}>
              <span>{LABEL[severity]}</span>
              <span>{countBy(items, severity)}</span>
            </GroupHead>
            {items
              .filter((item) => item.severity === severity)
              .map((item) => (
                <Row key={item.id} $severity={severity}>
                  <RowContent item={item} />
                </Row>
              ))}
          </Group>
        ))}
      </Panel>
    );
  }

  if (variant === "c") {
    return (
      <Panel className={className} style={{ width: 453 }}>
        <Head>
          <Title>{title}</Title>
          <HeadChips>
            <Badge tone="critical">{unack} unack.</Badge>
          </HeadChips>
        </Head>
        <Filters items={items} />
        <Cards>
          {items.map((item) => (
            <AlertCard key={item.id} $severity={item.severity}>
              <RowTime>{item.time}</RowTime>
              <RowMessage>{item.message}</RowMessage>
              <RowSource>{item.source}</RowSource>
            </AlertCard>
          ))}
        </Cards>
      </Panel>
    );
  }

  return (
    <Panel className={className}>
      <Head>
        <Title>{title}</Title>
        <HeadChips>
          <Badge tone="critical">{unack} unack.</Badge>
          <Badge tone="neutral">{items.length} records</Badge>
        </HeadChips>
      </Head>
      <Filters items={items} />
      <List>
        {items.map((item) => (
          <Row key={item.id} $severity={item.severity}>
            <RowContent item={item} />
          </Row>
        ))}
      </List>
      <Foot>View all {items.length} events ›</Foot>
    </Panel>
  );
};

Alerts.displayName = "Alerts";
