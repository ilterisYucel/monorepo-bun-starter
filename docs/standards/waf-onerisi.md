# WAF Önerisi — Çift Arayüz Modu (Faz 6 T6.6 eki)

**Kapsam:** Mimari §3.4 — VPN'siz (domain + internet) modda zorunlu ek önlemler listesinde WAF yer alır. Bu doküman uygulama önerisi sunar; **kurulum opsiyoneldir** (VPN modunda WAF zorunlu değildir). Backend'de zaten uygulanan kontroller: giriş kilidi + throttling (T6.6, Redis), MFA (T6.1), path allowlist (tünel), JWT + RBAC, fail-closed audit.

## Karar: Coraza (ModSecurity uyumlu)

| Aday | Avantaj | Dezavantaj |
|---|---|---|
| **Coraza** (Go, OWASP CRS uyumlu) | Tek binary, düşük bellek; nginx'e `coraza-proxy-wasm`/Caddy modülüyle girer; OWASP Core Rule Set v4 | ModSecurity'e göre daha genç ekosistem |
| ModSecurity (libmodsecurity3) | En yaygın; nginx `modsecurity-nginx` modülü | Nginx modülü derlemesi imajı büyütür; kural bakımı yüksek |

**Öneri:** nginx'e ek katman yerine **field nginx önüne Coraza wasm modülü** veya hazır `caddy` + coraza görüntüsü. Alternatif: Uygulama içi kalan kontroller (T6.6) + bulut sağlayıcı WAF (varsa) yeterli görülürse WAF katmanı Faz sonrası değerlendirmeye bırakılır.

## Uygulanacaksa: nginx limit_req (ilk adım — WAF'sız)

Çift arayüz moduna geçmeden önce **en az** şunlar eklenir (`apps/field/deployment/Dockerfile` nginx config'i):

```nginx
# Genel API hız sınırı (uygulama içi login kilidini tamamlar)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn:10m;

location /api/ {
  limit_req zone=api burst=20 nodelay;
  limit_conn conn 10;
  proxy_pass http://web-service:5002;
  # ... mevcut proxy ayarları
}
```

## OWASP CRS katmanı (tam WAF)

1. `coraza-proxy-wasm` + OWASP CRS v4 kuralları içeren bir yan kapsayıcı/edge eklenir.
2. Sürüm güncelleme prosedürü: CRS kuralları haftalık imaj yenilemesine bağlanır (T6.4 pinleme politikasıyla aynı döngü).
3. Test: E2E akışlarının CRS açıkken geçtiği + bilinen saldırı vektörlerinin (SQLi/XSS pattern'leri) engellendiği Playwright/curl senaryoları.

## Kapatma kararı

**Bu fazda WAF kurulmadı — dokümantasyon yeterli görüldü (kullanıcı onaylı).** Çift arayüz modu planlandığında bu doküman uygulama planına çevrilir; kabul kriterleri: (1) CRS açıkken tüm E2E yeşil, (2) loglarda engellenen istekler `request_rejected` olarak imzalı, (3) performans ölçümü (p95 gecikme +%10 altında).
