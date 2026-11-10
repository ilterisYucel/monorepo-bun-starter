# Mini-SIEM Planı (Faz 6 T6.8)

**Durum:** Plan dokümanı — uygulama Faz sonrası. Amaç: `log_events` (imzalı, TimescaleDB hypertable) üzerinde kural motoru + alert + dashboard'dan oluşan hafif SIEM. T6.2 sink'leri (syslog/webhook) harici SIEM'e çıkışı zaten sağlar; bu plan **iç** izleme katmanını tanımlar.

## 1. Kapsam ve sınırlar

- **Kapsam dışı:** log üretim yolu değişmez — yazma yolu in-process `TamperLogger` kalır (mimari Faz 0 ek kararı). Mini-SIEM yalnızca **okuyucu**dur.
- **Ölçek:** stack başına ≤4 servis, saniyede <1 güvenlik olayı; kural motoru basit kalır (Kafka/ES gerekmez).
- **Yer:** `services/log-service` (yeni; tier: field/boss). Konteyner tier'da çalışmaz.

## 2. Bileşenler

| Bileşen | Sorumluluk | Not |
|---|---|---|
| `LogEventReader` | `log_events` hypertable'ından artımlı okuma (cursor = son `seq`) | 10 sn poll; `verify-log` bütünlük kontrolüyle aynı zincir doğrulamasını okuma anında tekrarlar |
| `RuleEngine` | Bildirimsel kurallar: `eventCode` + context koşulları → `ALERT` üretir | Kural dosyası YAML/JSON (`log-service/config/rules.json`); kural örnekleri: 15 dk'da N `login_failed`, `tamper_detected` her olayda, `session_anomaly` saha bazlı eşik |
| `AlertDispatcher` | Üretilen ALERT'leri T6.7 adapterlerine iletir (mail/SMS/webhook) + kendi cooldown'u | Mevcut `AlertNotifier`/sink'ler yeniden kullanılır |
| `Dashboard API` | `/api/log-service/alerts`, `/api/log-service/rules` | boss-tier yönetici ekranına besler |
| `Health` | Kural motoru gecikmesi, okuma cursor'u geride kalma süresi | field `/health`'e yansır |

## 3. Kural örneği (rules.json)

```json
{
  "rules": [
    {
      "id": "brute-force-field",
      "eventCode": "login_failed",
      "windowSeconds": 900,
      "threshold": 5,
      "groupBy": ["context.username"],
      "severity": "high"
    },
    {
      "id": "tamper-always",
      "eventCode": "tamper_detected",
      "threshold": 1,
      "severity": "critical"
    },
    {
      "id": "session-anomaly-spike",
      "eventCode": "session_anomaly",
      "windowSeconds": 3600,
      "threshold": 3,
      "severity": "high"
    }
  ]
}
```

## 4. Doğrulama

- Birim: `LogEventReader` cursor/artımlı okuma, `RuleEngine` pencere/eşik/groupBy (fake timers), kuralların şema doğrulaması.
- Bileşen: gerçek `log_events` tablosuyla (test fixture) uçtan uca: üretilen log satırları → kural tetikleme → dispatcher çağrısı.
- Gözle: `bun tools/log-service-demo.mjs` — sentetik olaylarla kural demosu.

## 5. Fazlandırma

1. **LS-1:** `LogEventReader` + `RuleEngine` (3 kural) + birim testler
2. **LS-2:** `AlertDispatcher` (T6.7 adapterleri) + bileşen testi
3. **LS-3:** Dashboard API + boss-tier UI (Faz 6.1)
4. **LS-4:** Harici SIEM'e webhook kuralı (T6.2 sink'i log-service içinde de kullanılabilir)

## 6. Neden şimdi değil?

T6.7'nin AlertNotifier kanalı kritik olayları zaten anlık bildirir; kural motorunun değeri **desen** tespiti (çoklu olay korelasyonu). Canlı saha sayısı arttığında LS-1 ile başlanır. NIS-2 denetiminde "izleme yeteneği" kanıtı için T6.2 + verify-log + session_audit yeterlidir; mini-SIEM bu kanıtı güçlendiren sonraki adımdır.
