import { Outlet } from "react-router-dom";
import { ThemeToggle } from "../../theme/ThemeToggle";
import { Content, Shell } from "./AppShell.styles";

/** Uygulama kabuğu — arka plan, içerik genişliği ve tema değiştirici. */
export const AppShell = () => (
  <Shell>
    <Content>
      <Outlet />
    </Content>
    <ThemeToggle />
  </Shell>
);
