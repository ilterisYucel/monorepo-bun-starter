import { EMS_ICONS } from "../../../icons";
import logo from "../../../assets/logo-lg.png";
import {
  Foot,
  Footer,
  Item,
  ItemIcon,
  Logo,
  LogoArea,
  Nav,
  Version,
} from "./Sidebar.styles";
import type { SidebarProps } from "./Sidebar.types";

/** Sol menü — 130 px, logo + 6 nav, aktif Success Tint, sürüm altbilgisi. */
export const Sidebar = ({
  items,
  active,
  onSelect,
  version = "v.101",
  footer = "Powered by LG Energy Solution",
  className,
}: SidebarProps) => (
  <Nav className={className} aria-label="Ana menü">
    <LogoArea>
      <Logo src={logo} alt="LG Energy Solution" />
    </LogoArea>
    {items.map((item) => {
      const Icon = EMS_ICONS[item.icon];
      const isActive = item.key === active;
      return (
        <Item
          key={item.key}
          type="button"
          $active={isActive}
          aria-current={isActive ? "page" : undefined}
          onClick={() => onSelect?.(item.key)}
        >
          <ItemIcon $active={isActive} aria-hidden="true">
            <Icon size={20} />
          </ItemIcon>
          {item.label}
        </Item>
      );
    })}
    <Foot>
      <Version>{version}</Version>
      <Footer>{footer}</Footer>
    </Foot>
  </Nav>
);

Sidebar.displayName = "Sidebar";
