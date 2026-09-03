# Olay Müdahale ve 24/72 Saat Bildirim Prosedürü (Faz 6 T6.5)

**Amaç:** NIS-2 Madde 23 uyarınca "önemli olay"ların yetkili otoriteye ve etkilenen taraflara erken uyarı (24 saat) + tam bildirim (72 saat) yükümlülüğünün yerine getirilmesi. Bu prosedür sahada yaşanan güvenlik olaylarının sınıflandırılmasını, eskalasyonunu ve bildirim adımlarını tanımlar.

## 1. Olay sınıflandırması

| Seviye | Tanım | Örnek | Bildirim |
|---|---|---|---|
| **Kritik** | Enerji hizmetinin kesintiye uğraması veya yaygın veri ihlali | Tünel protokolünün ele geçirilmesi, sahte konteyner kaydı, toplu müşteri verisi sızıntısı | 24 saat erken uyarı + 72 saat tam bildirim |
| **Yüksek** | Hizmeti etkilemeyen ama sistemik güvenlik olayı | Başarılı hesap ele geçirme (tek kullanıcı), yaygın brute-force, zararlı yazılım bulgusu | 72 saat bildirim (otorite talebine göre) |
| **Orta** | İzole güvenlik olayı — iç kayıt yeterli | Tek kullanıcının başarısız giriş saldırısı (kilit devrede), config reddi | İç kayıt; aylık özet |

## 2. Tespit kanalları

1. **İmzalı log zinciri:** `log_events` (TimescaleDB) + dosya sink'i; `tools/verify-log.mjs` ile bütünlük doğrulaması.
2. **Güvenlik olayları (eventCode):** `login_locked`, `session_anomaly`, `ws_register_rejected`, `tamper_detected`, `mfa_login_failed`, `audit_sink_failure`.
3. **Bildirimler:** T6.7 AlertNotifier (mail/SMS — cooldown'lu) bu olaylarda otomatik tetiklenir.
4. **Harici:** müşteri şikayeti, saha personeli raporu, SIEM (T6.8 sonrası), pentest bulgusu.

## 3. Eskalasyon matrisi

| Süre | Aksiyon | Sorumlu |
|---|---|---|
| T+0 | Olayın imzalı logdan/alarmdan teyidi; ilk izolasyon (etkilenen konteyner/saha kapsamı) | Nöbetçi mühendis |
| T+2 sa | Seviye belirleme (yukarıdaki tablo); delil paketi başlatma (`verify-log.mjs` çıktısı + ilgili log satırları + config anlık görüntüsü) | Güvenlik sorumlusu |
| T+24 sa | **Erken uyarı bildirimi** (Kritik ise): olayın niteliği, etkilenen sistemler, alınan önlemler | Üst yönetim onayıyla |
| T+72 sa | **Tam bildirim:** kök neden, etki analizi, kalıcı önlemler, tekrar yaşanmama planı | Güvenlik sorumlusu |
| T+2 hafta | Post-incident inceleme: prosedür güncellemesi, kalıcı düzeltmelerin PR'ları | Tüm ekip |

## 4. Bildirim adresleri (Türkiye)

| Muhatap | Dayanak | Kanal |
|---|---|---|
| **BTK / USOM** (Ulusal Siber Olaylara Müdahale Merkezi) | 5809 sayılı Kanun + NIS-2 iç hukuka aktarımı | USOM bildirim portalı (CSIRT bildirim formatı) |
| **EPDK / sektörel otorite** (enerji — essential entity) | Sektörel NIS-2 muhatabı | Resmi yazı + portal |
| Etkilenen müşteriler/kullanıcılar | KVKK/NIS-2 | Müşteri kanalı üzerinden |

*Not: NIS-2 ulusal mevzuata aktarım sürecinde bildirim kanalı değişebilir — T6.9 doküman güncelleme döngüsünde bu tablo kontrol edilir.*

## 5. Delil paketi (her olayda zorunlu)

1. `verify-log.mjs` zincir doğrulama çıktısı (imzalı log bütünlüğü kanıtı)
2. İlgili `log_events` satırları (correlationId ile olay zinciri)
3. `session_audit` kayıtları (tünel oturumuysa)
4. Config anlık görüntüsü (secret'lar redakte)
5. Alınan ilk önlemlerin zaman çizelgesi

## 6. Şablon: 24 saat erken uyarı bildirimi

```
Olay ID: GD-<yil>-<sira>
Tespit zamanı: ...
Seviye: Kritik/Yüksek
Nitelik: (ör. "konteyner register token'ının ele geçirilme şüphesi")
Etkilenen sistemler: (saha/konteyner listesi)
İlk önlemler: (izolasyon, kilit, token rotasyonu)
Beklenen tam bildirim: <T+72 sa tarih>
```

## 7. Eğitim ve tatbikat

- Yılda en az 1 masaüstü tatbikatı: senaryolu olay (ör. sahte konteyner register denemesi) → tespit → 24/72 saat akışının kuru çalışması.
- Nöbetçi mühendis listesi ve iletişim kanalları (T6.7 bildirim hedefleriyle aynı yerden yönetilir).
