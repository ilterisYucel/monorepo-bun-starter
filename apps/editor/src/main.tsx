import React from "react";
import ReactDOM from "react-dom/client";
import { Global, css } from "@emotion/react";
import { App } from "./app/App";

const globalStyles = css`
  :root {
    --text: #9ca3af;
    --text-h: #f3f4f6;
    --bg: #0f1117;
    --bg-card: #1a1d27;
    --border: #2e303a;
    --accent: #6366f1;
    --accent-hover: #818cf8;

    --sans: system-ui, "Segoe UI", Roboto, sans-serif;
    --mono: ui-monospace, Consolas, monospace;

    font: 14px/145% var(--sans);
    color: var(--text);
    background: var(--bg);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    margin: 0;
    overflow: hidden;
  }

  #root {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Global styles={globalStyles} />
    <App />
  </React.StrictMode>,
);
