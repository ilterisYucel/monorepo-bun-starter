import { ContainerDrawer } from "@gd-monorepo/ui-v2";
import { EMS_DRAWER } from "../../features/ems/mock/ems-drawer.mock";
import { FullDrawerPage } from "../DashboardPage/DashboardPage.styles";

/** Drawer - BESS#3 tam içerik. */
export const DrawerFullPage = () => (
  <FullDrawerPage>
    <ContainerDrawer {...EMS_DRAWER} />
  </FullDrawerPage>
);
