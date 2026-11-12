import { useState } from "react";
import {
  ContainerDrawer,
  ContainerPlan,
  ElectricalSingleLine,
  EMS_ICONS,
  EventsLog,
  IconButton,
  KpiRow,
  LegendPopover,
  Sidebar,
  StringStates,
  TabRow,
  TopBar,
} from "@gd-monorepo/ui-v2";
import { EMS_DASHBOARD, SIDEBAR_ITEMS, TOP_TABS } from "../../features/ems/mock/ems-dashboard.mock";
import { EMS_DRAWER } from "../../features/ems/mock/ems-drawer.mock";
import { kpiItems, stringStates } from "../../features/ems/selectors";
import {
  Bottom,
  DrawerLayer,
  InfoAnchor,
  Layout,
  Main,
  SingleLineWrap,
} from "./DashboardPage.styles";

/** EMS dashboard — ana + info + side-drawer varyantları. */
export const DashboardPage = ({ infoOpen = false }: { infoOpen?: boolean }) => {
  const [nav, setNav] = useState("dashboard");
  const [tab, setTab] = useState("devices");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout>
      <Sidebar items={SIDEBAR_ITEMS} active={nav} onSelect={setNav} />
      <Main>
        <TabRow
          title={EMS_DASHBOARD.title}
          subtitle={EMS_DASHBOARD.subtitle}
          pills={EMS_DASHBOARD.pills}
        />
        <TopBar
          tabs={TOP_TABS}
          active={tab}
          onSelect={setTab}
          liveText={EMS_DASHBOARD.liveText}
          clock={EMS_DASHBOARD.clock}
        />
        <KpiRow items={kpiItems(EMS_DASHBOARD)} />
        <SingleLineWrap>
          <ElectricalSingleLine
            bscs={EMS_DASHBOARD.bscs}
            cbms={EMS_DASHBOARD.cbms}
            pcs={EMS_DASHBOARD.pcs}
            rmu={EMS_DASHBOARD.rmu}
            trafo={EMS_DASHBOARD.trafo}
            onRackSelect={() => setDrawerOpen(true)}
          />
          {infoOpen ? (
            <InfoAnchor>
              <LegendPopover />
            </InfoAnchor>
          ) : null}
        </SingleLineWrap>
        <ContainerPlan panel={EMS_DASHBOARD.panel} rooms={EMS_DASHBOARD.rooms} />
        <Bottom>
          <EventsLog events={EMS_DASHBOARD.events} />
          <StringStates cards={stringStates(EMS_DASHBOARD)} />
        </Bottom>
      </Main>
      {drawerOpen ? (
        <DrawerLayer>
          <ContainerDrawer
            {...EMS_DRAWER}
            onClose={() => setDrawerOpen(false)}
            onOpenEms={() => setDrawerOpen(false)}
          />
        </DrawerLayer>
      ) : null}
    </Layout>
  );
};

export const InfoButton = ({ onClick }: { onClick: () => void }) => (
  <IconButton
    label="Legend"
    icon={<EMS_ICONS.info size={16} />}
    onClick={onClick}
  />
);
