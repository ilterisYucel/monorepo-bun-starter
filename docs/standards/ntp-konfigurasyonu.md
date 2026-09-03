# NTP Konfigürasyonu — Konteyner (Faz 6 T6.3)

**Amaç:** Konteyner saat kayması, container-JWT TTL değerlendirmesini bozar (mimari §12.2 kırılganlık #5) ve imzalı log zincirlerindeki `ts` alanlarının güvenilirliğini düşürür. Konteynerlerde (RevPi) NTP aktif ve doğrulanabilir olmalıdır.

## Dağıtım modeli

Konteyner servisleri **host saatiyle** çalışır (saat namespace paylaşımı — konteynerde ayrı NTP istemcisi çalıştırılmaz). Sorumluluk host katmanındadır:

| Katman | Yapılandırma |
|---|---|
| RevPi host | `systemd-timesyncd` (varsayılan) veya `chrony` |
| Konteyner | host saati miras alınır — ek konfigürasyon yok |

## RevPi'de etkinleştirme ve doğrulama

```bash
# 1) chrony kur + servisi başlat (timesyncd yoksa)
sudo apt-get update && sudo apt-get install -y chrony
sudo systemctl enable --now chrony

# 2) NTP sunucularını doğrula (varsayılan havuz yeterli; saha ağında
#    yerel NTP sunucusu varsa /etc/chrony/chrony.conf içine eklenir)
grep -E "^pool|^server" /etc/chrony/chrony.conf

# 3) Senkronizasyon durumu — "System time ... fast/slow" satırı sağlıklı
chronyc tracking

# 4) Kaynak kalitesi
chronyc sources -v
```

**Kabul kriteri:** `chronyc tracking` çıktısında `Leap status: Normal` ve sistem zamanı sapması < 1 sn. Kurulumda bu çıktı saha kabul formuna eklenir.

## Doğrulama sıklığı

- **Kurulum:** tek seferlik kurulum doğrulaması (yukarıdaki komutlar).
- **İzleme:** field web-service `/health` yanıtına konteyner `lastSeenAt` sapmaları yansır — heartbeat zaman damgası ile field saati arasındaki sapma > 60 sn ise stale/bozuk saat işareti olarak değerlendirilir (ContainerProxy stale mantığı). Sürekli sapma tespitinde saha ziyareti planlanır.
- **Periyodik:** yıllık bakımda `chronyc tracking` yeniden kayıt altına alınır.

## İlgili kontroller

- NIS-2 Madde 21(2)(c) iş sürekliliği: saat kayması oturum TTL'lerini bozarak erişilebilirliği etkileyebilir.
- OWASP ASVS V3 (oturum yönetimi): TTL değerlendirmesi güvenilir saat gerektirir.
- Mimari dokümanı §12.2 kırılganlık #5: "NTP (T6.3) + kısa TTL".

## VPN'siz / çift arayüz modu notu

Saha ağında dış NTP erişimi kısıtlıysa field merkezdeki bir sunucu NTP yayınlar; RevPi'ler bu adrese işaretlenir (chrony `server <field-ntp-ip> iburst`). İnternet erişimi olmayan tam yalıtılmış sahalarda yerel RTC + haftalık manuel düzeltme prosedürü uygulanır (bakım kılavuzunda).
