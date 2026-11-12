import { RouterProvider } from "react-router-dom";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import { AppProviders } from "./providers";
import { router } from "./router";

export const App = () => (
  <ThemeModeProvider>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </ThemeModeProvider>
);
