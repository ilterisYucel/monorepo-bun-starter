/**
 * Türkçe çeviri sözlüğü — UI katmanı (generic).
 *
 * Sadece domain-bağımsız, tüm uygulamalarda ortak kullanılan anahtarları içerir.
 * Uygulamaya özel anahtarlar (fire.*, settings.*, maneuver.* vb.)
 * her app'in kendi i18n/tr.ts dosyasında tanımlanır.
 *
 * Anahtar kategorileri:
 *   common.*   — genel terimler
 *   chart.*    — grafik kontrolleri ve legend
 *   status.*   — bağlantı ve sistem durumu
 *   error.*    — hata mesajları
 */

export const TR_DICT = {
  // =========================================================================
  // Genel
  // =========================================================================
  "common.online": "Çevrimiçi",
  "common.offline": "Çevrimdışı",
  "common.loading": "Yükleniyor...",
  "common.noData": "Henüz veri yok",
  "common.detail": "Detay Göster",
  "common.cancel": "İptal",
  "common.save": "Kaydet",
  "common.close": "Kapat",
  "common.all": "Tümü",
  "common.none": "Hiçbiri",
  "common.selected": "{count} seçili",
  "common.confirm": "Onayla",
  "common.back": "Geri",
  "common.role.admin": "Admin",
  "common.role.teknik": "Teknik",
  "common.role.guest": "Misafir",
  "common.role.boss": "Yönetici",

  // =========================================================================
  // Grafik
  // =========================================================================
  "chart.range.1m": "Son 1 Dakika",
  "chart.range.1h": "Son 1 Saat",
  "chart.range.1d": "Son 1 Gün",
  "chart.range.1w": "Son 1 Hafta",
  "chart.range.1M": "Son 1 Ay",
  "chart.range.3M": "Son 3 Ay",
  "chart.range.6M": "Son 6 Ay",
  "chart.range.1y": "Son 1 Yıl",
  "chart.range.custom": "Özel Aralık",
  "chart.range.from": "Başlangıç",
  "chart.range.to": "Bitiş",

  "chart.control.timeRange": "Zaman Aralığı",
  "chart.control.points": "Nokta Sayısı",
  "chart.control.points.low": "60 (Düşük)",
  "chart.control.points.standard": "120 (Standart)",
  "chart.control.points.high": "240 (Yüksek)",
  "chart.control.points.max": "500 (Maksimum)",

  "chart.control.systemEvents": "Sistem Olayları",
  "chart.control.userActions": "Kullanıcı Hareketleri",
  "chart.control.correctedEvents": "Düzeltilmiş Olaylar",
  "chart.control.metric": "Metrik",
  "chart.control.onlyEssential": "Sadece Temel",
  "chart.control.onlyDetail": "Sadece Detay",
  "chart.control.categoryEssential": "Temel Metrikler",
  "chart.control.categoryDetail": "Diğer Metrikler",
  "chart.control.searchPlaceholder": "Metrik ara...",
  "chart.control.noResults": "Sonuç bulunamadı",

  "chart.subtitle.points": "{count} nokta",
  "chart.subtitle.interval": "~{label} aralık",

  "chart.unit.seconds": "sn",
  "chart.unit.minutes": "dk",
  "chart.unit.hours": "sa",
  "chart.unit.days": "g",

  "chart.legend.series": "Seri",
  "chart.legend.last": "Son",
  "chart.legend.min": "Min",
  "chart.legend.max": "Max",
  "chart.legend.avg": "Ort",

  "chart.yAxisLabel": "Değer",

  // =========================================================================
  // Durum
  // =========================================================================
  "status.active": "Aktif",
  "status.warning": "Uyarı",
  "status.connected": "Bağlı",
  "status.disconnected": "Bağlantı Yok",
  "status.normal": "Normal",
  "status.error": "Arıza",
  "status.open": "Açık",
  "status.closed": "Kapalı",
  "status.tripped": "Atmış",
  "status.inactive": "Pasif",

  // =========================================================================
  // Hata
  // =========================================================================
  "error.loadFailed": "Yükleme başarısız",
  "error.notFound": "Bulunamadı",
  "error.unauthorized": "Yetkisiz erişim",
  "error.generic": "Bir hata oluştu",
  "error.reload": "Yeniden Yükle",
} as const;
