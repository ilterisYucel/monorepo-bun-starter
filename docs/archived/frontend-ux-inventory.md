# GD-PMS Frontend Design Inventory

**Version:** 1.0
**For:** UX Designers
**Storybook:** [https://ilterisyucel.github.io/monorepo-bun-starter/](https://ilterisyucel.github.io/monorepo-bun-starter/)

This document shows all pages, layouts, and components in the three GD-PMS frontend apps. It is a reference for the UX design team.

---

## 1. Overview

GD-PMS has three separate React apps for site management:

```
Boss-Level (superadmin)
Mobile-first, multi-site overview
"How are all my sites doing?"
        │
        ▼
Field-Level (field)
All containers under one site
"What containers are on my site?"
        │
        ▼
Container-Level (container-web)
Deep view and control of one container
"What is happening inside this container?"
```

All three apps use the same shared component library `@gd-monorepo/ui`. Common features: dark/light theme, Turkish/English language support.

---

## 2. Shared UI Library (`@gd-monorepo/ui`)

All components below are used by all three apps. The UX team should use these as building blocks.

### 2.1 Device Cards

| Component | What it shows |
|:----------|:--------------|
| `BSCCard` | Battery container card: status badge, SoC, voltage, current, power, temperature, cell data |
| `RackCard` | Rack card: status badge, SoC, voltage, current, power, temperature |
| `CBCard` | Circuit breaker card: open/closed/tripped state, voltage, current, trip/close counters |
| `DCOutputCard` | DC output card: on/off, actual and set voltage/current |
| `HvacCard` | HVAC card: running/standby/fault badge, mode (cooling/heating/idle), temperatures, humidity, alarm count |
| `FirePanelCard` | Fire panel card: fire detected yes/no, fault yes/no, relay states |
| `EnergyAnalyzerCard` | Energy analyzer card: 3-phase voltage/current/power, power factor, THD, energy counters |
| `ContainerCard` | Container summary card: status dot, SoC bar, power, temperature, device count |
| `FieldCard` | Field summary card: status, power, SoC, container count |

### 2.2 SCADA Graphics (PixiJS)

Real-time animated industrial visuals. All work with dark theme.

| Component | What it shows |
|:----------|:--------------|
| `BSC` | Battery container diagram: racks, bus bars, breakers, DC outputs, cables, flow arrows, labels |
| `TMS` | Thermal management diagram: rooms, HVAC units, temperature/humidity panel |
| `BESSDiagram` | Full site panorama: BSCs, TMS, fire panel, energy analyzer, transformer — all on one canvas |
| `RackCell` | Rack cell: rectangle colored by SoC level, hover shows info popover |
| `CircuitBreaker` | Breaker graphic: open/closed/tripped visual |
| `DCOutput` | DC output graphic: on/off visual |
| `HvacUnit` | HVAC unit: fan animation spins based on status |
| `PanelCard` | Temperature/humidity display graphic |
| `FirePanel` | Fire panel status graphic |
| `EnergyAnalyzerGraphic` | Energy analyzer graphic |

### 2.3 Charts

| Component | What it does |
|:----------|:-------------|
| `TelemetryChart` | Time series chart: one or more devices, multiple metrics, time range picker, multi-metric select, data points control, device filter |
| `SingleTelemetryChart` | Chart for a single telemetry metric across one or more devices |
| `MultiLineChart` | Multi-line chart with event markers |
| `TelemetryGauge` | SVG circular gauge (240° arc), threshold colors |
| `DeviceGauges` | Responsive grid of TelemetryGauges for one device |

### 2.4 Control and Status Components

| Component | What it does |
|:----------|:-------------|
| `ManeuverCard` | Command card: idle/running/success/failed states, input fields, step list, timer, rollback button |
| `TelemetryInput` | Value input: step buttons, range bar, threshold lines, unit label |
| `SummaryCard` | KPI card: icon + value + label, colored by status |
| `LogTerminal` | Log viewer: type icons (success/error/warning/info), source icons, auto-scroll |
| `DeviceTable` | Device list table: ID, name, type, protocol, rack, model, status, detail button |
| `DeviceDetailModal` | Device detail modal window |
| `StatusBadge` | Status badges: Online, Offline, Charge, Discharge, Idle |
| `ContainerConnectionBadge` | Container connection status badge |
| `MetricBar` | Horizontal progress bar (0-100%) |
| `MetricDisplay` | MetricBar + value + label combined |
| `DeviceTelemetryProvider` | Per-device isolated gauge component (contains `Gauge` and `StatusBadge`) |
| `FieldMap` | Leaflet site map, colored circle markers |
| `PlayCanvasViewer` | 3D container visualization |

### 2.5 Atom Components

| Component | Purpose |
|:----------|:--------|
| `Card` | Generic card container |
| `CardGrid` | 4-column responsive grid |
| `CardHeader` | Card header: name + badge slot |
| `ChartGrid` | 2-column chart grid |
| `DataGrid` | 2-column data grid |
| `DataRow` | Icon + label + value row |
| `SectionHeader` | Section title divider |
| `Tabs` | Tab container |

### 2.6 Icons

46 icons. All from Tabler Icons family.

| Category | Icons |
|:---------|:------|
| Navigation | dashboard, bsc, hvac, analytics, energyAnalyzer, charts, reports, events, control, settings, scadaChart |
| Status | statusOnline, statusOffline, statusIdle, logSuccess, logError, logWarning, logInfo |
| Device | battery, batteryCharge, batteryDischarge, container, circuitBreaker, dcOutput, hvacUnit, fireAlarm |
| Action | refresh, add, trash, stop, continuous, timer, zoomIn, close, collapse, menu |
| Other | powerPlug, temperature, health, emergency, logo, user, logout, sourceCommand, sourceScheduler, sourceSystem |

### 2.7 Color System

104 tokens. Works in CSS (hex) and PixiJS (0x) formats.

| Group | Count | Examples |
|:------|:-----:|:---------|
| Status | 14 | Success (#10b981), Warning (#f59e0b), Error (#ef4444), Info (#3b82f6), Idle |
| Surface | 14 | Background, card, popup, header, input, panel, skeleton, hover |
| Text | 10 | Primary, white, muted, disabled, purple, gray |
| Border | 5 | Default, stroke, light, hover |
| Gradient | 9 | Body, mid, low, screen, panel |
| Chart | 16 | chart1-chart16 (data series colors) |
| Temperature | 3 | Cold, chilly, hot |
| Special | 21 | Cable, terminal, shadow, DC active/idle, opacity variants |
| Accent | 2 | Light, dark |

---

## 3. Container-Level App (`container-web`)

Deep monitoring and control of a single energy container. The most mature app with the most pages.

**Total pages:** 13 (11 done, 2 placeholder)

### Layout

- **Sidebar:** Fixed 80px width. 11 navigation icons (dashboard, scada, bsc, fire, energy-analyzer, hvac, control, events, reports, devices)
- **System Header:** Horizontal status bar. Charge/discharge/idle icon, container ID, PPC connection (green/red), live clock, power usage (color coded: green <100kW, yellow <300kW, red >300kW), ambient temperature and humidity.

### Page List

| # | Page | Route | Status |
|:--|:-----|:------|:-------|
| 1 | Login | `/login` | Done |
| 2 | Main Dashboard | `/`, `/dashboard` | Done |
| 3 | SCADA Panorama | `/scada` | Done |
| 4 | BSC Detail | `/bsc` | Done |
| 5 | HVAC Detail | `/hvac` | Done |
| 6 | Fire Panel | `/fire` | Done |
| 7 | Energy Analyzer | `/energy-analyzer` | Done |
| 8 | Maneuver Control | `/control` | Done |
| 9 | System Charts | `/system-charts` | Done |
| 10 | Events | `/events` | Done |
| 11 | Reports | `/reports` | **Placeholder** |
| 12 | Devices | `/devices` | Done |
| 13 | Settings | (sidebar popup) | Done |

---

### 3.1 Login (`/login`)

Centered card on dark fullscreen background. Logo + "EMS" title, username input, password input, login button. "or" divider with guest login button below. Demo credentials hint. No role selection — role is auto-detected on login.

---

### 3.2 Main Dashboard (`/`, `/dashboard`)

Summary view of the container's current state.

**Layout:**
1. **Device Gauges:** `DeviceGauges` per device — SoC, SoH, Power, Voltage, Current circular gauge displays.
2. **LogTerminal:** System events (bottom of page).

**Data:** Live.

---

### 3.3 SCADA Panorama (`/scada`)

All SCADA visuals on one page.

**Layout:**
1. `BSC` PixiJS graphic: 8 battery racks, bus bars, breakers, DC outputs, animated flow arrows, summary panel. Right-click a rack cell → info popover (SoC, voltage, current, temperature).
2. `TMS` PixiJS HVAC graphic: rooms, animated HVAC units, temperature/humidity panel.
3. `BESSDiagram` panorama: all BSCs, TMS, fire panel, energy analyzer, transformer (single canvas, 1200px).
4. `LogTerminal` (bottom of page).

**Data:** Live.

---

### 3.4 BSC Detail (`/bsc`)

Full detail of the battery system. One of the biggest pages.

**Layout (top to bottom):**
1. `SectionHeader("BSC")`
2. **Summary Cards (2):** `BSCCard` for BSC-1 and BSC-2 (SoC, SoH, power, voltage)
3. **Racks:** `SectionHeader("Racks")`, `CardGrid` with `RackCard`s (Rack-1 through Rack-8). Each card: status badge, SoC, voltage, current, power, temperature.
4. **BSC Charts:** `SingleTelemetryChart` per device, plus one combined comparison chart.
5. **Breakers:** `SectionHeader("Breakers")`, `CardGrid` with `CBCard`s (open/closed/tripped).
6. **DC Outputs:** `SectionHeader("DC Outputs")`, `CardGrid` with `DCOutputCard`s.
7. **CB and DC Charts.**

**Interactions:** Click `RackCard` → `RackDetailModal`. Click "Detail" button → `DeviceDetailModal`.

**Data:** Live.

---

### 3.5 HVAC Detail (`/hvac`)

Detailed view of heating/cooling units.

**Layout:**
1. **Summary Cards (4-grid):** Average temperature, average humidity, running/total units, system status (normal/warning).
2. **Unit Cards:** `SectionHeader("HVAC Units")`, `CardGrid` with `HvacCard`s. Each card: room name, status badge (running/standby/fault), current temperature, mode (cooling/heating/idle), set temperature, supply/return temperatures, humidity, equipment status, alarm count.
3. **Charts:** `SingleTelemetryChart` per unit, plus one combined comparison chart (with event markers).

**Data:** Live.

---

### 3.6 Fire Panel (`/fire`)

Fire alarm panel (EP203) monitoring.

**Layout:**
1. **Status Cards (3-grid):** System status (OK/WARNING), fire detected (yes/no), fault (yes/no). Color coded (green/red).
2. `FirePanelCard`: EP203 relay states — first stage, second stage, discharged, mute, hold, abort, auto mode, local fire, reset.
3. **Chart:** Time series chart.

**Data:** Live.

---

### 3.7 Energy Analyzer (`/energy-analyzer`)

PM5340 energy analyzer phase-by-phase detail.

**Layout:**
1. **Summary Cards (3):** Frequency (Hz), total active power (kW), active energy (kWh).
2. `EnergyAnalyzerCard`: Per phase (L1/L2/L3) — phase-neutral and phase-phase voltage, current, active/reactive/apparent power, power factor, THD, neutral current, demand values, energy counters.
3. **Chart:** Time series chart.

**Data:** Live.

---

### 3.8 Maneuver Control (`/control`)

Send commands and run multi-device maneuvers.

**Layout:** Full-width masonry grid (cards flow by content size).

**Content:** 18 `ManeuverCard`s:
- Battery: Charge, discharge, stop
- Emergency stop
- HVAC: Turn on, turn off, force cool, force heat
- Breakers: Open, close, reset
- DC outputs: Turn on, turn off

**Each ManeuverCard has:**
- State machine: idle → "Run" button (split: Now / Schedule), running → disabled "Running...", success → green check, failed → "Retry" + "Rollback" buttons
- Input fields: number inputs (e.g. power kW), with min/max limits
- Timer: "Scheduled" checkbox → date/time picker → countdown
- Step list: preview of which devices will get which commands

**Interaction:** Run button sends command directly (no modal). Result shown on the card.

**Data:** Live.

---

### 3.9 System Charts (`/system-charts`)

Time series charts for all BSC and XRack system metrics.

**Layout:** Full-width `SingleTelemetryChart` (500px).

**Metrics:** SOC, SOH, Voltage, Current, ChargePower, DischargePower, Temperature, BalanceTime, etc.

**Chart controls:**
- Time range picker: 1min / 1hr / 1day / 1week / 1month / 3months / 6months / 1year / custom
- Multi-metric select (grouped: basic / detail)
- Data points: 60 / 120 / 240 / 500
- Device filter dropdown
- Event markers on/off

**Data:** Live.

---

### 3.10 Events (`/events`)

Log viewer for system events and user actions.

**Layout:** Two columns.
- Left: `LogTerminal` — "System Events & Errors" (warning icon, 800px)
- Right: `LogTerminal` — "User Actions" (user icon, 800px)

**Interaction:** Each terminal is independent: type filter (success/error/warning/info), auto-scroll on/off, clear logs.

**Data:** Live.

---

### 3.11 Reports (`/reports`) — **Placeholder**

**Current state:** Centered card, document icon, "This page is under development" message.

**Planned:** PDF report generation, Excel export.

---

### 3.12 Devices (`/devices`)

Inventory table of all devices in the container.

**Layout:** Full-width `DeviceTable`. Columns: ID, Name, Type, Protocol, Rack, Model, Status, Detail button. Sorted by type (BSC → XRack → HVAC → CB → DC-Output).

**Interaction:** "Detail" button → `DeviceDetailModal` (telemetry register map).

**Data:** Live.

---

### 3.13 Settings (Sidebar Popup)

Opened by the settings icon in the sidebar. Two tabs:

- **Options:** Language picker (Turkish/English toggle), Theme picker (Light/Dark toggle)
- **Users (admin only):** User list, create new user form (username, full name, password, role picker)

**Data:** Live.

---

## 4. Field-Level App (`field`)

Overview of all containers under a single field site.

**Total pages:** 9 (7 done, 2 placeholder)

**Note:** All pages currently use sample data. Backend development for live data is ongoing.

### Layout

- **Sidebar:** Collapsible (260px / 70px), with transition animation. "SCS" logo, 7 navigation icons (Dashboard, Containers, Charts, Control, Events, Reports, Devices). Bottom area: user profile (avatar + name + role badge), emergency stop button, logout.
- **System Header:** 4-box grid — Field ID, PPC connection (green/red), online/total container count, live clock.
- **Emergency stop:** Navigates to the Control page, does not send a command directly.

### Page List

| # | Page | Route | Status |
|:--|:-----|:------|:-------|
| 1 | Login | `/login` | Done |
| 2 | Field Dashboard | `/field/:fieldId` | Done (sample data) |
| 3 | Containers | `/field/:fieldId/containers` | Done (sample data) |
| 4 | Container Detail | `/field/:fieldId/containers/:containerId` | Done (sample data) |
| 5 | Charts | `/field/:fieldId/charts` | Done (sample data) |
| 6 | Maneuver Control | `/field/:fieldId/control` | **Placeholder** |
| 7 | Events | `/field/:fieldId/events` | Done (sample data) |
| 8 | Reports | `/field/:fieldId/reports` | **Placeholder** |
| 9 | Devices | `/field/:fieldId/devices` | Done (sample data) |

---

### 4.1 Login (`/login`)

Same layout as container-web login. Centered card, username/password, login button. No guest login.

---

### 4.2 Field Dashboard (`/field/:fieldId`)

Summary of all containers under the field.

**Layout:**
1. **KPI Cards (4-grid):** `SummaryCard` — Total power (MW), average SoC (%), online/total containers, offline/alarm container count (red highlight)
2. **Container Grid:** Responsive auto-fit grid. Each card is a `ContainerCard`: status dot (green/yellow/red), container name, SoC bar, power (kW), connected/disconnected badge.

**Interaction:** Click a card → container detail page.

**Data:** Sample (3 containers).

---

### 4.3 Containers (`/field/:fieldId/containers`)

Grid view of all containers on the field.

**Layout:** Grid of `ContainerCard`s. Each card: name, status badge, connection state, SoC, power, temperature, device counts.

**Interaction:** Click a card → container detail page.

**Data:** Sample.

---

### 4.4 Container Detail (`/field/:fieldId/containers/:containerId`)

Deep view of devices inside one container.

**Layout:**
1. **Header:** Back button, container name, `ContainerConnectionBadge`
2. **Summary Mini Cards (3):** SoC (%), Status, Device count
3. **Device Cards (grouped by type):**
   - **BSC:** 3x2 grid of mini metric boxes — SoC, SoH, Voltage, Current, Power, Temperature (each with icon)
   - **CB:** Closed/Open status, Tripped/Normal status
   - **DC Output:** On/Off status, DC Voltage, DC Current
   - **HVAC:** Room count + average temperature

**Data:** Sample.

---

### 4.5 Charts (`/field/:fieldId/charts`)

Field-level telemetry charts.

**Layout:** Full-width `TelemetryChart` (480px).

**Metrics:** SOC, Power, Voltage, Current, MaxCellTemperature.

**Chart controls:** Time range picker, metric selector, data points control, container filter.

**Data:** Sample (288-point time series).

---

### 4.6 Maneuver Control (`/field/:fieldId/control`) — **Placeholder**

**Current state:** Centered card, "Field-level maneuvers — ManeuverPanel will be added" message.

**Planned:** Field-level batch commands (charge all, discharge all, emergency stop).

---

### 4.7 Events (`/field/:fieldId/events`)

Event logs for containers under the field.

**Layout:** Two columns. Left: System Events, Right: User Actions. Each is a `LogTerminal` (800px). Filter by container.

**Data:** Sample (15 system + 15 user logs).

---

### 4.8 Reports (`/field/:fieldId/reports`) — **Placeholder**

**Current state:** Centered card, "Reports page not yet implemented" message.

---

### 4.9 Devices (`/field/:fieldId/devices`)

Device inventory table with container selector.

**Layout:** Container selector dropdown + `DeviceTable`. 10 device definitions (BSC-1/2, CB-1/2, DC-1/2, HVAC-1/2/3/4).

**Data:** Sample.

---

## 5. Boss-Level App (`superadmin`)

Multi-site overview for managers. Mobile-first. PWA supported (can be installed on phone home screen).

**Total pages:** 3 (all use sample data)

### Layout

- **Header Bar:** Fixed 48px. Left: "CCC" logo. Right: username + "Logout" button. No sidebar.
- **Navigation:** Two levels — Dashboard ↔ Field Detail.

### Page List

| # | Page | Route | Status |
|:--|:-----|:------|:-------|
| 1 | Login | `/login` | Done |
| 2 | Dashboard | `/dashboard` | Done (sample data) |
| 3 | Field Detail | `/fields/:id` | Done (sample data) |

---

### 5.1 Login (`/login`)

Same as the other apps.

---

### 5.2 Dashboard (`/dashboard`)

Map and list view of all sites.

**Layout:**
1. **Field Map (top ~40%):** `FieldMap` (Leaflet). 3 field markers on a map. Colored circles, clickable.
2. **Field Cards List (bottom):** `FieldCard`s (`size="small"`). Each card: field name, status, power (MW), SoC (%), container count. Clickable.

**Interaction:** Click a map marker or card → field detail page.

**Data:** Sample (3 fields).

---

### 5.3 Field Detail (`/fields/:id`)

Summary and container status for a selected field.

**Layout:**
1. **Header:** Back button, field ID, refresh button
2. **Summary Grid (2x2):** 4 `SummaryCard`s — Total Power, Average SoC, Container Count, Alarms
3. **Container List:** Each row shows container name + `ContainerConnectionBadge` (connected/disconnected)

**Data:** Sample (4 containers).

---

## 6. Overall Summary

| App | Total Pages | Done | Placeholder | Data Status |
|:----|:-----------:|:----:|:-----------:|:------------|
| container-web | 13 | 11 | 2 | Live |
| field | 9 | 7 | 2 | Sample |
| superadmin | 3 | 3 | 0 | Sample |
| **Total** | **25** | **21** | **4** | |

### Placeholder Pages

| # | Page | App | Current State |
|:--|:-----|:----|:--------------|
| 1 | Reports | container-web | "Under development" |
| 2 | Reports | field | "Not yet implemented" |
| 3 | Maneuver Control | field | "ManeuverPanel will be added" |

*Note: superadmin app has no placeholder pages.*

---

*This document is a reference for the UX design team. It shows the current state of all GD-PMS frontend apps.*
