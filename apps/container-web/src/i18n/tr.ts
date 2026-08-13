/**
 * Container-web uygulamasına özel Türkçe çeviri anahtarları.
 *
 * UI paketindeki generic anahtarları (common.*, chart.*, status.*, error.*) override etmez,
 * TranslationProvider'ın extraKeys prop'u ile birleştirilir.
 */

export const APP_TR_DICT = {
  // =========================================================================
  // Cihaz Durumu & Metrikler
  // =========================================================================
  "device.voltage": "Voltaj",
  "device.current": "Akım",
  "device.power": "Güç",
  "device.temperature": "Sıcaklık",
  "device.maxTemperature": "Sıcaklık (Maks)",
  "device.soc": "Şarj Durumu",
  "device.chargePower": "Şarj Gücü",
  "device.dischargePower": "Deşarj Gücü",
  "device.commandResponse": "Komut Yanıtı",
  "device.powerConsumption": "Güç Tüketimi",
  "device.anticipatedVoltage": "Beklenen Voltaj",
  "device.version": "Versiyon",
  "device.state": "Durum",
  "device.heartbeat": "Heartbeat",
  "device.lastCommand": "Son Komut",
  "device.rack": "Raf",
  "device.systemPower": "Sistem Gücü",
  "device.systemSoc": "Sistem SoC",
  "device.systemSoh": "Sistem SoH",

  "device.chargeStatus.Charge": "Şarj Oluyor",
  "device.chargeStatus.Discharge": "Deşarj Oluyor",
  "device.chargeStatus.Idle": "Beklemede",
  "device.chargeStatus.Offline": "Çevrimdışı",
  "device.chargeStatus.unknown": "Bilinmiyor",

  "device.type.bsc": "BSC",
  "device.type.cb": "CB",
  "device.type.dcOutput": "DC-Çıkış",
  "device.type.hvac": "HVAC",

  "device.table.name": "Ad",
  "device.table.type": "Tip",
  "device.table.protocol": "Protokol",
  "device.table.rack": "Rack",
  "device.table.model": "Model",
  "device.table.status": "Durum",
  "device.table.poll": "Poll (ms)",
  "device.table.lastSeen": "Son Görülme",

  // =========================================================================
  // Kimlik Doğrulama
  // =========================================================================
  "auth.appTitle": "Enerji Yönetim Sistemi",
  "auth.username": "Kullanıcı Adı",
  "auth.password": "Şifre",
  "auth.login": "Giriş Yap",
  "auth.logout": "Çıkış",
  "auth.guest": "Misafir Olarak Devam Et",
  "auth.loggingIn": "Giriş yapılıyor...",
  "auth.loginFailed": "Giriş başarısız",
  "auth.or": "veya",
  "auth.demoUser": "Demo Kullanıcı:",
  "auth.loginError": "Geçersiz kullanıcı adı veya şifre",
  "auth.loginTitle.field": "Saha Girişi",
  "auth.loginTitle.boss": "Yönetici Girişi",
  "auth.usernamePlaceholder": "Kullanıcı adı",
  "auth.passwordPlaceholder": "Şifre",

  // =========================================================================
  // Navigasyon
  // =========================================================================
  "nav.dashboard": "Panel",
  "nav.scada": "Tek Hat",
  "nav.bsc": "BSC",
  "nav.racks": "Rack Detayları",
  "nav.control": "Kontrol",
  "nav.hvac": "HVAC",
  "nav.analytics": "Analitik",
  "nav.reports": "Raporlar",
  "nav.events": "Olay & Geçmiş",
  "nav.devices": "Cihazlar",
  "nav.fire": "Yangın Paneli",
  "nav.energyAnalyzer": "Enerji Analizörü",
  "nav.hvac": "HVAC",
  "nav.systemCharts": "Sistem Grafikleri",
  "nav.expand": "Menüyü Genişlet",
  "nav.collapse": "Menüyü Daralt",
  "nav.user": "Kullanıcı",
  "nav.guest": "Misafir",
  "nav.containers": "Konteynerler",
  "nav.charts": "Grafikler",
  "nav.eventsShort": "Olaylar",
  "nav.collapseShort": "Daralt",

  "nav.emergency.title": "ACİL DURDURMA",
  "nav.emergency.confirm": "ACİL DURDURMA: Tüm sistem duracak. Devam etmek istiyor musunuz?",
  "nav.emergency.button": "ACİL DURDUR",

  // =========================================================================
  // Manevra
  // =========================================================================
  "maneuver.run": "▶ Çalıştır",
  "maneuver.running": "Çalışıyor...",
  "maneuver.retry": "Tekrar Dene",
  "maneuver.rollback": "Geri Al",
  "maneuver.scheduled": "📅 Zamanla...",
  "maneuver.scheduledHint": "Zamanlı (süre dolunca otomatik durur)",
  "maneuver.duration": "Süre",
  "maneuver.now": "Şimdi",
  "maneuver.remaining": "kaldı",
  "maneuver.steps": "Adımlar",
  "maneuver.inputs": "Girdiler",
  "maneuver.seconds": "sn",
  "maneuver.timed": "Zamanlı (süre dolunca otomatik durur)",
  "maneuver.schedule": "Zamanla",
  "maneuver.rollbackSuccess": "Geri alındı",
  "maneuver.rollbackFailed": "Geri alma başarısız",
  "maneuver.rollbackSendFailed": "Geri alma gönderilemedi",

  "maneuver.desc.fl_bsc_power": "BSC'leri şarj veya deşarj moduna alır. Süre verilirse süre dolunca otomatik durdurur.",
  "maneuver.desc.fl_idle": "Tüm BSC'lerde şarj/deşarj işlemini durdurur.",
  "maneuver.desc.fl01_start": "DC switch'leri açar, BSC'leri başlatır, DC çıkışları aktif eder. Tüm adımlar paralel çalışır.",
  "maneuver.desc.fl02_aux_loss": "AUX enerjisi kesildiğinde: BSC'leri durdurur, DC çıkışları kapatır, DC switch'leri açar. Sıralı çalışır.",
  "maneuver.desc.fl03_emergency_stop": "Acil durdurma butonu tetiklendiğinde tüm sistemi güvenli şekilde kapatır.",
  "maneuver.desc.fl04_calibration_charge": "Kalibrasyon için BSC'leri 500 kW ile şarj moduna alır.",
  "maneuver.desc.fl04_calibration_discharge": "Kalibrasyon için BSC'leri 500 kW ile deşarj moduna alır.",
  "maneuver.desc.fl05_tms_cooling_force": "Tüm HVAC ünitelerini soğutma moduna zorlar. Setpoint 1.0°C'ye çekilir.",
  "maneuver.desc.fl05_tms_heating_force": "Tüm HVAC ünitelerini ısıtma moduna zorlar. Setpoint 50°C'ye çekilir.",
  "maneuver.desc.fl05_tms_block_charge": "Termal koruma tetiklendiğinde tüm BSC'lerde şarj/deşarj işlemini durdurur.",
  "maneuver.desc.fl06_charge": "DC switch'leri kapattıktan sonra BSC'leri şarj moduna alır. Herhangi bir adım başarısız olursa durur.",
  "maneuver.desc.fl06_discharge": "DC switch'leri kapattıktan sonra BSC'leri deşarj moduna alır. Herhangi bir adım başarısız olursa durur.",
  "maneuver.desc.fl07_door_open": "Kapı açıldığında güvenlik için tüm BSC'lerde şarj/deşarj işlemini durdurur.",
  "maneuver.desc.fl08_dc_fault": "DC barada aşırı gerilim/düşük gerilim/aşırı akım/aşırı güç durumunda BSC'leri durdurur ve DC switch'leri açar.",
  "maneuver.desc.fl09_comm_loss": "PPC veya ekipman iletişimi kesildiğinde şarj/deşarj işlemini durdurur.",
  "maneuver.desc.fl10_maintenance_shutdown": "Bakım moduna geçişte BSC'leri durdurur, DC switch'leri açar. Sıralı çalışır.",
  "maneuver.desc.fl11_ground_fault": "IMD izolasyon değeri idealin altına düştüğünde sistemi güvenli şekilde kapatır.",
  "maneuver.desc.fl_dc_breaker_close": "Tüm DC kesicileri kapatır (CB-1, CB-2).",
  "maneuver.desc.fl_contactor_close": "Tüm BSC cihazlarındaki kontaktörleri kapatır.",

  "maneuver.fieldChargeAll": "Tüm Konteynerleri Şarj Et",
  "maneuver.fieldChargeAllDesc": "Sahadaki tüm konteynerleri aynı anda şarj moduna alır",
  "maneuver.fieldDischargeAll": "Tüm Konteynerleri Deşarj Et",
  "maneuver.fieldDischargeAllDesc": "Sahadaki tüm konteynerleri aynı anda deşarj moduna alır",
  "maneuver.fieldEmergencyStop": "Acil Durdurma (Saha)",
  "maneuver.fieldEmergencyStopDesc": "Sahadaki tüm konteynerleri acil durdurur",

  // =========================================================================
  // Log Terminali
  // =========================================================================
  "log.clear": "Temizle",
  "log.success": "Başarılı",
  "log.error": "Hata",
  "log.warning": "Uyarı",
  "log.info": "Bilgi",
  "log.empty": "Henüz log kaydı yok.",
  "log.emptyHint": "Komut gönderdiğinizde burada görünecektir.",
  "log.total": "Toplam {count} kayıt",

  // =========================================================================
  // Yangın Paneli
  // =========================================================================
  "fire.systemStatus": "Sistem Durumu",
  "fire.status.fire": "YANGIN",
  "fire.status.none": "Yok",
  "fire.status.error": "Arıza Durumu",
  "fire.release": "Salım",
  "fire.cancel": "İptal",
  "fire.manualRelease": "Manuel Salım",
  "fire.confirmRelease": "Manuel salım başlatılacak!",
  "fire.confirmButton": "Salımı Onayla",
  "fire.cancelButton": "Vazgeç",
  "fire.status.fireCondition": "Yangın Durumu",
  "fire.status.exists": "VAR",
  "fire.confirmReleaseFull": "Manuel salım başlatılacak! Bu işlem yangın söndürme sistemini tetikler. Emin misiniz?",
  "fire.relay.firstStage": "1. Kademe",
  "fire.relay.secondStage": "2. Kademe",
  "fire.relay.discharged": "Salım",
  "fire.relay.extract": "Tahliye",
  "fire.relay.hold": "Beklet",
  "fire.relay.modeAuto": "Mod Oto",
  "fire.relay.localFire": "Yerel Yangın",
  "fire.relay.reset": "Sıfırlama",
  "fire.relay.fault": "Arıza",
  "fire.relay.fire": "Yangın",
  "fire.button.hold": "Beklet",
  "fire.button.modeToggle": "Mod Değiştir",

  // =========================================================================
  // Konteyner
  // =========================================================================
  "container.connected": "PPC: Bağlı",
  "container.disconnected": "PPC: Bağlantı Yok",
  "container.power": "Güç",
  "container.temperature": "Sıcaklık",
  "container.device": "Cihaz",
  "container.totalPower": "Toplam Güç",
  "container.alarm": "Alarm",
  "container.title": "Konteyner",
  "container.titlePlural": "Konteynerler",
  "container.notFound": "Konteyner bulunamadı",
  "container.devices": "Cihazlar",
  "container.telemetryTitle": "Konteyner Telemetri",
  "container.outputStatus": "Çıkış Durumu",
  "container.dcVoltage": "DC Voltaj",
  "container.dcCurrent": "DC Akım",
  "container.label": "Konteyner:",
  "container.rooms": "{count} oda — Ort. {temp}°C",
  "container.trip": "Trip",

  // =========================================================================
  // Ayarlar
  // =========================================================================
  "settings.title": "Ayarlar",
  "settings.appearance": "Görünüm",
  "settings.theme.dark": "Koyu",
  "settings.theme.light": "Açık",
  "settings.theme.comingSoon": "yakında",
  "settings.language": "Dil",
  "settings.lang.tr": "Türkçe",
  "settings.lang.en": "English",
  "settings.userManagement": "Kullanıcı Yönetimi",
  "settings.button": "Ayarlar",
  "settings.tab.options": "Seçenekler",
  "settings.tab.users": "Kullanıcılar",

  // =========================================================================
  // Diğer
  // =========================================================================
  "page.systemEvents": "Sistem Event & Hataları",
  "dashboard.avgSoc": "Ort. SoC",

  "viewer.loading3d": "3B görüntüleyici yükleniyor...",
  "header.container": "Container",
  "header.ambient": "Ortam",
  "header.humidity": "Nem",

  "field.title": "Saha",
  "field.titlePlural": "Sahalar",
  "field.label": "Saha:",
  "field.loginTitle": "Saha Girişi",
  "field.controlPlaceholder": "Saha seviyesi manevralar — ManeuverPanel eklenecek",

  "reports.placeholder": "Bu sayfa şu anda geliştirme aşamasındadır.",
  "reports.comingSoon": "Yakında eklenecek: PDF raporları, Excel export, grafik raporları...",
  "reports.placeholderShort": "Raporlar — yapım aşamasında",
  "boss.sectionContainers": "Konteynerler",

  // =========================================================================
  // Enerji Analizörü
  // =========================================================================
  "energyAnalyzer.title": "Enerji Analizörü",
  "energyAnalyzer.summary": "Özet",
  "energyAnalyzer.phasePhases": "Fazlar",
  "energyAnalyzer.quality": "Güç Kalitesi",
  "energyAnalyzer.voltageLN": "Faz-Nötr Gerilimi",
  "energyAnalyzer.voltageLL": "Faz Arası Gerilim",
  "energyAnalyzer.current": "Akım",
  "energyAnalyzer.activePower": "Aktif Güç",
  "energyAnalyzer.reactivePower": "Reaktif Güç",
  "energyAnalyzer.apparentPower": "Görünür Güç",
  "energyAnalyzer.powerFactor": "Güç Faktörü",
  "energyAnalyzer.frequency": "Frekans",
  "energyAnalyzer.energy": "Enerji",
  "energyAnalyzer.thd": "THD",
  "energyAnalyzer.demand": "Talep",
  "energyAnalyzer.phaseA": "Faz A",
  "energyAnalyzer.phaseB": "Faz B",
  "energyAnalyzer.phaseC": "Faz C",
  "energyAnalyzer.total": "Toplam",
  "energyAnalyzer.neutral": "Nötr",
  "energyAnalyzer.activeEnergyDelivered": "Aktif Enerji (Tüketilen)",
  "energyAnalyzer.activeEnergyReceived": "Aktif Enerji (Üretilen)",
  "energyAnalyzer.reactiveEnergyDelivered": "Reaktif Enerji (Endüktif)",
  "energyAnalyzer.reactiveEnergyReceived": "Reaktif Enerji (Kapasitif)",
  "energyAnalyzer.apparentEnergy": "Görünür Enerji",
  "energyAnalyzer.demandPowerPresent": "Anlık Güç Talebi",
  "energyAnalyzer.demandPowerPeak": "Pik Güç Talebi",
  "energyAnalyzer.demandCurrentPresent": "Anlık Akım Talebi",
  "energyAnalyzer.thdCurrent": "THD Akım",
  "energyAnalyzer.thdVoltage": "THD Gerilim",
  "energyAnalyzer.nodata": "Veri bulunamadı",
} as const;
