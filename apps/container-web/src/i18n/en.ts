/**
 * Container-web app-specific English translation keys.
 *
 * Merged with UI package generic keys via TranslationProvider's extraKeys prop.
 */

export const APP_EN_DICT = {
  // =========================================================================
  // Device Status & Metrics
  // =========================================================================
  "device.voltage": "Voltage",
  "device.current": "Current",
  "device.power": "Power",
  "device.temperature": "Temperature",
  "device.maxTemperature": "Temperature (Max)",
  "device.soc": "State of Charge",
  "device.chargePower": "Charge Power",
  "device.dischargePower": "Discharge Power",
  "device.commandResponse": "Command Response",
  "device.powerConsumption": "Power Consumption",
  "device.anticipatedVoltage": "Expected Voltage",
  "device.version": "Version",
  "device.state": "State",
  "device.heartbeat": "Heartbeat",
  "device.lastCommand": "Last Command",
  "device.rack": "Rack",
  "device.systemPower": "System Power",
  "device.systemSoc": "System SoC",
  "device.systemSoh": "System SoH",

  "device.chargeStatus.Charge": "Charging",
  "device.chargeStatus.Discharge": "Discharging",
  "device.chargeStatus.Idle": "Idle",
  "device.chargeStatus.Offline": "Offline",
  "device.chargeStatus.unknown": "Unknown",

  "device.type.bsc": "BSC",
  "device.type.cb": "CB",
  "device.type.dcOutput": "DC-Output",
  "device.type.hvac": "HVAC",

  "device.table.name": "Name",
  "device.table.type": "Type",
  "device.table.protocol": "Protocol",
  "device.table.rack": "Rack",
  "device.table.model": "Model",
  "device.table.status": "Status",
  "device.table.poll": "Poll (ms)",
  "device.table.lastSeen": "Last Seen",

  // =========================================================================
  // Authentication
  // =========================================================================
  "auth.appTitle": "Energy Management System",
  "auth.username": "Username",
  "auth.password": "Password",
  "auth.login": "Log In",
  "auth.logout": "Log Out",
  "auth.guest": "Continue as Guest",
  "auth.loggingIn": "Logging in...",
  "auth.loginFailed": "Login failed",
  "auth.changePasswordTitle": "Password Change Required",
  "auth.currentPasswordPlaceholder": "Current Password",
  "auth.newPasswordPlaceholder": "New Password (min 8 characters)",
  "auth.confirmPasswordPlaceholder": "Confirm New Password",
  "auth.changePassword": "Change Password",
  "auth.newPasswordMin": "New password must be at least 8 characters",
  "auth.passwordMismatch": "Passwords do not match",
  "auth.changePasswordError": "Could not change password",  "auth.or": "or",
  "auth.demoUser": "Demo User:",
  "auth.loginError": "Invalid username or password",
  "auth.loginTitle.field": "Field Login",
  "auth.loginTitle.boss": "Manager Login",
  "auth.usernamePlaceholder": "Username",
  "auth.passwordPlaceholder": "Password",

  // =========================================================================
  // Navigation
  // =========================================================================
  "nav.dashboard": "Dashboard",
  "nav.scada": "One-Line",
  "nav.bsc": "BSC",
  "nav.racks": "Rack Details",
  "nav.control": "Control",
  "nav.hvac": "HVAC",
  "nav.analytics": "Analytics",
  "nav.reports": "Reports",
  "nav.events": "Events & History",
  "nav.devices": "Devices",
  "nav.fire": "Fire Panel",
  "nav.energyAnalyzer": "Energy Analyzer",
  "nav.systemCharts": "System Charts",
  "nav.expand": "Expand Menu",
  "nav.collapse": "Collapse Menu",
  "nav.user": "User",
  "nav.guest": "Guest",
  "nav.containers": "Containers",
  "nav.charts": "Charts",
  "nav.eventsShort": "Events",
  "nav.collapseShort": "Collapse",

  "nav.emergency.title": "EMERGENCY STOP",
  "nav.emergency.confirm": "EMERGENCY STOP: The entire system will stop. Do you want to continue?",
  "nav.emergency.button": "EMERGENCY STOP",

  // =========================================================================
  // Maneuver
  // =========================================================================
  "maneuver.run": "▶ Run",
  "maneuver.loading": "Loading maneuvers...",
  "maneuver.loadError": "Maneuver catalog unavailable",
  "maneuver.rolledBack": "rolled back",
  "maneuver.running": "Running...",
  "maneuver.retry": "Retry",
  "maneuver.rollback": "Rollback",
  "maneuver.scheduled": "📅 Schedule...",
  "maneuver.scheduledHint": "Scheduled (auto-stops when duration expires)",
  "maneuver.duration": "Duration",
  "maneuver.now": "Now",
  "maneuver.remaining": "remaining",
  "maneuver.steps": "Steps",
  "maneuver.inputs": "Inputs",
  "maneuver.seconds": "sec",
  "maneuver.timed": "Scheduled (auto-stops when duration expires)",
  "maneuver.schedule": "Schedule",
  "maneuver.rollbackSuccess": "Rolled back",
  "maneuver.rollbackFailed": "Rollback failed",
  "maneuver.rollbackSendFailed": "Rollback could not be sent",


  "maneuver.fieldChargeAll": "Charge All Containers",
  "maneuver.fieldChargeAllDesc": "Puts all containers in the field into charge mode simultaneously",
  "maneuver.fieldDischargeAll": "Discharge All Containers",
  "maneuver.fieldDischargeAllDesc": "Puts all containers in the field into discharge mode simultaneously",
  "maneuver.fieldEmergencyStop": "Emergency Stop (Field)",
  "maneuver.fieldEmergencyStopDesc": "Emergency-stops all containers in the field",

  // =========================================================================
  // Log Terminal
  // =========================================================================
  "log.clear": "Clear",
  "log.success": "Success",
  "log.error": "Error",
  "log.warning": "Warning",
  "log.info": "Info",
  "log.empty": "No log entries yet.",
  "log.emptyHint": "Logs will appear here when commands are sent.",
  "log.total": "{count} entries total",

  // =========================================================================
  // Fire Panel
  // =========================================================================
  "fire.systemStatus": "System Status",
  "fire.status.fire": "FIRE",
  "fire.status.none": "None",
  "fire.status.error": "Fault Status",
  "fire.release": "Release",
  "fire.cancel": "Cancel",
  "fire.manualRelease": "Manual Release",
  "fire.confirmRelease": "Manual release will be initiated!",
  "fire.confirmButton": "Confirm Release",
  "fire.cancelButton": "Cancel",
  "fire.status.fireCondition": "Fire Status",
  "fire.status.exists": "PRESENT",
  "fire.confirmReleaseFull": "Manual release will be initiated! This will trigger the fire suppression system. Are you sure?",
  "fire.relay.firstStage": "1st Stage",
  "fire.relay.secondStage": "2nd Stage",
  "fire.relay.discharged": "Discharged",
  "fire.relay.extract": "Extract",
  "fire.relay.hold": "Hold",
  "fire.relay.modeAuto": "Mode Auto",
  "fire.relay.localFire": "Local Fire",
  "fire.relay.reset": "Reset",
  "fire.relay.fault": "Fault",
  "fire.relay.fire": "Fire",
  "fire.button.hold": "Hold",
  "fire.button.modeToggle": "Toggle Mode",

  // =========================================================================
  // Container
  // =========================================================================
  "container.connected": "Field Link: Connected",
  "container.disconnected": "Field Link: Offline",
  "container.power": "Power",
  "container.temperature": "Temperature",
  "container.device": "Device",
  "container.totalPower": "Total Power",
  "container.alarm": "Alarm",
  "container.title": "Container",
  "container.titlePlural": "Containers",
  "container.notFound": "Container not found",
  "container.devices": "Devices",
  "container.telemetryTitle": "Container Telemetry",
  "container.outputStatus": "Output Status",
  "container.dcVoltage": "DC Voltage",
  "container.dcCurrent": "DC Current",
  "container.label": "Container:",
  "container.rooms": "{count} rooms — Avg. {temp}°C",
  "container.trip": "Trip",

  // =========================================================================
  // Settings
  // =========================================================================
  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.theme.dark": "Dark",
  "settings.theme.light": "Light",
  "settings.theme.comingSoon": "coming soon",
  "settings.language": "Language",
  "settings.lang.tr": "Türkçe",
  "settings.lang.en": "English",
  "settings.userManagement": "User Management",
  "settings.button": "Settings",
  "settings.tab.options": "Options",
  "settings.tab.users": "Users",

  // =========================================================================
  // Other
  // =========================================================================
  "page.systemEvents": "System Events & Errors",
  "dashboard.avgSoc": "Avg. SoC",

  "viewer.loading3d": "3D viewer loading...",
  "header.container": "Container",
  "header.ambient": "Ambient",
  "header.humidity": "Humidity",

  "field.title": "Field",
  "field.titlePlural": "Fields",
  "field.label": "Field:",
  "field.loginTitle": "Field Login",
  "field.controlPlaceholder": "Field-level maneuvers — ManeuverPanel to be added",

  "reports.placeholder": "This page is currently under development.",
  "reports.comingSoon": "Coming soon: PDF reports, Excel export, chart reports...",
  "reports.placeholderShort": "Reports — under construction",
  "boss.sectionContainers": "Containers",

  // =========================================================================
  // Enerji Analizörü
  // =========================================================================
  "energyAnalyzer.title": "Energy Analyzer",
  "energyAnalyzer.summary": "Summary",
  "energyAnalyzer.phasePhases": "Phases",
  "energyAnalyzer.quality": "Power Quality",
  "energyAnalyzer.voltageLN": "Voltage L-N",
  "energyAnalyzer.voltageLL": "Voltage L-L",
  "energyAnalyzer.current": "Current",
  "energyAnalyzer.activePower": "Active Power",
  "energyAnalyzer.reactivePower": "Reactive Power",
  "energyAnalyzer.apparentPower": "Apparent Power",
  "energyAnalyzer.powerFactor": "Power Factor",
  "energyAnalyzer.frequency": "Frequency",
  "energyAnalyzer.energy": "Energy",
  "energyAnalyzer.thd": "THD",
  "energyAnalyzer.demand": "Demand",
  "energyAnalyzer.phaseA": "Phase A",
  "energyAnalyzer.phaseB": "Phase B",
  "energyAnalyzer.phaseC": "Phase C",
  "energyAnalyzer.total": "Total",
  "energyAnalyzer.neutral": "Neutral",
  "energyAnalyzer.activeEnergyDelivered": "Active Energy (Delivered)",
  "energyAnalyzer.activeEnergyReceived": "Active Energy (Received)",
  "energyAnalyzer.reactiveEnergyDelivered": "Reactive Energy (Inductive)",
  "energyAnalyzer.reactiveEnergyReceived": "Reactive Energy (Capacitive)",
  "energyAnalyzer.apparentEnergy": "Apparent Energy",
  "energyAnalyzer.demandPowerPresent": "Present Power Demand",
  "energyAnalyzer.demandPowerPeak": "Peak Power Demand",
  "energyAnalyzer.demandCurrentPresent": "Present Current Demand",
  "energyAnalyzer.thdCurrent": "THD Current",
  "energyAnalyzer.thdVoltage": "THD Voltage",
  "energyAnalyzer.nodata": "No data available",
} as const;
