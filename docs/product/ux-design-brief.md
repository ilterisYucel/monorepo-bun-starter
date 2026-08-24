---
status: active
space: product
tags: [ux, tasarim, brief]
review_date: 2026-08-24
---

# UX Design Brief — GD-ESS EYS

**Version:** 1.0
**Date:** August 2026
**For:** UX Design Team

---

## 1. About Us

GD-ESS EYS is an energy management system (EMS) for battery energy storage systems (BESS) with three web apps: Container, Field, Boss.

## 2. Our Design System (Storybook)

93 color tokens, 46 icons (Tabler), all UI components, and 2D SCADA graphics are live in Storybook. Use it as your main reference:

https://ilterisyucel.github.io/monorepo-bun-starter/

## 3. What We Need From You

### 3.1 Design Tokens

- Review, fix, and approve our 93 color tokens; add and fix icons (46 today).
- Add a font/typography token set. We do not have one — sizes live inside components today.
- Add light theme colors. Our tokens are mostly dark theme.

### 3.2 Components

- Review all Storybook components; fix inconsistencies (spacing, alignment, borders, sizing).
- Approve the final look for production. Add missing states: loading, empty, error, disabled.

### 3.3 2D Graphics Redraw

Redraw our 2D SCADA graphics. They must inherit from standard electrical circuit element symbols, like in FPGA and EDA design programs.

Graphics: BSC, TMS, BESSDiagram, RackCell, CircuitBreaker, DCOutput, HvacUnit, PanelCard, FirePanel, EnergyAnalyzerGraphic.

Style rules:

- Flat 2D, front view, line-based schematic. No perspective, no isometric, no 3D.
- Dark background #0f0f1a, thin dark outline. Transparent background (PNG or SVG).
- Neutral colors only (gray/white). Status colors and all labels are applied by code, never in the artwork.

### 3.4 Figma Screen Designs

Please send us Figma screen designs for all pages. Boss app screens must be mobile-first (PWA). Current screens are in Storybook. "Reports" and field "Control" are placeholders — design from scratch.

## 4. Deliverables

(1) Token sheet: colors, typography, light theme. (2) Approved component library. (3) 2D graphic set (PNG or SVG), circuit-symbol based. (4) Figma designs for all pages.
