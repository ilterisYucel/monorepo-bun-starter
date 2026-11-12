import React from "react";
import ReactDOM from "react-dom/client";
import { Global, css } from "@emotion/react";
import { FONT_FAMILY } from "@gd-monorepo/ui-v2";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import { App } from "./app/App";

const globalStyles = css`
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    margin: 0;
    min-height: 100%;
  }

  body {
    font-family: ${FONT_FAMILY};
    -webkit-font-smoothing: antialiased;
  }
`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Global styles={globalStyles} />
    <App />
  </React.StrictMode>,
);
