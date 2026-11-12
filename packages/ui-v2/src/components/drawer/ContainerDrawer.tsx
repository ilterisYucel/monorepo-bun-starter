import { EMS_ICONS } from "../../icons";
import { Button } from "../primitives/Button";
import { IconButton } from "../primitives/IconButton";
import { Badge } from "../primitives/Badge";
import { BatterySections } from "./BatterySections";
import {
  Actions,
  Body,
  Chip,
  Drawer,
  Emergency,
  Feeder,
  Footer,
  FooterNote,
  Header,
  Spacer,
  Title,
} from "./Drawer.styles";
import { PcsTableView } from "./PcsTableView";
import { RmuPositions } from "./RmuPositions";
import { SelectedPack } from "./SelectedPack";
import { SelectedRack } from "./SelectedRack";
import type { ContainerDrawerProps } from "./types";

/** Konteyner detay drawer'ı — 480 px sağ panel. */
export const ContainerDrawer = ({
  title,
  stateBadge,
  modeBadge,
  feeder,
  actions = [],
  rack,
  pack,
  rmu,
  pcs,
  banks,
  onClose,
  onOpenEms,
  onEmergencyStop,
  footerNote = "Values refresh every 5 s · last update 14:32:10",
  className,
}: ContainerDrawerProps) => (
  <Drawer className={className} aria-label={`${title} detay`}>
    <Header>
      <Title>{title}</Title>
      <Badge tone={stateBadge.tone}>{stateBadge.label}</Badge>
      {modeBadge ? <Badge tone={modeBadge.tone}>{modeBadge.label}</Badge> : null}
      <Spacer />
      <IconButton
        label="Drawer'ı kapat"
        icon={<EMS_ICONS.close size={16} />}
        onClick={onClose}
      />
    </Header>
    <Feeder>{feeder}</Feeder>
    <Actions>
      {actions.map((action) => (
        <Chip key={action}>{action}</Chip>
      ))}
      <Emergency type="button" onClick={onEmergencyStop}>
        <EMS_ICONS.emergencyStop size={16} aria-hidden="true" />
        Emergency stop
      </Emergency>
    </Actions>
    <Body>
      <SelectedRack rack={rack} />
      <SelectedPack pack={pack} />
      <RmuPositions positions={rmu} />
      <PcsTableView rows={pcs} />
      <BatterySections banks={banks} />
    </Body>
    <FooterNote>{footerNote}</FooterNote>
    <Footer>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      <Spacer />
      <Button variant="primary" onClick={onOpenEms}>
        Open EMS view · {title} →
      </Button>
    </Footer>
  </Drawer>
);

ContainerDrawer.displayName = "ContainerDrawer";
