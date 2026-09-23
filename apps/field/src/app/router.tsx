import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";
import { setLoginNavigator } from "../lib/auth-navigation";

export const router = createBrowserRouter(routes);

// AUTH-REFRESH (2026-09-23): 401-refresh başarısızlığında SPA navigasyonu —
// reload YOK (B4). Callback enjeksiyonu lib → app/router döngüsünü kırar.
setLoginNavigator((path) => {
  void router.navigate(path);
});
