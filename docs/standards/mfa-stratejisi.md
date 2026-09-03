# MFA Stratejisi — Karar Kaydı

> Tarih: 2026-08-28 · Kapsam: ikinci faktör yöntem seçimi (TOTP / e-posta OTP /
> SMS OTP / donanım anahtarı) ve gerekçeleri. Uygulama durumu: **TOTP kurulu**
> (Faz 6 T6.1, otplib + kurtarma kodları).
> İlgili: [nis-2.md](./nis-2.md), [owasp-asvs-level2.md](./owasp-asvs-level2.md)

---

## 1. Karar

| Yöntem | Karar | Gerekçe |
|:-------|:------|:--------|
| **TOTP (authenticator app)** | **BİRİNCİL — kurulu** | RFC 6238; tamamen offline çalışır; NIST/OWASP onaylı |
| E-posta OTP | **RED** | NIST 800-63B: e-posta out-of-band kimlik doğrulama kanalı olarak **YASAK** (§3.1.3) |
| SMS/telefon OTP | **RED** | NIST: "restricted authenticator" (ek koşullar + VoIP kontrolü); saha ölçeğinde SMS sağlayıcısı kurulamaz |
| Donanım anahtarı (FIDO2/passkey) | **Gelecek** | En güçlü sınıf (phishing-resistant); Faz 7+ adayı |
| Kurtarma kodları | **Kurulu** | TOTP kaybına karşı; tek kullanımlık, hash'li saklanır (Faz 6) |

## 2. Neden TOTP

### 2.1 Standart referansları

- **NIST SP 800-63B** (AAL2): izin verilen ikinci faktörler arasında
  "single-factor OTP" (TOTP authenticator app) ve "look-up secret" (kurtarma
  kodları) açıkça yer alır. E-posta ise **açıkça yasaklanmıştır**:
  > "Methods that do not prove possession of a specific device, such as
  > voice-over-IP (VOIP) or email, **SHALL NOT** be used for out-of-band
  > authentication."
  Gerekçeler: mail hesabı çoğunlukla yalnızca parolayla korunur (ikinci faktör
  olmaz), iletim/intermediate sunucu riski, DNS yönlendirme (rerouting)
  saldırıları. SMS/PSTN OTP ise "restricted authenticator" sınıfındadır.
- **OWASP MFA Cheat Sheet:** yöneticiler için MFA zorunlu; TOTP önerilir;
  e-posta yalnızca mail hesabının kendisi MFA korumalıysa "sahip olunan faktör"
  sayılır. SMS'ten kaçınılır.
- **MDN (OTP):** "Prefer TOTP to email-based or SMS-based OTP."
- **ASVS V2:** çok faktörlü kimlik doğrulama gereksinimleri TOTP ile karşılanır
  (MFA zorunlu roller field/boss tier'da enforcement altında — `rbac.ts`).

### 2.2 Endüstriyel/OT gerekçesi (NIS-2 kapsamı)

Saha uygulaması bir sunucu bilgisayarda, sahaya özel çalışır; internet çıkışı
garanti değildir (air-gapped/kısıtlı egress senaryoları).

- **TOTP hiçbir dış servise bağımlı değildir** — kod kullanıcının cihazında
  üretilir, sunucu aynı kodu bağımsız hesaplar. SMTP relay, SMS sağlayıcı,
  bulut erişimi GEREKMEZ.
- E-posta/SMS OTP ise sahada **outbound mail/SMS kanalı** ister — kurulum
  maliyeti, arıza yüzeyi ve NIST uyumsuzluğu birlikte reddedilme sebebidir.
- Operatörün telefonuna authenticator app kurması (örn. Ente Auth, 2FAS,
  Microsoft Authenticator) kurulumda tek seferlik adımdır; kurtarma kodları
  cihaz kaybını karşılar.

## 3. E-posta ve SMS'in meşru rolleri (kimlik doğrulama DEĞİL)

| Rol | Durum | Not |
|:----|:------|:----|
| **Kurtarma kodu teslimi** (e-posta) | Aday | NIST: kurtarma kodları kimlik doğrulama süreci değildir — yasak kapsamı DIŞINDA |
| **MFA reset bildirimi** (e-posta) | Aday | `mfa_reset` security logu zaten imzalı yazılır |
| **Alert bildirimi** (e-posta) | **Kurulu** | `SmtpNotifier` (T6.7) — `LOG_SMTP_*` config'i |
| SMS bildirimi | Kurulu (opsiyonel) | `HttpSmsNotifier` (T6.7) — alert kanalı, auth değil |

## 4. Gelecek notları

- **FIDO2/passkey:** phishing-resistant sınıf (NIST AAL3 yönü) — konteyner/field
  kurulum olgunlaşınca admin hesapları için aday.
- **Konteyner kaydı public-key pairing (şerh):** bugün konteyner service token'ı
  manuel üretilip admin yetkisiyle register edilir (düz metin yalnızca
  konteyner `.env.container`'ında; field DB'de yalnızca SHA-256). İleride bu
  manuel adım, konteyner tarafında üretilen bir anahtar çiftinin public
  kısmının field'a iletilmesiyle (pairing protokolü) otomatikleştirilebilir —
  ancak ilk güven (TOFU) sorunu ayrı bir tasarım gerektirir; şimdilik manuel
  kayıt mevcut güvenlik standardını karşılamaktadır.
- **NTP:** TOTP zaman tabanlıdır — saha saat sapması doğrulama penceresini
  etkiler; [ntp-konfigurasyonu.md](./ntp-konfigurasyonu.md) kurulum kontrol
  listesinde zorunludur.
