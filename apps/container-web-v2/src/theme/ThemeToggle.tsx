import styled from "@emotion/styled";
import { Button } from "@gd-monorepo/ui-v2";
import { useThemeMode } from "./ThemeModeProvider";

const Wrap = styled.div`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 10;
`;

/** Tema değiştirici — tasarımın dışında, uygulama kromu. */
export const ThemeToggle = () => {
  const { mode, toggle } = useThemeMode();
  return (
    <Wrap>
      <Button variant="secondary" onClick={toggle}>
        {mode === "light" ? "Koyu tema" : "Açık tema"}
      </Button>
    </Wrap>
  );
};
