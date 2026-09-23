# Proje Bağlamı (Proje Talimatları — MEMORY.md)

## Araç ve İş Akışı
- Bu proje **run-dex** CLI orkestratörünü kullanır (npm paketi: `run-dex`)
- Üç rol: Orchestrator (planlayıcı), Executor (yürütücü), Reviewer (denetleyici)
- Her rolün kendi `{backend, model}` yapılandırması vardır, `dex init` sırasında ayarlanır
- Yerleşik `MEMORY.md` mekanizması vardır, varsayılan olarak etkindir; proje kalıcı kurallarını saklamak için kullanılır
- `/compact` komutu geçmiş bilgileri MEMORY.md'ye sıkıştırabilir

## Geliştirme İş Akışı (6 Aşamalı Zorunlu)

### Aşama 1: SPEC (Şartname)
- **dex Rolü**: Orchestrator
- **Önerilen Model**: DeepSeek Pro
- **Çıktı**: `docs/architecture/<MODUL>-MIMARISI.md`
- **Kapı**: SPEC tamamlandıktan sonra geliştiricinin onayı beklenir; onay olmadan test yazılmaz

### Aşama 2: JSDoc (Davranış Sözleşmesi)
- **dex Rolü**: Orchestrator (Aşama 1 ile aynı çağrıda)
- **Önerilen Model**: DeepSeek Pro
- **Çıktı**: interface/tip + davranış sözleşmesi (state'ler, edge-case'ler, hata kategorileri, yan etkiler, limitler)
- **Kapı**: JSDoc önce tamamlanır; sonra test yazılır

### Aşama 3: TEST (Önce KIRMIZI)
- **dex Rolü**: Executor
- **Önerilen Model**: DeepSeek Pro (ilk çağrı)
- **Çıktı**: `*.test.ts` — kırmızı olmalı, implementasyon henüz mevcut değil
- **Önemli**: Executor tek bir modeldir; "aynı çağrıda önce Pro test yazsın sonra Flash implementasyon yapsın" desteklenmez
- **Operasyon**: İlk `dex run`'da Executor olarak Pro ayarlanır ve sadece testler yazılır

### Aşama 4: IMPL (Sonra YEŞİL)
- **dex Rolü**: Executor
- **Önerilen Model**: DeepSeek Flash (ikinci çağrı)
- **Çıktı**: Testi geçen minimal implementasyon + refactor
- **Operasyon**: İkinci `dex run`'da Executor olarak Flash ayarlanır ve testleri geçmesi söylenir

### Aşama 5: DOĞRULAMA (Doğrulama)
- **dex Rolü**: Reviewer
- **Önerilen Model**: DeepSeek Pro (Executor'dan bağımsız olmalı)
- **Çıktı**: `docs/architecture/<MODUL>-DOGRULAMA.md`
- **İçerik**: Satır referanslı değişiklik matrisi, test kanıtları, kabul kriteri kanıtları, sapmalar

### Aşama 6: KAPSAM (Test Kapsamı)
- **dex Rolü**: Reviewer (Aşama 5 ile aynı çağrıda)
- **Önerilen Model**: DeepSeek Pro
- **Çıktı**: `docs/architecture/<MODUL>-TEST-KAPSAMI.md`
- **İçerik**: Durum → koşul → beklenen → test ref matrisi + KAPSANMAYAN boşluklar
  
## Kapılar (Gözlemlenebilir)

- SPEC yoksa test yazılmaz
- Test yoksa implementasyon başlamaz
- DOGRULAMA + TEST-KAPSAMI güncel değilse modül kapanmaz (PR merge edilmez)
- SPEC onay kapısı: SPEC yazıldıktan sonra developer onayı beklenir; SPEC'i yazan ajan açıkça uyarır (doküman yolu + "onay bekliyor" durumu)
- Testsiz PR merge edilmez
- Geriye dönük zorunluluk YOK — kural yeni modüller ve dokunulan modüller için geçerlidir

## Model Atama (Önerilen)

| Rol | Model | Gerekçe |
|:---|:---|:---|
| Orchestrator | DeepSeek Pro | SPEC/JSDoc planlama, derin akıl yürütme gerektirir |
| Executor (Test) | DeepSeek Pro | Testler sözleşmeyi sabitler, doğruluk önemlidir |
| Executor (Impl) | DeepSeek Flash | Plan ve testler hazır; sadece testleri geçmesi gerekir |
| Reviewer | DeepSeek Pro | Executor'dan bağımsız olmalı; kendi kodunu onaylamamalı |

**Kritik**: Reviewer, Executor ile aynı model olamaz.

## Test Kapsamı

- Yeni kodda ≥%70 satır (SonarCloud kapısı)
- Güvenlik-kritik modüllerde ≥%90 branch: rbac, token-adapter, ws/auth doğrulama, session-gateway, tunnel frame codec, field-connector, komut validasyonu
- Legacy karakterizasyon testleri: Değiştirilecek testsiz modüllerde önce mevcut davranış testle sabitlenir (bug/delik dahil), sonra değişiklik yapılır
- Test dokümantasyonu (hibrit): TEST-KAPSAMI yaşayan çalışma dokümanıdır; yeni testler `docs/roadmap/test-envanteri.md`'ye işlenir

## run-dex Kullanım Kuralları

- SPEC + JSDoc aşamaları: Orchestrator = DeepSeek Pro
- TEST aşaması: Executor = DeepSeek Pro, "sadece test yaz, implementasyon yapma" belirtilir
- IMPL aşaması: Executor = DeepSeek Flash, "testleri geç" belirtilir
- DOĞRULAMA + KAPSAM: Reviewer = DeepSeek Pro
- Her `dex run` sonrası çıktı ilgili dokümana yazılır
- `/compact` kullanarak oturum geçmişini MEMORY.md'ye sıkıştırın (isteğe bağlı)