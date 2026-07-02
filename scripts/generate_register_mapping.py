#!/usr/bin/env python3
"""Generate register-ui-mapping.json from Modbus map + device configs + UI code mappings.
Usage: python3 scripts/generate_register_mapping.py
Output: register-ui-mapping.json
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def load_json(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)

def safe_int(v):
    try:
        return int(v)
    except (ValueError, TypeError):
        return None

def load_abs(path):
    with open(path) as f:
        return json.load(f)

# ─── LOAD DATA ───────────────────────────────────────────────────────────────

MAP_JSON_PATH = os.path.join(ROOT, 'configs', 'map.json')
map_data = load_abs(MAP_JSON_PATH) if os.path.exists(MAP_JSON_PATH) else []
bsc_config = load_json('configs/bsc-simulator.json')
hvac_config = load_json('configs/hvac-simulator.json')

# ─── UI FIELD MAPPING TABLES ─────────────────────────────────────────────────
# telemetryName → (uiComponent, uiTab, uiField, uiFieldLabel)
# For names with aggregation, key is "name|aggregation"

BSC_UI_MAP = {
    # ── RackCard fields ──
    "SOC":                              ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "soc",            "SoC (%)"),
    "SOH":                              ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "soh",            "SoH (%)"),
    "Voltage":                          ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "voltage",        "Voltaj (V)"),
    "Current":                          ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "current",        "Akım (A)"),
    "ChargePower":                      ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "power_kw",       "Güç (kW)"),
    "Temperature":                      ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "temperature",    "Sıcaklık (°C)"),
    "Battery Ready":                    ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "status",         "Durum (Çevrimiçi/Çevrimdışı)"),
    "ChargeStatus":                     ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "charge_status",  "Şarj Durumu"),
    "Rack SOC":                         ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "soc",            "SoC (%)"),
    "Rack SOH":                         ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "soh",            "SoH (%)"),
    "Rack Cell Sum Voltage":            ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "voltage",        "Voltaj (V)"),
    "Rack Current":                     ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "current",        "Akım (A)"),
    "Rack Max Pack Temp":               ("RackCard\n(Rack sayfası kart bileşeni)",  "",        "temperature",    "Sıcaklık (°C)"),

    # ── RackDetailModal - Genel Bilgiler ──
    "Version":                          ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "firmwareVersion",     "Yazılım Sürümü"),
    "SWName":                           ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "bmsSwName",            "BMS Yazılım Adı"),
    "SerialNumber":                     ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "serialNumber",         "Seri No"),
    "SensorType":                       ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "currentSensorType",    "Akım Sensörü Tipi"),
    "CloseCurrent":                     ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "relayCloseCurrent",    "Röle Kapama Akımı (A)"),
    "Type":                             ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "packType",             "Paket Tipi"),
    "Count":                            ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "packCount",            "Paket Sayısı"),
    # manufacturer, model → from DeviceInfo, not telemetry
    "DEVICE:manufacturer":              ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "manufacturer",         "Üretici"),
    "DEVICE:model":                     ("RackDetailModal\n('Detay Göster' butonu → Genel Bilgiler sekmesi)", "Genel Bilgiler", "model",                "Model"),

    # ── RackDetailModal - Telemetri (Temel) ──
    "State":                            ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "state",                "Durum Kodu"),
    "Heartbeat":                        ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "heartbeat",            "Heartbeat"),

    # ── RackDetailModal - Telemetri (Gelişmiş) ──
    "CellVoltage|max":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "maxCellVoltage",       "Maks Hücre Voltajı (V)"),
    "CellVoltage|min":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "minCellVoltage",       "Min Hücre Voltajı (V)"),
    "CellVoltage|avg":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "avgCellVoltage",       "Ort Hücre Voltajı (V)"),
    "CellLocation|max":                 ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "maxCellLocation",      "Maks Hücre Konumu"),
    "CellLocation|min":                 ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "minCellLocation",      "Min Hücre Konumu"),
    "Temperature|max":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "maxPackTemperature",   "Maks Paket Sıcaklığı (°C)"),
    "Temperature|min":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "minPackTemperature",   "Min Paket Sıcaklığı (°C)"),
    "Temperature|avg":                  ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "avgPackTemperature",   "Ort Paket Sıcaklığı (°C)"),
    "BalanceTime":                      ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "balancingTime",        "Dengeleme Süresi (s)"),
    "OpenCount":                        ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "mcOpenCount",          "MC Açma Sayısı"),
    "NonBalancePeriod":                 ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "nonBalancingPeriod",   "Dengelemesiz Dönem (gün)"),
    "DischargePower":                   ("RackDetailModal\n('Detay Göster' butonu → Telemetri sekmesi)", "Telemetri",     "dischargePowerLimit",  "Deşarj Güç Limiti (kW)"),
}

# ── BSC Teşhis tab diagnostic names (grouped) ──
BSC_DIAG_GROUPS = {
    "BSC Durumu":               ["BSC Alarm", "BSC Warning", "BSC Fault"],
    "Kontrolcü Bağlantısı":     ["Controller LOC Alarm", "Controller LOC Warning", "Controller LOC Fault"],
    "Güç Koruması":             ["Over Charge Power Alarm", "Over Charge Power Warning", "Over Charge Power Fault",
                                 "Over Discharge Power Alarm", "Over Discharge Power Warning", "Over Discharge Power Fault"],
    "Sistem Log":               ["SLF (System Logging Failure) Alarm", "SLF (System Logging Failure) Warning", "SLF (System Logging Failure) Fault"],
    "Çoklu Raf":                ["MFRD (Multiple Fault Rack) Alarm", "MFRD (Multiple Fault Rack) Warning", "MFRD (Multiple Fault Rack) Fault"],
    "Çevrimdışı Raf":           ["Over Offline Rack Alarm", "Over Offline Rack Warning", "Over Offline Rack Fault"],
    "Yazılım Uyuşmazlığı":      ["RBMS SW Version Mismatch Alarm", "RBMS SW Version Mismatch Warning", "RBMS SW Version Mismatch Fault"],
    "Raf Durumu":               ["Warning", "Fault", "Cell Balancing", "DC Line Closed", "Battery Ready", "Charge Power Derating", "Current Sensor Type"],
    "Bileşen Durumu":           ["PC Status", "MC(+) Status", "MC(-) Status", "CB Status", "Pack Fan1", "Pack Fan2", "BPU Fan"],
}

HVAC_UI_MAP = {
    "Equipment Status":         ("TMS (Dashboard PixiJS grafiği) +\nDeviceGauges (gösterge paneli)",  "Dashboard",  "status",             "Cihaz Durumu (Beklemede/Çalışıyor/Arıza)"),
    "Current Temp":             ("TMS (Dashboard PixiJS grafiği) +\nDeviceGauges (gösterge paneli)",  "Dashboard",  "currentTemp",        "Güncel Sıcaklık (°C)"),
    "Supply Temp":              ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "supplyTemp",         "Besleme Sıcaklığı (°C)"),
    "Return Humidity":          ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "returnHumidity",     "Dönüş Nemi (%)"),
    "Outside Temp":             ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "outsideTemp",        "Dış Sıcaklık (°C)"),
    "Condenser Temp":           ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "condenserTemp",      "Kondenser Sıcaklığı (°C)"),
    "Evaporator Temp":          ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "evaporatorTemp",     "Evaporatör Sıcaklığı (°C)"),
    "Internal Fan Speed":       ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "internalFanSpeed",   "İç Fan Hızı (rpm)"),
    "External Fan Speed":       ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "externalFanSpeed",   "Dış Fan Hızı (rpm)"),
    "AC Input Voltage":         ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "acVoltage",          "AC Giriş Voltajı (V)"),
    "Compressor Runtime":       ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "compressorRuntime",  "Kompresör Çalışma Süresi (h)"),
    "Equipment Runtime":        ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "equipmentRuntime",   "Cihaz Çalışma Süresi (h)"),
    "Internal Fan Runtime":     ("DeviceGauges\n(Dashboard gösterge paneli)",  "Dashboard",  "fanRuntime",         "Fan Çalışma Süresi (h)"),
    "Cooling Setpoint":         ("Kontrol Paneli\n(Kontrol sayfası)",  "Dashboard",  "coolingSetpoint",    "Soğutma Ayar Noktası (°C)"),
    "Heating Setpoint":         ("Kontrol Paneli\n(Kontrol sayfası)",  "Dashboard",  "heatingSetpoint",    "Isıtma Ayar Noktası (°C)"),
    "Electric Heating On":      ("TMS (Dashboard PixiJS grafiği\nHVAC ünitesi durum göstergesi)",  "Dashboard",  "mode",               "Elektrikli Isıtma Açık"),
    "Outdoor Fan Status":       ("TMS (Dashboard PixiJS grafiği\nHVAC ünitesi durum göstergesi)",  "Dashboard",  "outdoorFanStatus",   "Dış Fan Durumu"),
    "Indoor Fan Status":        ("TMS (Dashboard PixiJS grafiği\nHVAC ünitesi durum göstergesi)",  "Dashboard",  "indoorFanStatus",    "İç Fan Durumu"),
    "Compressor Status":        ("TMS (Dashboard PixiJS grafiği\nHVAC ünitesi durum göstergesi)",  "Dashboard",  "compressorStatus",   "Kompresör Durumu"),
}

# ─── PARSE MAP.JSON ──────────────────────────────────────────────────────────

map_registry = {}  # str(addr) → metadata dict
for entry in map_data:
    addr = safe_int(entry.get('MODBUS Address', ''))
    if addr is None:
        continue
    key = str(addr)
    if key not in map_registry or not map_registry[key].get('variableName'):
        map_registry[key] = {
            'variableName': entry.get('Variable Name', '') or '',
            'dataTag': entry.get('Data Tag', '') or '',
            'name': entry.get('Name', '') or '',
            'source': (entry.get('Source', '') or '').replace('\n', ' ').strip()[:60],
            'whereTo': entry.get('Where to', '') or '',
            'type': entry.get('Type', '') or '',
            'unit': entry.get('Unit', '') or '',
            'description': (entry.get('Description', '') or '').replace('\n', ' ').strip()[:200],
        }

# ─── HELPER: get map metadata for an address (with per-rack fallback) ─────

BSC_NAMEPLATE_BASE = 30170
BSC_STRIDE = 200

def get_bsc_map_meta(addr):
    """Get map.json metadata for a BSC register address. Falls back to Rack 1 base for per-rack addresses."""
    key = str(addr)
    if key in map_registry and map_registry[key].get('name'):
        return map_registry[key]

    # Per-rack fallback: if addr > NAMEPLATE_BASE + STRIDE, derive Rack 1 address
    if addr >= BSC_NAMEPLATE_BASE:
        offset = addr - BSC_NAMEPLATE_BASE
        rack_id = (offset // BSC_STRIDE) + 1
        base_offset = offset % BSC_STRIDE
        rack1_addr = BSC_NAMEPLATE_BASE + base_offset
        rack1_key = str(rack1_addr)
        if rack1_key in map_registry and map_registry[rack1_key].get('name'):
            meta = dict(map_registry[rack1_key])
            meta['variableName'] = f"{meta['variableName']} (Rack {rack_id})"
            meta['_rackId'] = rack_id
            return meta

    return None

def get_hvac_map_meta(_addr):
    """Get map metadata for an HVAC register."""
    # HVAC doesn't have a map.json — return empty metadata
    return {
        'variableName': '',
        'dataTag': '',
        'name': '',
        'source': 'HVAC PDF',
        'whereTo': '',
        'type': '',
        'unit': '',
        'description': '',
    }

# ─── BUILD BSC MAPPING ──────────────────────────────────────────────────────

rows = []

for t in bsc_config['telemetry']:
    addr = t['registerAddress']
    meta = get_bsc_map_meta(addr)
    if meta is None:
        continue

    telemetry_name = t.get('name', '')
    tags = t.get('tags', {})
    rack_id = tags.get('rack_id', '')
    aggregation = tags.get('aggregation', '')

    # Determine scope
    if rack_id and rack_id != 'system':
        scope = 'per-rack'
        rack_label = f"Rack {rack_id}"
    else:
        scope = 'system'
        rack_label = ''

    # UI field lookup
    lookup_key = telemetry_name
    if aggregation:
        alt_key = f"{telemetry_name}|{aggregation}"
        if alt_key in BSC_UI_MAP:
            lookup_key = alt_key

    ui = BSC_UI_MAP.get(lookup_key, None)

    # Check diagnostics
    if ui is None and telemetry_name:
        for diag_group, diag_names in BSC_DIAG_GROUPS.items():
            if telemetry_name in diag_names:
                ui = ("RackDetailModal", "Teşhis", diag_group, telemetry_name)
                break

    ui_component = ui[0] if ui else ""
    ui_tab = ui[1] if ui else ""
    ui_field = ui[2] if ui else ""
    ui_label = ui[3] if ui else ""

    # Tags string
    tags_str = ", ".join(f"{k}: {v}" for k, v in tags.items())

    row = {
        "deviceName": bsc_config.get('name', ''),
        "deviceId": bsc_config.get('deviceId', ''),
        "deviceType": "BSC",
        "registerAddress": addr,
        "registerHex": hex(addr),
        "variableName": meta.get('variableName', ''),
        "dataTag": meta.get('dataTag', ''),
        "mapName": meta.get('name', ''),
        "sourceGroup": meta.get('source', ''),
        "dataType": meta.get('type', ''),
        "unit": meta.get('unit', ''),
        "description": meta.get('description', ''),
        "telemetryName": telemetry_name,
        "tags": tags_str,
        "aggregation": aggregation,
        "scope": scope,
        "rackLabel": rack_label,
        "page": meta.get('whereTo', ''),
        "component": ui_component,
        "tab": ui_tab,
        "field": ui_field,
        "label": ui_label,
    }
    rows.append(row)

# Add manufacturer/model pseudo-rows (from DeviceInfo, not telemetry)
for field_key, label_key in [('DEVICE:manufacturer', 'manufacturer'), ('DEVICE:model', 'model')]:
    ui = BSC_UI_MAP.get(field_key)
    if ui:
        rows.append({
            "deviceName": bsc_config.get('name', ''),
            "deviceId": bsc_config.get('deviceId', ''),
            "deviceType": "BSC",
            "registerAddress": 0,
            "registerHex": "",
            "variableName": "",
            "dataTag": "",
            "mapName": label_key.title(),
            "sourceGroup": "DeviceConfig",
            "dataType": "string",
            "unit": "",
            "description": f"Cihaz {label_key} bilgisi — telemetry değil, cihaz kaydından gelir",
            "telemetryName": "",
            "tags": "source: devices table",
            "aggregation": "",
            "scope": "system",
            "rackLabel": "",
            "page": "",
            "component": ui[0],
            "tab": ui[1],
            "field": ui[2],
            "label": ui[3],
        })

# ─── BUILD BSC BITFIELD (TEŞHIS) MAPPING ────────────────────────────────────

for bf in bsc_config.get('bitfieldConfigs', []):
    bf_tags = bf.get('tags', {})
    bf_rack_id = bf_tags.get('rack_id', '')
    bf_scope = 'per-rack' if (bf_rack_id and bf_rack_id != 'system') else 'system'
    bf_rack_label = f"Rack {bf_rack_id}" if bf_scope == 'per-rack' else ''

    for field in bf['fields']:
        name = field.get('name', '')
        # Find which diagnostic group this belongs to
        ui_group = ""
        for diag_group, diag_names in BSC_DIAG_GROUPS.items():
            if name in diag_names:
                ui_group = diag_group
                break

        tags_str = ", ".join(f"{k}: {v}" for k, v in {**bf_tags, **field.get('tags', {})}.items())

        rows.append({
            "deviceName": bsc_config.get('name', ''),
            "deviceId": bsc_config.get('deviceId', ''),
            "deviceType": "BSC",
            "registerAddress": bf['registerAddress'],
            "registerHex": hex(bf['registerAddress']),
            "variableName": "",
            "dataTag": field.get('dataTag', ''),
            "mapName": name,
            "sourceGroup": f"bitfieldConfigs (reg {bf['registerAddress']})",
            "dataType": "bitfield",
            "unit": field.get('unit', '-'),
            "description": field.get('description', ''),
            "telemetryName": name,
            "tags": tags_str,
            "aggregation": "",
            "scope": bf_scope,
            "rackLabel": bf_rack_label,
            "page": "",
            "component": "RackDetailModal\n('Detay Göster' butonu → Teşhis sekmesi)" if ui_group else "",
            "tab": "Teşhis" if ui_group else "",
            "field": ui_group,
            "label": name,
        })
# ─── BUILD HVAC MAPPING ─────────────────────────────────────────────────────

for t in hvac_config['telemetry']:
    addr = t['registerAddress']
    telemetry_name = t.get('name', '')
    tags = t.get('tags', {})
    unit_tag = tags.get('unit', '')
    room = tags.get('room', '')
    zone = tags.get('zone', '')

    scope = 'per-room' if room else 'system'
    unit_label = f"Room {room}" if room else ''

    ui = HVAC_UI_MAP.get(telemetry_name, ("", "", "", ""))

    tags_str = ", ".join(f"{k}: {v}" for k, v in tags.items())

    row = {
        "deviceName": hvac_config.get('name', ''),
        "deviceId": hvac_config.get('deviceId', ''),
        "deviceType": "HVAC",
        "registerAddress": addr,
        "registerHex": hex(addr),
        "variableName": "",
        "dataTag": "",
        "mapName": telemetry_name,
        "sourceGroup": "HVAC PDF §7.1 Bilgi Toplama",
        "dataType": "",
        "unit": t.get('unit', ''),
        "description": "",
        "telemetryName": telemetry_name,
        "tags": tags_str,
        "aggregation": "",
        "scope": scope,
        "rackLabel": unit_label,
        "page": "",
        "component": ui[0],
        "tab": ui[1],
        "field": ui[2],
        "label": ui[3],
    }
    rows.append(row)

# ─── SORT ────────────────────────────────────────────────────────────────────

rows.sort(key=lambda r: (r['deviceType'], r['registerAddress']))

# ─── WRITE JSON ──────────────────────────────────────────────────────────────

output_path = os.path.join(ROOT, 'docs', 'mappings', 'register-ui-mapping.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(rows, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    print(f"Generated {len(rows)} rows → {output_path}")
    bsc_rows = [r for r in rows if r['deviceType'] == 'BSC']
    hvac_rows = [r for r in rows if r['deviceType'] == 'HVAC']
    mapped = [r for r in rows if r['field']]
    print(f"  BSC: {len(bsc_rows)} rows ({sum(1 for r in bsc_rows if r['field'])} mapped to UI)")
    print(f"  HVAC: {len(hvac_rows)} rows ({sum(1 for r in hvac_rows if r['field'])} mapped to UI)")
