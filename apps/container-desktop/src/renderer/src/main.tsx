import React from 'react'
import ReactDOM from 'react-dom/client'
import { Global, css } from '@emotion/react'
import { App } from './App'

const globalStyles = css`
  :root {
    --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
    --heading: system-ui, 'Segoe UI', Roboto, sans-serif;
    --mono: ui-monospace, Consolas, monospace;
    font: 16px/145% var(--sans);
    color-scheme: light dark;
  }

  #root {
    max-width: 100%;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #0f0f1a;
  }

  h1,
  h2 {
    font-family: var(--heading);
    font-weight: 500;
  }

  p {
    margin: 0;
  }
`

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Global styles={globalStyles} />
    <App />
  </React.StrictMode>
)
