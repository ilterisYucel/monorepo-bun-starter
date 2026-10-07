# Test Envanteri (otomatik)

> Üretim: `bun run test:inventory` — 2026-10-07
> Tarandı: 251 test dosyası, 2118 test bloğu.

<!-- OTOMATIK — bun run test:inventory ile üretilir; elle DÜZENLENMEZ -->

### `apps/container-web/src/contexts/RealtimeContext.test.tsx` (4 test)

1. (RealtimeProvider token refresh (T2)) **"credentials hatası → refresh başarılı → token güncellenir + reconnect"**
2. (RealtimeProvider token refresh (T2)) **"refresh token yoksa refresh ÇAĞRILMAZ"**
3. (RealtimeProvider token refresh (T2)) **"refresh başarısız → reconnect çağrılmaz, token değişmez"**
4. (RealtimeProvider token refresh (T2)) **"credentials içermeyen hata refresh'i TETİKLEMEZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/auth/session-auth.test.ts` (7 test)

1. (hydrateSessionAuth (T4.4)) **"tünel değilse false — fetch yapılmaz"**
2. (hydrateSessionAuth (T4.4)) **"tünel + geçerli oturum → kullanıcı hydrate edilir"**
3. (hydrateSessionAuth (T4.4)) **"401 → false, hydrate yok"**
4. (hydrateSessionAuth (T4.4)) **"tunnel:false → false (alan tarafı oturum değil)"**
5. (hydrateSessionAuth (T4.4)) **"fetch hatası → false (çökme yok)"**
6. (hydrateSessionAuth (T4.4) > tünel modunda persist izolasyonu (T4.4 — kırılganlık #1)) **"tünel modunda oluşturulan AuthStore auth-storage YAZMAZ"**
7. (hydrateSessionAuth (T4.4) > tünel modunda persist izolasyonu (T4.4 — kırılganlık #1)) **"normal modda persist çalışır (geriye uyumluluk)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/control/components/ManeuverPanel.test.tsx` (2 test)

1. (ManeuverPanel (Faz D2)) **"kataloğu sunucudan yükler; gizli kayıtları GÖSTERMEZ"**
2. (ManeuverPanel (Faz D2)) **"katalog hatası → hata durumu (çökme yok)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/control/services/maneuverApi.test.ts` (4 test)

1. (maneuverApi (Faz D2)) **"list: GET /maneuvers + kayıt listesi döner"**
2. (maneuverApi (Faz D2)) **"list: boş katalog → [] (kademeli)"**
3. (maneuverApi (Faz D2)) **"execute: POST gövdesi {params:{}} varsayılan"**
4. (maneuverApi (Faz D2)) **"execute: params + deviceIds (grup kısıtı) taşınır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/hvac/utils/hvacHelpers.test.ts` (3 test)

1. (hvacSkeleton) **"her HVAC cihazı için standby ünite üretir (telemetrisiz)"**
2. (hvacSkeleton) **"oda bilgisi roomByDevice'dan gelir"**
3. (hvacSkeleton) **"id çıkarılamayan cihaz atlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/racks/utils/rackHelpers.test.ts` (3 test)

1. (rackHelpers — details accessor) **"rackCountOf details.rackCount okur"**
2. (rackHelpers — details accessor) **"rackCountOf details yoksa DEFAULT_RACK_COUNT döner"**
3. (rackHelpers — details accessor) **"detailsNumber string sayıyı çözer, geçersizse undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/features/telemetry/utils/dedupeLatest.test.ts` (3 test)

1. (dedupeLatest — en yeni kazanır) **"aynı (deviceId,name,rack_id) için yalnız en yeni satırı tutar"**
2. (dedupeLatest — en yeni kazanır) **"rack_id farklıysa ayrı anahtar (farklı rack'ler korunur)"**
3. (dedupeLatest — en yeni kazanır) **"telemetryKey rack_id içerir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/hooks/useFieldConnection.test.tsx` (4 test)

1. (useFieldConnection (T2.2)) **"bağlı durumu yansıtır"**
2. (useFieldConnection (T2.2)) **"bağlantı yoksa kapalı bildirir"**
3. (useFieldConnection (T2.2)) **"istek hatasında kapalı kabul edilir"**
4. (useFieldConnection (T2.2)) **"5 sn tazeleme aralığı kullanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/lib/api-base.test.ts` (21 test)

1. (apiBaseUrl (T4.3)) **"kök dizinde /api döner"**
2. (apiBaseUrl (T4.3)) **"tünel subpath'inde /containers/:cid/ui/api döner"**
3. (apiBaseUrl (T4.3)) **"trailing slash normalize edilir"**
4. (apiBaseUrl (T4.3)) **"Faz 5.1 regresyon: normal SPA route'larinda sert yenileme /api dondurur"**
5. (apiBaseUrl (T4.3)) **"tünel icindeki alt route'lar prefix'i korur"**
6. (apiBaseUrl (T4.3) > wsUrl (T4.3)) **"http → ws, https → wss"**
7. (apiBaseUrl (T4.3) > wsUrl (T4.3)) **"tünel subpath'inde cookie kapsamıyla eşleşir"**
8. (apiBaseUrl (T4.3) > wsUrl (T4.3)) **"Faz 5.1 regresyon: normal route'ta sert yenileme kök WS adresini korur"**
9. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3)) **"kök için boş dize"**
10. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi)) **"yalnız /containers/:cid/ui öneki tüneldir"**
11. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi)) **"Faz 5.1 regresyon: normal SPA route'lari tünel DEGILDIR"**
12. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3)) **"container_session varsa true"**
13. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3)) **"yoksa false"**
14. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3)) **"host yoksa ws://localhost:5001 fallback"**
15. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3)) **"host yoksa api /api (eski davranış)"**
16. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3)) **"file:// tünel sayılmaz"**
17. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3) > hashRoute (Faz 5.1 — hash router uyumu)) **"yol hash formuna çevrilir"**
18. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3) > hashRoute (Faz 5.1 — hash router uyumu)) **"başına / eklenir"**
19. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3) > hashRoute (Faz 5.1 — hash router uyumu)) **"zaten hash'liyse olduğu gibi"**
20. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3) > hashRoute (Faz 5.1 — hash router uyumu) > postLoginRoute (Faz 5.1 — giriş sonrası rota)) **"must-change kullanıcı → /change-password"**
21. (apiBaseUrl (T4.3) > wsUrl (T4.3) > appDirPath (T4.3) > isTunnelMode (T4.3 + Faz 5.1 düzeltmesi) > hasContainerSessionCookie (T4.3) > file:// (Electron LCD — K4.3) > hashRoute (Faz 5.1 — hash router uyumu) > postLoginRoute (Faz 5.1 — giriş sonrası rota)) **"normal kullanıcı → /dashboard"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/lib/api-client.interceptor.test.ts` (7 test)

1. (api-client 401-refresh interceptor (T2)) **"401 → refresh → yeni token'la retry 200 döner"**
2. (api-client 401-refresh interceptor (T2)) **"eşzamanlı 401'ler TEK refresh üretir (kuyruk)"**
3. (api-client 401-refresh interceptor (T2)) **"_retry'li ikinci 401 reddedilir (döngü koruması)"**
4. (api-client 401-refresh interceptor (T2)) **"/auth/login 401'ine karışılmaz (refresh ÇAĞRILMAZ)"**
5. (api-client 401-refresh interceptor (T2)) **"tünel modunda 401-refresh KAPALI (401 aynen reddedilir)"**
6. (api-client 401-refresh interceptor (T2)) **"must-change 403'ü /change-password'a yönlendirir"**
7. (api-client 401-refresh interceptor (T2)) **"refresh başarısız + guest fallback başarısız → /login'e yönlendirilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/lib/api-client.test.ts` (11 test)

1. (isMustChangeError (Faz 5.1 ek)) **"403 + dogru hata mesajini tanir"**
2. (isMustChangeError (Faz 5.1 ek)) **"403 ama farkli hata → false"**
3. (isMustChangeError (Faz 5.1 ek)) **"401 → false; response'suz hata → false"**
4. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek)) **"dashboard gibi sayfalarda must-change 403 → yonlendirme gerekli"**
5. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek)) **"/change-password ve /login sayfalarinda dongu yapmaz"**
6. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek)) **"tunel modunda yonlendirme yapilmaz"**
7. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek)) **"must-change olmayan hatalarda yonlendirme yapilmaz"**
8. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek) > navigateToAppRoute (Faz 5.1 ek — hash router)) **"yönlendirme pathname'e değil HASH'e yazılır"**
9. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek) > navigateToAppRoute (Faz 5.1 ek — hash router) > writeUserToAuthStorage (Faz 5.1 ek)) **"auth-storage state'ine kullaniciyi ve rol bayraklarini yazar"**
10. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek) > navigateToAppRoute (Faz 5.1 ek — hash router) > writeUserToAuthStorage (Faz 5.1 ek)) **"auth-storage yoksa no-op (sessiz)"**
11. (isMustChangeError (Faz 5.1 ek) > mustChangeRedirectNeeded (Faz 5.1 ek) > navigateToAppRoute (Faz 5.1 ek — hash router) > writeUserToAuthStorage (Faz 5.1 ek)) **"bozuk auth-storage temizlenir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/container-web/src/stores/LogStore.test.ts` (6 test)

1. (LogStore (T2)) **"can be imported without localStorage errors (karakterizasyon)"**
2. (LogStore (T2)) **"addLog yeni girişi başa ekler ve backend'e gönderir"**
3. (LogStore (T2)) **"MAX 200 sınırı: en eski giriş atılır"**
4. (LogStore (T2)) **"backend başarılı dönüşünde sunucu kaydı local girişle DEĞİŞTİRİLİR"**
5. (LogStore (T2)) **"localStorage yazımı debounced: 2 sn içinde ardışık addLog TEK yazım üretir"**
6. (LogStore (T2)) **"addLog backend hatasını yutar — local giriş korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-backend/src/demo-backend.test.ts` (1 test)

1. (demo-backend) **"exports application modules"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/integration/demo-maneuver.integration.test.ts` (8 test)

1. (demo manevra kataloğu (AK-10.1/10.2)) **"6 demo operasyonu yüklü; mevcut katalog korunuyor"**
2. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1)) **"girilen güç BSC şarj setpointine yansır (powerKw/2 BSC)"**
3. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"charge → PCS gücü negatif + SOC artar; standby durdurur"**
4. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"discharge → PCS gücü pozitif + SOC düşer"**
5. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"full_charge / full_discharge operasyonları tamamlanır"**
6. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"calibration çok adımlı operasyon tamamlanır"**
7. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4) > zamanlı durdurma (Q3)) **"charge + timer 5 sn → BSC stop komutu + güç 0 + SOC durur"**
8. (demo manevra kataloğu (AK-10.1/10.2) > powerKw tüm katmanlara yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4) > zamanlı durdurma (Q3) > MV interlock (AK-10.5)) **"kesici kapalıyken toprak kapatma reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/features/demo-data/buildTrendSeries.test.ts` (4 test)

1. (buildTrendSeries (FR-6.1 / AK-6.1)) **"SOC'yi zaman kovasında ortalar"**
2. (buildTrendSeries (FR-6.1 / AK-6.1)) **"gücü toplar (kW→MW)"**
3. (buildTrendSeries (FR-6.1 / AK-6.1)) **"sıcaklıkta maks değeri alır"**
4. (buildTrendSeries (FR-6.1 / AK-6.1)) **"boş veride boş seriler döner (AK-6.3)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/features/demo-data/demo-topology.test.ts` (2 test)

1. (demo-topology (UC-2/T-6)) **"6 ünite tanımlar (fider A 1-3, B 4-6)"**
2. (demo-topology (UC-2/T-6)) **"hücre aksiyonunu demo-MV komut adına eşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/features/demo-data/deriveKpis.test.ts` (3 test)

1. (deriveKpis (FR-4.1 / AK-4.1)) **"ortalama SOC/SOH ve mod türetir"**
2. (deriveKpis (FR-4.1 / AK-4.1) > deriveAlerts (FR-4.2 / AK-4.2)) **"severite sırasına göre sıralar ve alarmı öne alır"**
3. (deriveKpis (FR-4.1 / AK-4.1) > deriveAlerts (FR-4.2 / AK-4.2)) **"uyarı yoksa boş döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/features/demo-data/mapFieldToMimicState.test.ts` (10 test)

1. (fanOutUnits (FR-2.1)) **"verilen sayıda ünite üretir ve deterministiktir"**
2. (fanOutUnits (FR-2.1)) **"PCS gücünü ünite sayısına böler"**
3. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"tek konteyneri 6 üniteye fan-out eder"**
4. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"banka A→BSC-1, banka B→BSC-2 eşler (birebir — sunumsal offset yok)"**
5. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"PCS durum kodlarını eşler (2→chg, 3→dis)"**
6. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"saha toplam gücünü korur (POI işaretli)"**
7. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"hücre ΔV türetir (3.400−3.350 V → 50 mV)"**
8. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"demo-MV telemetrisinden station pozisyonu okur"**
9. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"MV telemetrisi yokken varsayılan kapalı + nominal kV"**
10. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"boş konteynerde boş ünite listesi döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/lib/site-field.test.ts` (2 test)

1. (postLoginDestination) **"fieldId varsa saha rotasına yönlendirir"**
2. (postLoginDestination) **"fieldId boşsa açık hata döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/demo-field/src/pages/DemoFieldPage.test.tsx` (2 test)

1. (DemoFieldPage — boş/hata durumları (FR-1.3 / AK-1.3)) **"hata yanıtında hata mesajı gösterir"**
2. (DemoFieldPage — boş/hata durumları (FR-1.3 / AK-1.3)) **"boş listede saha yerleşimini boş üniteyle render eder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/editor/src/features/editor/device-catalog/catalog.test.ts` (4 test)

1. (device-catalog) **"5 built-in cihaz tipi sunar"**
2. (device-catalog) **"her DeviceType icin tanim var ve type alani kendi anahtariyla eslesiyor"**
3. (device-catalog) **"tum tanimlar en az bir protokol ve bir ikon bildirir"**
4. (device-catalog) **"getDeviceDefinition bilinen tip icin tanim dondurur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/app/App.test.tsx` (3 test)

1. (TunnelBootstrap (AUTH-REFRESH — UC-2)) **"standalone: hydrate ÇAĞRILMAZ — auto-guest YOK (AK-2.3)"**
2. (TunnelBootstrap (AUTH-REFRESH — UC-2)) **"tünel modu: hydrateSessionAuth ÇAĞRILIR (AK-2.3)"**
3. (TunnelBootstrap (AUTH-REFRESH — UC-2)) **"yalnızca BİR kez koşar (tekrar render'da hydrate tekrar çağrılmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/auth/stores/AuthStore.test.ts` (6 test)

1. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"login başarılı → oturum + rol bayrakları"**
2. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"login mfaRequired → pendingMfaToken, oturum yok"**
3. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"logout backend'i çağırır ve temizler — auto-guest YOKTUR (AK-2.1)"**
4. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"logout sunucu hatasında bile yerel state'i temizler"**
5. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"clearSession persist dahil tam temizler; backend çağrısı YAPMAZ (AK-2.2)"**
6. (AuthStore (AUTH-REFRESH — 2026-09-23)) **"developer rolü isDeveloper bayrağını set eder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/components/PcsCard.test.tsx` (12 test)

1. (PcsCard) **"pcsId ve konteyner adını gösterir"**
2. (PcsCard) **"bağlı PCS'te online rozeti görünür"**
3. (PcsCard) **"kopuk PCS'te offline rozeti görünür"**
4. (PcsCard) **"negatif aktif güç → şarj rozeti"**
5. (PcsCard) **"pozitif aktif güç → deşarj rozeti"**
6. (PcsCard) **"sıfır aktif güç → bekleme rozeti"**
7. (PcsCard) **"ana metrik işaretli aktif gücü gösterir"**
8. (PcsCard) **"Detay butonu onDetailClick'i çağırır"**
9. (PcsCard) **"Config butonu onConfigClick'i çağırır"**
10. (PcsCard) **"callback verilmezse butonlar render edilmez"**
11. (PcsCard > PcsCard — genişletilmiş detaylar (2026-09-02)) **"AC/Kullanılabilir/Enerji bölümleri değerleri gösterir"**
12. (PcsCard > PcsCard — genişletilmiş detaylar (2026-09-02)) **"eksik genişletilmiş telemetri → 0.0/0 değerleri"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/components/RegisterContainerForm.test.tsx` (5 test)

1. (RegisterContainerForm) **"adres alanı render edilmez (mimari sözleşme)"**
2. (RegisterContainerForm) **"boş containerId → hata, register çağrılmaz"**
3. (RegisterContainerForm) **"32 karakterden kısa token → hata, register çağrılmaz"**
4. (RegisterContainerForm) **"geçerli girdi → register + success + onRegistered + alanlar temizlenir"**
5. (RegisterContainerForm) **"API hatası → hata mesajı, onRegistered çağrılmaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/hooks/containerGaugeBlocks.test.ts` (11 test)

1. (buildDeviceGaugeBlocks — BSC (V2 formatı)) **"cihaz başına success temalı 4 gauge üretir (canonical eşleme)"**
2. (buildDeviceGaugeBlocks — BSC (V2 formatı)) **"eksik canonical kayıt → 0; rack seviyesi satırlar sayılmaz"**
3. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı)) **"ünite başına temp temalı 4 gauge üretir"**
4. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı)) **"eksik telemetri → 0 (4 gauge yine üretilir)"**
5. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı)) **"CB tekleşik warning bloğu: CB1/CB2 Kapalı+Açık (K2 şalter)"**
6. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı)) **"DC tekleşik info bloğu: DC1/DC2 Voltaj+Akım"**
7. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı)) **"CB/DC telemetrisi yoksa blok üretilmez"**
8. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı) > buildDeviceGaugeBlocks — PM5340 + EP203 (V2 formatı)) **"PM5340 info bloğu: Voltaj/Akım/Güç/Enerji"**
9. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı) > buildDeviceGaugeBlocks — PM5340 + EP203 (V2 formatı)) **"EP203 her zaman render edilir; telemetri yoksa 0 (dummy)"**
10. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı) > buildDeviceGaugeBlocks — PM5340 + EP203 (V2 formatı)) **"EP203 telemetrisi varsa gerçek değerler gelir"**
11. (buildDeviceGaugeBlocks — BSC (V2 formatı) > buildDeviceGaugeBlocks — HVAC (V2 formatı) > buildDeviceGaugeBlocks — CB + DC (V2 formatı) > buildDeviceGaugeBlocks — PM5340 + EP203 (V2 formatı)) **"PCS cihazları blok üretmez (PcsCard'ın alanı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/hooks/pcsDerivation.test.ts` (14 test)

1. (derivePcsSummary) **"tek PCS cihazı için özet döner (bağlantı + filtrelenmiş telemetri)"**
2. (derivePcsSummary) **"PCS cihazı yoksa undefined döner"**
3. (derivePcsSummary) **"birden fazla PCS varsa sıralı ilki kazanır (1 konteyner = 1 PCS)"**
4. (derivePcsSummary) **"bağlantı durumu parametreden taşınır"**
5. (derivePcsSummary > pcsState) **"bağlantı yok → offline"**
6. (derivePcsSummary > pcsState) **"negatif aktif güç → charging"**
7. (derivePcsSummary > pcsState) **"pozitif aktif güç → discharging"**
8. (derivePcsSummary > pcsState) **"sıfır aktif güç → idle"**
9. (derivePcsSummary > pcsState > pcsTelemetryValue) **"mevcut sayısal satırı döner"**
10. (derivePcsSummary > pcsState > pcsTelemetryValue) **"eksik satır → 0"**
11. (derivePcsSummary > pcsState > pcsTelemetryValue) **"sayısal olmayan değer → 0"**
12. (derivePcsSummary > pcsState > pcsTelemetryValue) **"boş telemetri → 0"**
13. (derivePcsSummary > pcsState > pcsTelemetryValue > pcsConfigInfo) **"envanter unique + sıralı üretir; bağlantı meta bilgilerini taşır"**
14. (derivePcsSummary > pcsState > pcsTelemetryValue > pcsConfigInfo) **"opsiyonel alanlar undefined kalabilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/hooks/useContainerData.test.ts` (6 test)

1. (statusForContainer (T5.1)) **"connected → online; stale/error → warning; idle → offline"**
2. (statusForContainer (T5.1) > summarizeContainer (T5.1)) **"kanonik metriklerden SOC/güç toplar"**
3. (statusForContainer (T5.1) > summarizeContainer (T5.1)) **"canonical yoksa name fallback çalışır (system rack'iyle)"**
4. (statusForContainer (T5.1) > summarizeContainer (T5.1)) **"stale → warning + connected false"**
5. (statusForContainer (T5.1) > summarizeContainer (T5.1)) **"boş telemetri → sıfırlar"**
6. (statusForContainer (T5.1) > summarizeContainer (T5.1)) **"tip bazlı aktif sayım: CB kapalı, DC açık"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/hooks/useContainerTelemetry.test.tsx` (2 test)

1. (useContainerTelemetry (T2)) **"list'ten konteyner snapshot'ını bulur; series 120 nokta ister"**
2. (useContainerTelemetry (T2)) **"konteyner listede yoksa container undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/containers/services/containersApi.test.ts` (7 test)

1. (containersApi.executeCommands (WS4 D5)) **"komut proxy rotasını doğru gövdeyle çağırır"**
2. (containersApi.executeCommands (WS4 D5)) **"varsayılan mod parallel + onFailure stop"**
3. (containersApi.executeCommands (WS4 D5) > containersApi.listDevices (2026-09-02)) **"tünel yolundan cihaz listesini döndürür"**
4. (containersApi.executeCommands (WS4 D5) > containersApi.listDevices (2026-09-02)) **"hata durumunda throw eder (fallback tetiklenir)"**
5. (containersApi.executeCommands (WS4 D5) > containersApi.listDevices (2026-09-02) > containersApi.deviceConfig (2026-09-02)) **"telemetry-config yanıtını döndürür"**
6. (containersApi.executeCommands (WS4 D5) > containersApi.listDevices (2026-09-02) > containersApi.deviceConfig (2026-09-02)) **"404 → null (config yok)"**
7. (containersApi.executeCommands (WS4 D5) > containersApi.listDevices (2026-09-02) > containersApi.deviceConfig (2026-09-02)) **"404 dışı hata → throw"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/dashboard/deriveDashboard.test.ts` (11 test)

1. (derivePcsRows (B4)) **"benzersiz PCS-* cihazları, snapshot'ta varsa bağlı"**
2. (derivePcsRows (B4)) **"PCS yoksa boş liste"**
3. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02)) **"canonical soc/soh + rack_id system satırlarının ortalamasını alır"**
4. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02)) **"rack_id system olmayan (rack seviyesi) satırlar dahil edilmez"**
5. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02)) **"canonical etiketi olmayan name eşleşmeleri sayılmaz"**
6. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02)) **"sayısal olmayan değerler atlanır; boş giriş → null"**
7. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02)) **"çok konteynerli saha ortalaması (konteyner sınırı yok)"**
8. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02) > derivePowerLimits (2026-09-02)) **"canonical charge_power/discharge_power (system) toplamını üretir"**
9. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02) > derivePowerLimits (2026-09-02)) **"eksik kayıt → 0"**
10. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02) > derivePowerLimits (2026-09-02)) **"çok konteynerli saha toplamı"**
11. (derivePcsRows (B4) > deriveSocSohAverages (2026-09-02) > derivePowerLimits (2026-09-02)) **"sayısal olmayan değerler atlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/field-control/components/FieldManeuverPanel.test.tsx` (5 test)

1. (FieldManeuverPanel (Faz D2 — sunucu kataloğu)) **"kartlar sunucudan gelir; gizli manevralar YOKTUR; operasyon kartları görünür"**
2. (FieldManeuverPanel (Faz D2 — sunucu kataloğu)) **"Çalıştır → executeManeuver (params + grup deviceIds kısıtı)"**
3. (FieldManeuverPanel (Faz D2 — sunucu kataloğu)) **"operasyon kartı → executeOperation"**
4. (FieldManeuverPanel (Faz D2 — sunucu kataloğu)) **"kısmi başarısızlık (rolled_back) başarı sayılır — failed değil"**
5. (FieldManeuverPanel (Faz D2 — sunucu kataloğu)) **"API hatası → failed durumu (throw yutulur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/field-control/services/fieldManeuverApi.defs.test.ts` (4 test)

1. (fieldManeuverApi — tanım yönetimi (C4)) **"createOperation: POST /operations + tanım gövdesi"**
2. (fieldManeuverApi — tanım yönetimi (C4)) **"updateOperation: PUT /operations/:name"**
3. (fieldManeuverApi — tanım yönetimi (C4)) **"deleteOperation: DELETE /operations/:name (yumuşak silme)"**
4. (fieldManeuverApi — tanım yönetimi (C4)) **"listRuns: GET /operations/runs + boş → []"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/field-control/services/fieldManeuverApi.test.ts` (3 test)

1. (fieldManeuverApi (Faz D2)) **"listManeuvers/listOperations: doğru uçlar + boş katalog []"**
2. (fieldManeuverApi (Faz D2)) **"executeManeuver: gövde {params} varsayılan; deviceIds + timer taşınır"**
3. (fieldManeuverApi (Faz D2)) **"executeOperation: doğru uç + sonuç passthrough"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/field-devices/hooks/useContainerDevices.test.tsx` (4 test)

1. (useContainerDevices (2026-09-02)) **"oturum açılır ve cihaz listesi tünelden gelir (source=tunnel)"**
2. (useContainerDevices (2026-09-02)) **"oturum başarısızsa snapshot fallback'i (source=snapshot)"**
3. (useContainerDevices (2026-09-02)) **"tünel listesi hata verirse snapshot fallback'i"**
4. (useContainerDevices (2026-09-02)) **"seçili konteyner snapshot'ta yoksa boş liste"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/field-devices/hooks/useFieldDevices.test.ts` (7 test)

1. (deriveDevicesFromSnapshot (B3)) **"benzersiz deviceId başına bir satır üretir (19 cihazlı konteyner)"**
2. (deriveDevicesFromSnapshot (B3)) **"tip önekten türetilir; snapshot cihazı online'dır"**
3. (deriveDevicesFromSnapshot (B3)) **"bilinmeyen önek → type 'unknown'"**
4. (deriveDevicesFromSnapshot (B3)) **"aynı cihaz iki konteynerde → tek satır, en yeni last_seen"**
5. (deriveDevicesFromSnapshot (B3)) **"boş snapshot → boş liste"**
6. (deriveDevicesFromSnapshot (B3) > latestTelemetryForDevice (B3)) **"seçili cihazın satırlarını döndürür (isim başına en yeni değer)"**
7. (deriveDevicesFromSnapshot (B3) > latestTelemetryForDevice (B3)) **"bilinmeyen cihaz → boş dizi"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/pcs/hooks/derivePcsSummaries.test.ts` (2 test)

1. (deriveAllPcsSummaries (2026-09-02)) **"konteyner başına bir PCS özeti üretir; PCS'siz konteyner atlanır"**
2. (deriveAllPcsSummaries (2026-09-02)) **"boş giriş → boş liste"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/pcs/hooks/usePcsTelemetryProvider.test.tsx` (2 test)

1. (usePcsTelemetryProvider (2026-09-02)) **"seriyi ister ve yalnız pcsId satırlarını döndürür"**
2. (usePcsTelemetryProvider (2026-09-02)) **"seçilen isim veriyi daha da daraltır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/settings/stores/settingsStore.test.ts` (4 test)

1. (settingsStore) **"varsayılan değerler tr/dark"**
2. (settingsStore) **"setLocale dil değiştirir"**
3. (settingsStore) **"setTheme tema değiştirir"**
4. (settingsStore) **"locale persist edilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/features/ui/Modal.test.tsx` (6 test)

1. (Modal) **"open=false iken null render eder"**
2. (Modal) **"open=true iken başlık ve içerik render eder"**
3. (Modal) **"Escape tuşu onClose çağırır"**
4. (Modal) **"overlay tıklaması onClose çağırır"**
5. (Modal) **"içerik tıklaması onClose çağırmaz"**
6. (Modal) **"kapatma butonu onClose çağırır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/layouts/nav-visibility.test.ts` (4 test)

1. (visibleNavKeys) **"admin ve teknik tüm menüyü görür"**
2. (visibleNavKeys) **"boss kontrol hariç tüm menüyü görür"**
3. (visibleNavKeys) **"guest ve developer yalnız Panel görür"**
4. (visibleNavKeys > emergencyVisible) **"admin/teknik görür; boss/guest/developer görmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/lib/api-base.test.ts` (7 test)

1. (field api-base (Boss Faz 3)) **"kök dizinde /api döner"**
2. (field api-base (Boss Faz 3)) **"normal saha rotalarında /api döner (tünel değil)"**
3. (field api-base (Boss Faz 3)) **"tünel subpath'inde /fields/:fid/ui/api döner"**
4. (field api-base (Boss Faz 3)) **"trailing slash normalize edilir"**
5. (field api-base (Boss Faz 3)) **"tünel içindeki alt route'lar prefix'i korur"**
6. (field api-base (Boss Faz 3)) **"isTunnelMode yalnızca /fields/:fid/ui önekinde true"**
7. (field api-base (Boss Faz 3)) **"fieldRootPath — normal modda /field/:fid, tünelde /fields/:fid/ui"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/lib/api-client.test.ts` (8 test)

1. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"standalone: request'e Bearer token eklenir"**
2. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"tünel modunda request interceptor Bearer EKLEMEZ (boss localStorage korunur)"**
3. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"eşzamanlı N 401 → TEK /auth/refresh + hepsi yeni token'la retry (AK-1.1)"**
4. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"refresh apiClient üzerinden (apiBaseUrl) yapılır — ham axios.post ÇAĞRILMAZ (AK-1.2)"**
5. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"refresh başarısız → token'lar + persist store temizlenir + /login SPA navigasyonu (AK-1.3)"**
6. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"refresh token yoksa retry YAPILMAZ — temizlik + navigasyon (401 fırlar)"**
7. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"retry sonrası ikinci 401 refresh ÇAĞRILMAZ — döngü koruması (_retry)"**
8. (field api-client interceptor (AUTH-REFRESH — UC-1)) **"tünel modunda 401 → tamamen İNERT: refresh yok, localStorage'a dokunulmaz, navigasyon yok (AK-1.4)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/lib/site-field.test.ts` (8 test)

1. (postLoginDestination) **"mustChangePassword → /change-password (her rol için öncelikli)"**
2. (postLoginDestination) **"MFA zorunlu rol + kayıt yok → /mfa-enroll"**
3. (postLoginDestination) **"MFA kayıtlıysa → saha ana sayfası"**
4. (postLoginDestination) **"MFA roller listesi boşsa (debug) → enroll YOK, doğrudan saha"**
5. (postLoginDestination) **"boss → /map"**
6. (postLoginDestination) **"fieldId boşsa → açık hata"**
7. (postLoginDestination) **"teknik + MFA zorunlu + kayıtlı → kendi sahası"**
8. (postLoginDestination > siteFieldId) **"string döner (tanımsızsa boş)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/pages/AdminOperationsPage.test.tsx` (4 test)

1. (AdminOperationsPage (C4)) **"admin değilse içerik GÖSTERİLMEZ"**
2. (AdminOperationsPage (C4)) **"tanımlar + geçmiş listelenir"**
3. (AdminOperationsPage (C4)) **"Kaydet → createOperation (boş manevra adımları elenir)"**
4. (AdminOperationsPage (C4)) **"Devre Dışı Bırak → deleteOperation (yumuşak silme)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/pages/ChangePasswordPage.test.tsx` (5 test)

1. (ChangePasswordPage) **"başarılı değişim + admin → fieldRootPath(siteFieldId()) — 'default-field' ASLA kullanılmaz"**
2. (ChangePasswordPage) **"fieldIds boşken siteFieldId kullanılır — sahte kimliğe düşmez"**
3. (ChangePasswordPage) **"siteFieldId boşsa → hata mesajı, navigasyon YOK"**
4. (ChangePasswordPage) **"boss rolü → /map (LoginPage sözleşmesi — SPA navigasyonu)"**
5. (ChangePasswordPage) **"API hatası → hata mesajı, navigasyon YOK"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/src/pages/SettingsPage.test.tsx` (4 test)

1. (SettingsPage) **"görünüm ve dil bölümleri render edilir"**
2. (SettingsPage) **"tema bölümü 'yakında' notunu gösterir"**
3. (SettingsPage) **"EN seçilince locale değişir ve çeviri EN'e geçer"**
4. (SettingsPage) **"TR seçilince locale tr'ye döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/field/vite-config.test.ts` (2 test)

1. (field vite.config — tünel base) **"VITE_TUNNEL_BASE set → base tünel kökü"**
2. (field vite.config — tünel base) **"VITE_TUNNEL_BASE boş → base '/'"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/app/app.test.ts` (3 test)

1. (superadmin app (T4 smoke)) **"App + providers import edilebilir"**
2. (superadmin app (T4 smoke)) **"routes tablosu auth + saha rotalarını tanımlar"**
3. (superadmin app (T4 smoke)) **"AuthStore state kontratı (login/logout aksiyonları)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/features/auth/stores/AuthStore.test.ts` (3 test)

1. (superadmin AuthStore (AUTH-REFRESH — UC-3)) **"login başarılı → oturum + token'lar"**
2. (superadmin AuthStore (AUTH-REFRESH — UC-3)) **"logout backend'i çağırır ve yerel temizlik yapar (davranış değişmez)"**
3. (superadmin AuthStore (AUTH-REFRESH — UC-3)) **"clearSession persist dahil tam temizler; backend çağrısı YAPMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/features/fields/components/FieldFormModal.test.tsx` (7 test)

1. (FieldFormModal) **"Saha Kimliği + Uplink Token alanları render edilir (hint'lerle)"**
2. (FieldFormModal) **"boş id+token → create input'unda id/uplinkToken YER ALMAZ (geriye uyumlu)"**
3. (FieldFormModal) **"geçersiz UUID → hata, create ÇAĞRILMAZ"**
4. (FieldFormModal) **"32 karakterden kısa token → hata, create ÇAĞRILMAZ"**
5. (FieldFormModal) **"geçerli id+token → create + onClose; büyük harfli UUID lowercase normalize edilir"**
6. (FieldFormModal) **"edit modu → Saha Kimliği disabled + kayıt değeri; token rotasyonu update'e gider"**
7. (FieldFormModal) **"API hatası → hata mesajı, onClose ÇAĞRILMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/features/fields/components/FieldRemoteFrame.test.tsx` (4 test)

1. (FieldRemoteFrame) **"mount'ta oturum açar ve iframe kurar"**
2. (FieldRemoteFrame) **"oturum hatasında mesaj gösterilir — iframe yok"**
3. (FieldRemoteFrame) **"Kapat → oturum kapatılır ve onClose çağrılır"**
4. (FieldRemoteFrame) **"Escape → kapanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/features/fields/hooks/useAdminFields.test.tsx` (2 test)

1. (useAdminFields (Faz 1 veri katmanı)) **"useFieldList saha listesini döner"**
2. (useAdminFields (Faz 1 veri katmanı)) **"useCreateField kayıt sonrası cache'i geçersiz kılar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/features/fields/mappers.test.ts` (5 test)

1. (toFieldMarker (sınır eşlemesi)) **"çevrimiçi sahayı online'a eşler"**
2. (toFieldMarker (sınır eşlemesi)) **"aktif alarmı olan çevrimiçi saha warning olur"**
3. (toFieldMarker (sınır eşlemesi)) **"çevrimdışı saha offline olur"**
4. (toFieldMarker (sınır eşlemesi)) **"eksik ölçümler undefined taşınır (UI '—' gösterir)"**
5. (toFieldMarker (sınır eşlemesi)) **"field_type → marker.type taşınır; null → undefined (genel glif)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/layouts/BossShell.test.tsx` (5 test)

1. (BossShell (bütünleşik kabuk)) **"kimliksiz kullanıcı login'e yönlendirilir"**
2. (BossShell (bütünleşik kabuk)) **"girişli kullanıcıda 3 nav öğesi + içerik görünür"**
3. (BossShell (bütünleşik kabuk)) **"header'da kullanıcı adı YERİNE PTF ve GİP değerleri gösterilir"**
4. (BossShell (bütünleşik kabuk)) **"footer ayar butonu settings modalını açar"**
5. (BossShell (bütünleşik kabuk)) **"şifre değişimi zorunluysa change-password'a gider"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/lib/api-client.test.ts` (5 test)

1. (superadmin api-client interceptor (AUTH-REFRESH — UC-3)) **"request'e Bearer token eklenir"**
2. (superadmin api-client interceptor (AUTH-REFRESH — UC-3)) **"eşzamanlı N 401 → TEK /auth/refresh + hepsi yeni token'la retry (AK-3.1)"**
3. (superadmin api-client interceptor (AUTH-REFRESH — UC-3)) **"refresh başarısız → token'lar + persist store temizlenir + /login SPA navigasyonu (AK-3.2)"**
4. (superadmin api-client interceptor (AUTH-REFRESH — UC-3)) **"refresh token yoksa retry YAPILMAZ — temizlik + navigasyon"**
5. (superadmin api-client interceptor (AUTH-REFRESH — UC-3)) **"retry sonrası ikinci 401 refresh ÇAĞRILMAZ — döngü koruması (_retry)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/pages/FieldDetailPage.test.tsx` (2 test)

1. (FieldDetailPage) **"render hatası olmadan saha özetini gösterir"**
2. (FieldDetailPage) **"bağlantı chip'i + son veri chip'i + aç butonu summary kartların ÜZERİNDE (header)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/pages/FieldsPage.test.tsx` (8 test)

1. (FieldsPage) **"harita ve Saha Ekle karosu render edilir"**
2. (FieldsPage) **"Saha Ekle karosu form modalını açar"**
3. (FieldsPage) **"saha kartı render edilir ve tıklamada detaya gider"**
4. (FieldsPage) **"kart üzerinde sil butonu YOKTUR (silme saha detayındadır)"**
5. (FieldsPage) **"durum çipleri sayaçlıdır ve grid'i filtreler"**
6. (FieldsPage) **"yüklenirken kart ve 'kayıt yok' metni gösterilmez"**
7. (FieldsPage) **"hata durumunda Tekrar Dene refetch çağırır"**
8. (FieldsPage) **"boş listede yalnızca Saha Ekle karosu kalır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/pages/LoginPage.test.tsx` (3 test)

1. (LoginPage) **"kimliksizken giriş formu gösterilir"**
2. (LoginPage) **"kimlikliyken /fields'e yönlendirilir"**
3. (LoginPage) **"şifre değişimi zorunluysa /change-password'a yönlendirilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/pages/MarketPage.test.tsx` (4 test)

1. (MarketPage) **"veri varken chart timestamp'leri kaynak ISO ile birebir — parse edilebilir"**
2. (MarketPage) **"chart timestamp'lerinde görüntüleme formatı YOKTUR (dd.MM.yyyy HH:mm)"**
3. (MarketPage) **"boş veri → boş dizi, render tamamlanır (çökme yok)"**
4. (MarketPage) **"lastUpdatedAt null → '—' (mevcut davranış korunur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/superadmin/src/pages/NotificationsPage.test.tsx` (5 test)

1. (NotificationsPage (Faz 5 — filtre barı)) **"bildirimleri saha adı + etiket + mesajla listeler"**
2. (NotificationsPage (Faz 5 — filtre barı)) **"tip çipleri sayaçlıdır ve tıklayınca o tip gizlenir"**
3. (NotificationsPage (Faz 5 — filtre barı)) **"arama metni saha adı ve mesaj üzerinde filtreler"**
4. (NotificationsPage (Faz 5 — filtre barı)) **"mute (yok say) localStorage'da kalıcı — tip listeden düşer"**
5. (NotificationsPage (Faz 5 — filtre barı)) **"unmute tekrar gösterir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/messaging/bullmq-adapter.test.ts` (18 test)

1. (BullMQAdapter openQueue (jenerik)) **"kuyruk + QueueEvents kurulur; retryOptions işlenir"**
2. (BullMQAdapter openQueue (jenerik)) **"aynı ad iki kez açılırsa tek Queue örneği döner (önbellek)"**
3. (BullMQAdapter openQueue (jenerik)) **"QueueEvents failed handler'ı konsola yazılır"**
4. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"add: jobName + data + jobId/delay/priority iletimi"**
5. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"addRepeatable: every + startDate + jobId"**
6. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"addRepeatablePattern: pattern + jobId"**
7. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: nesne sonuç spread edilir (success:true varsayılan)"**
8. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: worker success:false sonucu EZER"**
9. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: nesne olmayan sonuç → { success: true }"**
10. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: timeout/hatada → { success: false, reason }"**
11. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"registerWorker: doğru ad + concurrency; onCompleted/onFailed bağlanır"**
12. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"worker error eventi konsola yazılır"**
13. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"stats: sayaçlar döner; reddedilen sayaç 0 sayılır"**
14. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"jobCounts delegate eder"**
15. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"queueStatus: açık tüm kuyrukları kuyruk adıyla döner"**
16. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"health: ping false → false; ping true → true"**
17. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"health: ping hatası → false (throw yok)"**
18. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"close: tüm worker + QueueEvents + Queue close'ları çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/messaging/redis.test.ts` (8 test)

1. (RedisConnection (T3)) **"şifresiz config: URL redis://host:port + database opsiyonu"**
2. (RedisConnection (T3)) **"şifreli config: URL şifre taşır"**
3. (RedisConnection (T3)) **"connect yalnızca bir kez client.connect çağırır (idempotent)"**
4. (RedisConnection (T3)) **"disconnect yalnızca bağlıyken quit çağırır"**
5. (RedisConnection (T3)) **"ping PONG → true"**
6. (RedisConnection (T3)) **"ping hatası → false (throw DEĞİL — kademeli bozulma)"**
7. (RedisConnection (T3)) **"connectionConfig yapılandırmayı döner"**
8. (RedisConnection (T3)) **"client ham redis client'ı döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/client-rtu.test.ts` (7 test)

1. (ModbusRtuClient (T3)) **"config varsayılanlarıyla SerialPort kurulur (connect anında)"**
2. (ModbusRtuClient (T3)) **"connect open eventi ile bağlanır"**
3. (ModbusRtuClient (T3)) **"connect error eventi → 'Modbus RTU connection failed'"**
4. (ModbusRtuClient (T3)) **"connect timeout → port kapatılır + path bağlamlı hata"**
5. (ModbusRtuClient (T3)) **"bağlı değilken okuma 'Not connected' fırlatır"**
6. (ModbusRtuClient (T3)) **"close eventi bağlantıyı düşürür"**
7. (ModbusRtuClient (T3)) **"bağlıyken port error eventi bağlantıyı düşürür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/client.test.ts` (8 test)

1. (ModbusTcpClient (T3)) **"connect başarılı: bağlı durum + reconnect sayacı sıfırlanır"**
2. (ModbusTcpClient (T3)) **"connect error eventi → 'Modbus connection failed' hatası"**
3. (ModbusTcpClient (T3)) **"connect timeout (varsayılan 3000 ms) → socket destroy + hata"**
4. (ModbusTcpClient (T3)) **"bağlı değilken read/write 'Not connected' fırlatır"**
5. (ModbusTcpClient (T3)) **"readHoldingRegisters jsmodbus sonucunu döner; hata sarılır"**
6. (ModbusTcpClient (T3)) **"socket close eventi bağlantıyı düşürür"**
7. (ModbusTcpClient (T3)) **"bağlıyken socket error eventi bağlantıyı düşürür"**
8. (ModbusTcpClient (T3)) **"reconnect: cleanup + bekleme sonrası yeniden connect"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/decoder.test.ts` (20 test)

1. (BinaryPayloadDecoder > constructor + byte order) **"stores registers in BIG_ENDIAN order (no transform)"**
2. (BinaryPayloadDecoder > constructor + byte order) **"reverses bytes for LITTLE_ENDIAN"**
3. (BinaryPayloadDecoder > constructor + byte order) **"swaps words for BIG_ENDIAN_SWAP"**
4. (BinaryPayloadDecoder > constructor + byte order) **"does 4-byte reverse for LITTLE_ENDIAN_SWAP"**
5. (BinaryPayloadDecoder > constructor + byte order > decodeUint16) **"decodes single unsigned 16-bit"**
6. (BinaryPayloadDecoder > constructor + byte order > decodeUint16) **"decodes 0xFFFF as 65535"**
7. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16) **"decodes positive value"**
8. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16) **"decodes negative value (two's complement)"**
9. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32) **"decodes two registers into 32-bit unsigned"**
10. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32) **"decodes max value"**
11. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32) **"decodes positive 32-bit"**
12. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32) **"decodes negative 32-bit"**
13. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes float 32 from two registers"**
14. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes 0.0"**
15. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes negative float"**
16. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64) **"decodes float 64 from four registers"**
17. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64) **"decodes 0.0"**
18. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement) **"advances position across multiple decodes"**
19. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement > getRegisterCount > scale/offset pattern (integration example)) **"applies scale and offset after decoding"**
20. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement > getRegisterCount > scale/offset pattern (integration example)) **"handles negative offset"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/device.test.ts` (27 test)

1. (ModbusDevice.read() ISP sözleşmesi) **"register + bitfield çıktılarını birleşik döner"**
2. (ModbusDevice.read() ISP sözleşmesi) **"bitfield bit değeri mask ile çıkarılır"**
3. (ModbusDevice.read() ISP sözleşmesi) **"bitfield config yoksa yalnızca register telemetrileri döner"**
4. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write()) **"scale/offset uygulanmış ham değeri HOLDING register'ına yazar"**
5. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write()) **"COIL telemetrisini writeCoils ile boolean olarak yazar"**
6. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write()) **"boş girdi → transport'a yazma çağrısı YAPILMAZ"**
7. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write()) **"config'te olmayan isim yok sayılır (kademeli bozulma)"**
8. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"başarılı yazımda backup okur, yazar, rollback ÇAĞRILMAZ"**
9. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"ikinci grupta hata → ilk grup ESKİ değerine geri yüklenir + orijinal hata fırlar"**
10. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"rollback sırasında hata olursa ORİJİNAL hata fırlar (rollback hatası yutulur)"**
11. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"COIL yazımı başarılı + holding başarısız → coil ESKİ değerine döner"**
12. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"FLOAT32 değerleri BE register çifti olarak yazılır ve rollback round-trip korunur"**
13. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"yalnızca INPUT_REGISTER girdi → no-op (backup dahi okunmaz)"**
14. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"bitişik adresler priority farkına rağmen tek istekte okunur"**
15. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"okuma sırası: HOLDING, INPUT, COIL, DISCRETE, bitfield"**
16. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"coil/discrete okumalarında sıra korunur"**
17. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"tüm sonuçlar aynı poll timestamp'ini taşır"**
18. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"yalnızca bitfield'lı cihazda read() bitfield sonuçlarını döner"**
19. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"aynı isimli girdilerde tag alt küme eşleşmesi doğru olanı seçer"**
20. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"32-bit tam genişlik bitfield doğru çözülür"**
21. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitfield bit aralığı 31 üstü reddedilir"**
22. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitEnd < bitStart reddedilir"**
23. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitfield registerType COIL reddedilir"**
24. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C)) **"COIL backup'u readCoils'tan okunur; aynı adresli HOLDING ile karışmaz"**
25. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C)) **"rollback ham register'ları aynen geri yazar (float kayma yok)"**
26. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C) > ModbusDevice yazma limiti (Faz C)) **"125 register üstü yazma grubu reddedilir"**
27. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C) > ModbusDevice yazma limiti (Faz C) > ModbusDevice bağlantı cooldown (mevcut davranış karakterizasyonu)) **"kopuk bağlantıda reconnect dener; 10 sn içinde ikinci deneme reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/utils.test.ts` (1 test)

1. (randomFloat) **"[0,1) aralığında döner — 100 örneklem"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.test.ts` (6 test)

1. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"multi-row INSERT + BEGIN/COMMIT üretir; tablo adı device_ önekli"**
2. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"boş girdi → havuz işlemi YAPILMAZ"**
3. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"INSERT hatası → ROLLBACK; write hata YUTAR (allSettled — kademeli bozulma, pipeline durmaz)"**
4. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"ensureTableExists tablo DDL'ini yalnızca bir kez çalıştırır (tablo önbelleği)"**
5. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)) **"aggregate: bucket'lar sorgunun from zamanına hizalanır (origin=$1)"**
6. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)) **"getDownsampledData: bucket'lar from ISO zamanına hizalanır (origin literal)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/epias-client/src/client.test.ts` (6 test)

1. (EpiasClient) **"fetchJson — once CAS'ten TGT alir, istege TGT header'i ekler"**
2. (EpiasClient) **"ptf — tarihler +03:00 formatina cevrilir"**
3. (EpiasClient) **"401 alinirsa bilet gecersiz kilinir ve istek bir kez tekrarlanir"**
4. (EpiasClient) **"ayni client, bilet gecerliyken tek TGT kullanir"**
5. (EpiasClient > toEpiasIso) **"UTC tarihi Turkiye saati +03:00 olarak bicimler"**
6. (EpiasClient > toEpiasIso) **"kis aylarinda da sabit +03:00 kullanir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/epias-client/src/ticket-store.test.ts` (9 test)

1. (EpiasTicketStore) **"ilk istekte CAS'ten bilet alir ve dosyaya yazar"**
2. (EpiasTicketStore) **"CAS HTML yanitindan TGT'yi ayiklar (canli form cevabi)"**
3. (EpiasTicketStore) **"TGT'siz HTML → hata firlatir (ticket cache'e girmez)"**
4. (EpiasTicketStore) **"gecerli bilet varken CAS'e tekrar istek atmaz (throttle korumasi)"**
5. (EpiasTicketStore) **"omru dolan bilet yenilenir"**
6. (EpiasTicketStore) **"bilet dosyada kalicidir — yeni store ornegi ayni bileti kullanir"**
7. (EpiasTicketStore) **"es zamanli isteklerde tek CAS cagrisi yapilir"**
8. (EpiasTicketStore) **"invalidate sonrasi bilet yeniden alinir"**
9. (EpiasTicketStore) **"CAS 201 disinda cevap donerse hata firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/logger/src/logger.test.ts` (15 test)

1. (Logger — UC-1 temel loglama ve format) **"AK-1.1 — info kaydı ts/level/service/message/context taşır"**
2. (Logger — UC-1 temel loglama ve format) **"AK-1.1 — context'siz kayıt da üretilir"**
3. (Logger — UC-1 temel loglama ve format) **"AK-1.2 — eşiğin altındaki seviye sink'e ulaşmaz"**
4. (Logger — UC-1 temel loglama ve format) **"AK-1.3 — level verilmezse info varsayılan olur"**
5. (Logger — UC-1 temel loglama ve format) **"AK-1.4 — level altı çağrıda sink'e kayıt üretilmez (no-op)"**
6. (Logger — UC-1 temel loglama ve format) **"boş service constructor'da throw eder"**
7. (Logger — UC-1 temel loglama ve format) **"edge — fonksiyon/sembol içeren context güvenle elenir"**
8. (Logger — UC-1 temel loglama ve format) **"edge — döngüsel context throw etmez, kayıt üretilir"**
9. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"AK-3.2 — child component taşır, service parent'ınkidir"**
10. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"AK-3.1 — parent'a sonradan eklenen sink child kayıtlarını da alır"**
11. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"child parent'ın level'ini devralır"**
12. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"edge — boş component kaydı etiketsiz üretir"**
13. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"AK-2.2 — bir sink throw edince diğeri yazar, logger throw etmez"**
14. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"AK-2.2 — async sink reddederse logger throw etmez"**
15. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"close tüm sink'lerin close'unu çağırır, hata yutulur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/logger/src/sinks.test.ts` (8 test)

1. (Logger — UC-2 sink yönetimi) **"AK-2.1 — removeSink sonrası kayıt yalnız kalan sink'e gider"**
2. (Logger — UC-2 sink yönetimi) **"edge — aynı sink iki kez eklenirse tek sayılır"**
3. (Logger — UC-2 sink yönetimi) **"edge — listede olmayan sink'i çıkarmak no-op'tur"**
4. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"AK-2.3 — JSON satırları append eder; close stream'i kapatır"**
5. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"edge — üst dizin yoksa oluşturur"**
6. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"close sonrası yazma reddedilir"**
7. (Logger — UC-2 sink yönetimi > FileSink — UC-2 > ConsoleSink) **"insan-okur tek satırı seviye metoduna yazar"**
8. (Logger — UC-2 sink yönetimi > FileSink — UC-2 > ConsoleSink) **"seviyeyi doğru console metoduna eşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/command-job-builder.test.ts` (16 test)

1. (CommandJobBuilder.build) **"config yok → err device_not_found"**
2. (CommandJobBuilder.build) **"komut tanımsız → err command_not_found"**
3. (CommandJobBuilder.build) **"zorunlu param eksik → err missing_param (context.paramName taşır)"**
4. (CommandJobBuilder.build) **"zorunlu olmayan param eksik → ok"**
5. (CommandJobBuilder.build) **"{{param}} sayısal çözülür; -{{param}} negatif uygular; şablon olmayan aynen kalır"**
6. (CommandJobBuilder.build) **"atomic belirtilmemişse true; false belirtilmişse false"**
7. (CommandJobBuilder.build) **"gerçek config (source of truth): BSC global 30264/30265 + DC-METER voltage + stop (K1)"**
8. (CommandJobBuilder.build) **"validate eşlemesi: reads + timeoutMs + minWaitMs"**
9. (CommandJobBuilder.build) **"validate yoksa job.validate undefined; timeoutMs defaultu yalnızca validate ile birlikte anlamlı"**
10. (CommandJobBuilder.build) **"jobId formatı: deviceId-command-timestamp (enjekte now)"**
11. (CommandJobBuilder.build) **"telemetri çıktısına timestamp + deviceId + description eklenir"**
12. (CommandJobBuilder.build) **"job type COMMAND_DEVICE ve deviceId doğru"**
13. (CommandJobBuilder.build > DeviceConfigFileSource) **"mevcut dosyayı yükler"**
14. (CommandJobBuilder.build > DeviceConfigFileSource) **"olmayan cihaz → undefined"**
15. (CommandJobBuilder.build > DeviceConfigFileSource) **"büyük/küçük harf uyumlu arama: önce lowercase, sonra orijinal"**
16. (CommandJobBuilder.build > DeviceConfigFileSource) **"bozuk JSON atlanır → undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/maneuver-migration.test.ts` (12 test)

1. (konteyner maneuvers.json (A3 migrasyon)) **"fail-fast yüklenir — 11 kayıt"**
2. (konteyner maneuvers.json (A3 migrasyon)) **"registry isimle çözer (bsc_prepare, fl03, fl05 force)"**
3. (konteyner maneuvers.json (A3 migrasyon)) **"K12: hiçbir adımda BSC charge/discharge komutu YOK"**
4. (konteyner maneuvers.json (A3 migrasyon)) **"bsc_prepare güç param'ı TAŞIMAZ (K12 sözleşmesi)"**
5. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"fail-fast yüklenir — 11 kayıt"**
6. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"deviceTypes seçicili adımlar (PCS tip çözümlemesi yürütücüde)"**
7. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"fl06/fl07/fl10 gizli; fl01/fl03/fl04/fl05 görünür"**
8. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"FL-02 kartları manevra kaydında YOK — OPERASYON'a taşındı (§7)"**
9. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"fail-fast yüklenir — 3 operasyon"**
10. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"field_charge: uzak bsc_prepare ×2 + yerel pcs_charge; rollback ters set"**
11. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"field_maintenance (FL-11): uzak bakım kapatması + yerel stop"**
12. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"registry operasyon isimlerini çözer"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/maneuver-registry.test.ts` (11 test)

1. (ManeuverRegistry) **"bilinen manevra ismini çözer — ok(kayıt)"**
2. (ManeuverRegistry) **"bilinen operasyon ismini çözer — ok(kayıt)"**
3. (ManeuverRegistry) **"bilinmeyen isim → err({kind: not_found}) — throw YOK"**
4. (ManeuverRegistry) **"tür ayrımı: manevra ismi operasyon türünde çözülmez"**
5. (ManeuverRegistry) **"boş kayıt seti — her isim not_found"**
6. (ManeuverRegistry) **"aynı isimde iki DOSYA manevrası → kurulumda THROW (fail-fast)"**
7. (ManeuverRegistry) **"manevra ve operasyon aynı isimde olabilir (ayrı ad uzayları)"**
8. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"DB kaydı dosya kaydını GÖLGELER (öncelik DB)"**
9. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"disabled DB kaydı → err({kind: disabled}) — dosyaya DÜŞMEZ"**
10. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"DB'de yoksa dosyaya düşer"**
11. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"list: enabled DB kayıtları + gölgelenmeyen dosya kayıtları"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/operation-executor.test.ts` (23 test)

1. (OperationExecutor — manevra yürütme) **"kayıt yok → rejected; begin/kanal ÇALIŞMAZ"**
2. (OperationExecutor — manevra yürütme) **"deviceTypes çözümleme + divideTotal: 200 kW → 2 PCS × 100 kW"**
3. (OperationExecutor — manevra yürütme) **"grup kısıtı (deviceIds) seçici çözümünü KESER"**
4. (OperationExecutor — manevra yürütme) **"çözüm boş → adım başarısız → failed (kademeli bozulma)"**
5. (OperationExecutor — manevra yürütme) **"sequential + onFailure stop: ilk hata kalan adımları ATLAR"**
6. (OperationExecutor — manevra yürütme) **"onFailure continue: hata sonrası devam; sonuç failed"**
7. (OperationExecutor — manevra yürütme) **"rollback: yalnızca BAŞARILI adımların kompanzasyonu, ters sıra"**
8. (OperationExecutor — manevra yürütme) **"rollback best-effort: kompanzasyon hatası diğerlerini durdurmaz"**
9. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"begin FAIL-CLOSED: throw → rejected (run_persist_failed), kanal çalışmaz"**
10. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"başarılı koşu: begin(running) → finish(completed) + audit zinciri"**
11. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"finish best-effort: throw → sonuç yine döner + operation_state_update_failed"**
12. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer: başarılı adımda stop planlanır (best-effort + timer_scheduled)"**
13. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer: ana komut BAŞARISIZSA planlama YAPILMAZ"**
14. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer schedule hatası → timer_schedule_failed; akış durmaz"**
15. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"manevra adımı + ham zincir adımı sırayla çalışır"**
16. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"uzak adım (system) B1'de kanal YOK → fail (kademeli bozulma)"**
17. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"operasyon onFailure rollback: üst rollback listesi çalışır"**
18. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"remoteChannel VARSA uzak adım kanala delege edilir (param aktarımıyla)"**
19. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak adıma timer iletilir (options.timer → 4. argüman)"**
20. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak adım fail → operasyon failed (kademeli)"**
21. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak rollback adımı: yalnızca BAŞARILI adımlar kompanse edilir (ok → rollback_step_ok)"**
22. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C) > OperationExecutor — UI zamanlı çalıştırma (§10)) **"options.timer TÜM yerel ana adımlara uygulanır; rollback adımlarına UYGULANMAZ"**
23. (OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C) > OperationExecutor — UI zamanlı çalıştırma (§10)) **"kayıt adımının kendi timer'ı options.timer'ı EZER"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/logging/src/event-codes.test.ts` (3 test)

1. (GD-PMS olay sözlüğü) **"kayıtlı kodlar doğrulanır"**
2. (GD-PMS olay sözlüğü) **"bilinmeyen kodlar reddedilir"**
3. (GD-PMS olay sözlüğü) **"küme boş değildir ve benzersizdir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/logging/src/logger-config.test.ts` (8 test)

1. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"üç tier için de tanımlıdır"**
2. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"container: console + file (timescale YOK)"**
3. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"field: console + file + timescale"**
4. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"boss: console + file + timescale"**
5. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"tüm tier'ların signingKeyPath'i doludur"**
6. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"override'sız tier varsayılanını döner"**
7. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"override alanları tier varsayılanını ezer"**
8. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"sink listesi override edilebilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/messaging/src/platform-message-queue.test.ts` (24 test)

1. (PlatformMessageQueue retry haritası (T0.12)) **"harita politika değerlerini taşır"**
2. (PlatformMessageQueue retry haritası (T0.12)) **"READ_DEVICE kuyruğu attempts:1 ile açılır (poll = doğal retry)"**
3. (PlatformMessageQueue retry haritası (T0.12)) **"WRITE_TELEMETRY kuyruğu attempts:5 + backoff ile açılır"**
4. (PlatformMessageQueue retry haritası (T0.12)) **"her tip kendi seçenekleriyle açılır"**
5. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"queueNames override: Queue + QueueEvents + Worker özel adla açılır"**
6. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"retryOptions override kuyruğa işlenir (tip başına TAM değiştirme)"**
7. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"bilinmeyen JobType anahtarları yok sayılır"**
8. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addJob delay seçeneğini iletir"**
9. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: başarılı nesne sonucu döner"**
10. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: nesne olmayan sonuç → { success: true }"**
11. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: timeout/hatada → { success: false, reason }"**
12. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addRepeatableJob: pattern + jobId formatı"**
13. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addRepeatableJobEvery: startDate'li ve startDate'siz"**
14. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"registerWorkerFor: doğru ad + concurrency; onCompleted/onFailed bağlanır"**
15. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"registerWorker: 6 tip için worker kurulur"**
16. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"worker error eventi konsola yazılır"**
17. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStatus: kuyruklar JobType adıyla döner"**
18. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStatus: reddedilen sayaç 0 sayılır (allSettled — kademeli bozulma)"**
19. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStats: bilinen tip durum döner, bilinmeyen tip null"**
20. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping false → false"**
21. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping true + READ_DEVICE kuyruğu → true"**
22. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping true + kuyruk yok → true"**
23. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: getJobCounts hatası → false"**
24. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"close: tüm worker/queueEvents/queue close'ları çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/context.test.ts` (4 test)

1. (FilePluginStateStore) **"yazma/okuma/silme turu calisir"**
2. (FilePluginStateStore) **"bozuk dosya durumunda bos obje doner"**
3. (FilePluginStateStore > JsonFilePluginConfigSource + PluginContextFactory) **"config dosyasini yukler ve context olusturur"**
4. (FilePluginStateStore > JsonFilePluginConfigSource + PluginContextFactory) **"config dosyasi yoksa bos obje doner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/http/http-client.test.ts` (7 test)

1. (HttpClient) **"getJson — baseUrl ile birlesik URL ve header'lar ile istek atar"**
2. (HttpClient) **"postJson — JSON govde ve Content-Type header'i ekler"**
3. (HttpClient) **"postForm — form-encoded govde uretir"**
4. (HttpClient) **"5xx hatasinda yeniden dener, basarili denemeyi dondurur"**
5. (HttpClient) **"4xx hatasinda yeniden denemez, HttpError firlatir"**
6. (HttpClient) **"ag hatasinda maxRetries kadar yeniden dener"**
7. (HttpClient) **"HttpError govdeyi ve durumu tasir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/loader.test.ts` (5 test)

1. (PluginLoader) **"statik kaynaktaki pluginleri kaydeder"**
2. (PluginLoader) **"dizin kaynagindan plugin yukler (runtime plugin)"**
3. (PluginLoader) **"olmayan dizinde bos doner ve hata firlatmaz"**
4. (PluginLoader) **"ayni isim statik ve dizin kaynagindan gelirse ilki kazanir"**
5. (PluginLoader) **"manifest'siz dizin girisini atlar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/registry.test.ts` (5 test)

1. (PluginRegistry) **"plugin kaydeder ve sorgular"**
2. (PluginRegistry) **"ayni isimdeki ikinci kaydi reddeder"**
3. (PluginRegistry) **"SDK versiyon uyumsuzlugunu reddeder"**
4. (PluginRegistry) **"deactivateAll tum pluginleri deactivate eder ve temizler"**
5. (PluginRegistry) **"health tum pluginleri toplar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/sdk-version.test.ts` (4 test)

1. (SemVerRange) **"aralik icindeki versiyonlari kabul eder"**
2. (SemVerRange) **"aralik disindaki versiyonlari reddeder"**
3. (SemVerRange) **"tek kosullu araliklari destekler"**
4. (SemVerRange) **"gecersiz ifadelerde firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugins/epias-market-prices/src/plugin.test.ts` (9 test)

1. (EpiasMarketPricesPlugin) **"manifest ve schedule dondurur"**
2. (EpiasMarketPricesPlugin) **"fetch — satirlari MarketDataPoint'e cevirir, TGT header ekler ve cursor yazar"**
3. (EpiasMarketPricesPlugin) **"hourField verilirse timestamp = date + (hour-1) saat (TR saati)"**
4. (EpiasMarketPricesPlugin) **"hourField gecersizse satir atlanir"**
5. (EpiasMarketPricesPlugin) **"fetch — pencere verilmezse cursor'dan devam eder"**
6. (EpiasMarketPricesPlugin) **"iki fetch ayni TGT'yi kullanir — CAS'e tek istek atilir"**
7. (EpiasMarketPricesPlugin) **"gecersiz konfigurasyonda activate firlatir"**
8. (EpiasMarketPricesPlugin) **"bozuk satirlari sessizce atlar"**
9. (EpiasMarketPricesPlugin) **"activate'ten once fetch firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/result/src/domain-error.test.ts` (8 test)

1. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"tüm alanları korur"**
2. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"boş message kabul etmez — constructor doğrular"**
3. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"boş code kabul etmez"**
4. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"varsayılanlar: context boş, cause yok"**
5. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"Error zincirinin parçasıdır"**
6. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"${c.name} → kind=${c.kind}, retryable=${c.retryable}"**
7. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"alt sınıflar context/cause seçeneklerini kabul eder"**
8. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"kind üzerine yazılamaz — alt sınıf kimliği korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/result/src/result.test.ts` (19 test)

1. (Result<T,E> (T0.2) > ok()) **"başarı durumu taşır"**
2. (Result<T,E> (T0.2) > ok()) **"null kabul etmez — constructor doğrular"**
3. (Result<T,E> (T0.2) > ok()) **"undefined kabul etmez — constructor doğrular"**
4. (Result<T,E> (T0.2) > ok() > err()) **"hata durumu taşır"**
5. (Result<T,E> (T0.2) > ok() > err()) **"undefined hata kabul etmez"**
6. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"err üzerinde unwrap fırlatır"**
7. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"ok üzerinde error() fırlatır"**
8. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"unwrapOr hata durumunda fallback döner"**
9. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"unwrapOr başarı durumunda değeri döner"**
10. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map) **"ok üzerinde dönüşüm uygular"**
11. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map) **"err üzerinde dönüşüm uygulamaz — hatayı korur"**
12. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen) **"ok üzerinde zincirler ve yeni Result döner"**
13. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen) **"err üzerinde zincirlemez — hatayı korur"**
14. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match) **"ok kolunu çalıştırır"**
15. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match) **"err kolunu çalıştırır"**
16. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"map/andThen mevcut nesneyi değiştirmez"**
17. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"her üretim yeni örnektir"**
18. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"okVoid değersiz başarı üretir (komut tipi işlemler)"**
19. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"okVoid hata taşıyamaz — err ayrı factory'dir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/automation-rule.test.ts` (26 test)

1. (automationRulesSchema) **"geçerli kural dosyasını kabul eder (command + log + notify)"**
2. (automationRulesSchema) **"when.all ile çoklu koşul kabul eder"**
3. (automationRulesSchema) **"when.any kabul eder"**
4. (automationRulesSchema) **"device seçicisi ids + types birlikte kabul eder"**
5. (automationRulesSchema) **"device seçicisi olmadan koşul kabul eder (tüm cihazlar)"**
6. (automationRulesSchema) **"enabled/cooldownMs/debounceMs opsiyoneldir"**
7. (automationRulesSchema) **"debounceMs 0 kabul eder (anında kenar)"**
8. (automationRulesSchema) **"when hem eksik hem boş → red"**
9. (automationRulesSchema) **"all boş dizi → red"**
10. (automationRulesSchema) **"op enum dışı değer → red"**
11. (automationRulesSchema) **"threshold sayı değilse → red"**
12. (automationRulesSchema) **"device.ids boş dizi → red"**
13. (automationRulesSchema) **"device.types boş dizi → red"**
14. (automationRulesSchema) **"then boş → red"**
15. (automationRulesSchema) **"bilinmeyen aksiyon tipi → red"**
16. (automationRulesSchema) **"maneuver/operation aksiyonları: name zorunlu, params opsiyonel (KURAL-MOTORU-V2)"**
17. (automationRulesSchema) **"container-command aksiyonu: containerId + deviceId + command zorunlu"**
18. (automationRulesSchema) **"command aksiyonu command adı zorunlu, params opsiyonel"**
19. (automationRulesSchema) **"log aksiyonu level enum zorunlu, eventCode/message opsiyonel"**
20. (automationRulesSchema) **"notify aksiyonu boş obje olarak kabul eder"**
21. (automationRulesSchema) **"cooldownMs negatif → red"**
22. (automationRulesSchema) **"debounceMs negatif → red"**
23. (automationRulesSchema) **"bilinmeyen üst seviye anahtar → red (strict)"**
24. (automationRulesSchema) **"bilinmeyen koşul anahtarı → red (strict)"**
25. (automationRulesSchema) **"rules boş dizi → red"**
26. (automationRulesSchema) **"çıktı tipi sözleşmeyi taşır (derleme kontratı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/commands/maneuver-record.test.ts` (23 test)

1. (commandStepSchema (REV.02 §5.1)) **"deviceId'li adım kabul edilir"**
2. (commandStepSchema (REV.02 §5.1)) **"deviceIds / deviceTypes seçicileri kabul edilir"**
3. (commandStepSchema (REV.02 §5.1)) **"ham telemetries adımı (komutsuz) kabul edilir"**
4. (commandStepSchema (REV.02 §5.1)) **"hiçbir hedef seçici YOK → RED (tam biri zorunlu)"**
5. (commandStepSchema (REV.02 §5.1)) **"iki seçici birden → RED (tam biri zorunlu)"**
6. (commandStepSchema (REV.02 §5.1)) **"command ve telemetries İKİSİ DE yok → RED"**
7. (commandStepSchema (REV.02 §5.1)) **"timer (REV.03 §10): durationMs pozitif + opsiyonel stopCommand"**
8. (commandStepSchema (REV.02 §5.1)) **"bilinmeyen anahtar RED (strict)"**
9. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"geçerli kayıt kabul edilir (ui meta dahil)"**
10. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"steps boş → RED"**
11. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"onFailure 'rollback' + rollbackSteps YOK → RED (§7.1 fail-fast)"**
12. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"rollbackSteps VARSA onFailure rollback kabul edilir"**
13. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"bilinmeyen üst seviye anahtar RED (strict)"**
14. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"uzak adım (system + maneuver) kabul edilir"**
15. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"yerel manevra adımı kabul edilir"**
16. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"yerel ham komut zinciri adımı kabul edilir"**
17. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"system'i OLMAYAN manevra adımı ile boş nesne RED"**
18. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"geçerli operasyon: field_charge deseni (§6.1)"**
19. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"onFailure 'rollback' + üst seviye rollback YOK → RED"**
20. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"maneuvers.json kök şeması: maneuvers min 1; bilinmeyen anahtar RED"**
21. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadManeuversFile: bozuk JSON → throw"**
22. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadManeuversFile: şema ihlali → throw (fail-fast)"**
23. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadOperationsFile: geçerli dosya parse edilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/commands/validate-expect.test.ts` (8 test)

1. (isRelationExpect) **"ilişki sözcüklerini tanır"**
2. (isRelationExpect) **"diğer string/sayı/boolean değerleri tanımaz"**
3. (isRelationExpect > expectHolds) **"negative: yalnızca negatif sayılar tutar"**
4. (isRelationExpect > expectHolds) **"positive: yalnızca pozitif sayılar tutar"**
5. (isRelationExpect > expectHolds) **"zero: yalnızca 0 tutar"**
6. (isRelationExpect > expectHolds) **"nonzero: 0 dışı sayılar tutar"**
7. (isRelationExpect > expectHolds) **"birebir eşitlik değişmez (sayı/string/boolean)"**
8. (isRelationExpect > expectHolds) **"BOOLEAN register sayısal çözümü: 0/1 ↔ true/false eşleşir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/alarm.test.ts` (8 test)

1. (device alarm kuralı şeması) **"alarms bölümünü kabul eder"**
2. (device alarm kuralı şeması) **"geçersiz severity reddedilir"**
3. (device alarm kuralı şeması) **"telemetry boş olamaz"**
4. (device alarm kuralı şeması) **"activeLow opsiyoneldir (varsayılan false)"**
5. (device alarm kuralı şeması) **"alarms yoksa config yine geçerli (geriye uyumlu)"**
6. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"alarmLimit artık şemada yok — strip edilir"**
7. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"logType artık şemada yok — strip edilir"**
8. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"çıktı tipi alarmLimit/logType taşımaz (derleme kontratı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/device-config.test.ts` (21 test)

1. (bitfieldFieldSchema) **"accepts valid input"**
2. (bitfieldFieldSchema) **"rejects bitStart > bitEnd"**
3. (bitfieldFieldSchema) **"rejects bitStart > 15"**
4. (bitfieldFieldSchema) **"rejects empty name"**
5. (bitfieldFieldSchema) **"accepts optional fields omitted"**
6. (bitfieldFieldSchema) **"accepts with all optional fields"**
7. (bitfieldFieldSchema) **"logType artık şemada yok (T0.11) — bilinmeyen anahtar strip edilir"**
8. (bitfieldFieldSchema > bitfieldConfigSchema) **"accepts valid config"**
9. (bitfieldFieldSchema > bitfieldConfigSchema) **"rejects empty fields array"**
10. (bitfieldFieldSchema > bitfieldConfigSchema) **"rejects invalid registerType"**
11. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts valid device config without optional fields"**
12. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts config with optional fields"**
13. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects empty deviceId"**
14. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects empty telemetry array"**
15. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects invalid protocol"**
16. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects invalid transport kind"**
17. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts simulator transport (tip açık string — kayıt defteri çalışma zamanında doğrular)"**
18. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts tcp and rtu transport kinds"**
19. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"accepts and preserves opaque details"**
20. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"top-level rackCount artık şemada yok — strip edilir"**
21. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"details opsiyoneldir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/server-config.test.ts` (11 test)

1. (authConfigSchema) **"accepts valid config"**
2. (authConfigSchema) **"rejects short jwtSecret (< 16 chars)"**
3. (authConfigSchema) **"rejects zero accessTokenExpirySeconds"**
4. (authConfigSchema) **"rejects negative refreshTokenExpirySeconds"**
5. (authConfigSchema) **"rejects non-integer expiry"**
6. (authConfigSchema) **"accepts exactly 16 char jwtSecret"**
7. (authConfigSchema > serverConfigSchema) **"accepts valid config"**
8. (authConfigSchema > serverConfigSchema) **"rejects empty host"**
9. (authConfigSchema > serverConfigSchema) **"rejects port 0"**
10. (authConfigSchema > serverConfigSchema) **"rejects port > 65535"**
11. (authConfigSchema > serverConfigSchema) **"rejects negative port"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/service-config.test.ts` (15 test)

1. (redisConfigSchema) **"accepts minimal config"**
2. (redisConfigSchema) **"accepts full config"**
3. (redisConfigSchema) **"rejects empty host"**
4. (redisConfigSchema) **"rejects port 0"**
5. (redisConfigSchema) **"rejects port > 65535"**
6. (redisConfigSchema) **"rejects negative db index"**
7. (redisConfigSchema > postgresConfigSchema) **"accepts valid config"**
8. (redisConfigSchema > postgresConfigSchema) **"accepts with optional ssl and maxConnections"**
9. (redisConfigSchema > postgresConfigSchema) **"rejects empty database"**
10. (redisConfigSchema > postgresConfigSchema) **"rejects empty password"**
11. (redisConfigSchema > postgresConfigSchema) **"rejects zero maxConnections"**
12. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"accepts minimal config"**
13. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"accepts full config with optional sections"**
14. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"rejects missing redis"**
15. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"rejects invalid redis config"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/validate.test.ts` (4 test)

1. (validateOrThrow) **"returns parsed data on valid input"**
2. (validateOrThrow) **"throws with label in error message on invalid input"**
3. (validateOrThrow) **"throws with detailed Zod validation errors"**
4. (validateOrThrow) **"handles nested schema errors"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-utils/src/config/definitions.test.ts` (8 test)

1. (log config definitions (T0.5/T0.6)) **"logLevel varsayılanı info'dur"**
2. (log config definitions (T0.5/T0.6)) **"logLevel env ile okunur"**
3. (log config definitions (T0.5/T0.6)) **"logLevel geçersiz değerde fırlatır"**
4. (log config definitions (T0.5/T0.6)) **"logSigningKeyPath varsayılanı doludur"**
5. (log config definitions (T0.5/T0.6)) **"logFilePath varsayılanı undefined — tier varsayılanına düşer"**
6. (log config definitions (T0.5/T0.6)) **"serviceTier geçersiz değerde fırlatır"**
7. (log config definitions (T0.5/T0.6)) **"tüm tanımlar benzersiz anahtara sahiptir"**
8. (log config definitions (T0.5/T0.6)) **"bmsTarget tanımları: varsayılan undefined; env ile okunur; port sayıya dönüşür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-utils/src/config/loader.test.ts` (10 test)

1. (ConfigLoader (T3)) **"kaynak önceliği: ObjectSource EnvSource'u ezer"**
2. (ConfigLoader (T3)) **"kaynak yoksa default değer kullanılır"**
3. (ConfigLoader (T3)) **"EnvSource sayısal değerleri number'a çevirir"**
4. (ConfigLoader (T3)) **"validate hatası load()'da anahtar bağlamıyla fırlar"**
5. (ConfigLoader (T3)) **"get bilinmeyen anahtarda fırlar"**
6. (ConfigLoader (T3)) **"birim normalizasyonu: duration-ms ve bytes"**
7. (ConfigLoader (T3)) **"geçersiz duration-ms fırlatır"**
8. (ConfigLoader (T3)) **"redacted: secret tanımlar maskelenir, diğerleri görünür"**
9. (ConfigLoader (T3)) **"reload: değişen değer onChange'e bildirilir"**
10. (ConfigLoader (T3)) **"health: erişilebilir kaynaklar healthy döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/connector.test.ts` (15 test)

1. (parseBscPcsMapping) **"geçerli dosyayı parse eder (üç kind)"**
2. (parseBscPcsMapping) **"bilinmeyen kind → throw"**
3. (parseBscPcsMapping) **"register mapping'de from/ratio eksik → throw"**
4. (parseBscPcsMapping) **"bit mapping'de from.bit eksik → throw"**
5. (parseBscPcsMapping) **"BMS bloğu dışı to → throw"**
6. (parseBscPcsMapping) **"bilinmeyen anahtar → throw (strict)"**
7. (parseBscPcsMapping) **"boş mappings → throw"**
8. (parseBscPcsMapping > BscPcsConnectorAdapter) **"tick: register dönüşümleri yazılır (ratio/offset, yuvarlama; bitişik koşular)"**
9. (parseBscPcsMapping > BscPcsConnectorAdapter) **"değişmeyen değerler ikinci tick'te yazılmaz"**
10. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak değişince intervalMs sonrası yeniden yazılır"**
11. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak hatası kademeli — diğer eşleşmeler devam eder"**
12. (parseBscPcsMapping > BscPcsConnectorAdapter) **"yazım hatası → link 0 + fail sayacı; sonraki tick yeniden bağlanır"**
13. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak yoksa yazım yapılmaz ve kaynak durumu 2 olur"**
14. (parseBscPcsMapping > BscPcsConnectorAdapter) **"bit eşlemesi hedef kelimenin diğer bitlerini bozmaz"**
15. (parseBscPcsMapping > BscPcsConnectorAdapter) **"yazma girişimi yok sayılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/source-reader.test.ts` (4 test)

1. (TcpSourceReader) **"tek register'ı TCP'den okur"**
2. (TcpSourceReader) **"size>1 kelimeleri big-endian birleştirir"**
3. (TcpSourceReader) **"bilinmeyen deviceId → throw"**
4. (TcpSourceReader) **"combineWords signed işaretleme"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/tcp-target.test.ts` (4 test)

1. (TcpBmsTarget) **"BMS-yüzü bridge'e FC 0x10 yazar; simülatör deposu güncellenir"**
2. (TcpBmsTarget) **"sunucu kapalıyken connect throw eder"**
3. (TcpBmsTarget) **"close sonrası yeniden connect + yazım çalışır (retry deseni)"**
4. (TcpBmsTarget) **"BMS bloğu dışına yazım → Modbus exception throw"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc/bsc-simulator.test.ts` (7 test)

1. (BSCSimulator (T4)) **"otomatik init: 6 tick sonrası NORMAL duruma geçer"**
2. (BSCSimulator (T4)) **"START komutu → charge status bitleri (BSC_INFO 30037)"**
3. (BSCSimulator (T4)) **"DISCHARGE komutu → discharge status bitleri (BSC_INFO 30037)"**
4. (BSCSimulator (T4)) **"EMERGENCY komutu durumu EMERGENCY'ye geçirir"**
5. (BSCSimulator (T4)) **"deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01)"**
6. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5)) **"şarjda SOC %97'yi aşamaz (clamp)"**
7. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5)) **"deşarjda SOC %3,5'in altına inemez (clamp)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/cb/cb.test.ts` (9 test)

1. (CbSimulator (DC Şalter — K2) > başlangıç durumu) **"kapalı başlar: Is Closed = true, Is Open = false"**
2. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"OPEN coil → şalter açılır (Is Open = true)"**
3. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"CLOSE coil → şalter kapanır (Is Closed = true)"**
4. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"writeCoil false değerini yok sayar"**
5. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"açıkken aç, kapalıyken kapat — konum değişmez (idempotent)"**
6. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"input register okumaları 0 döner (trip/akım/sıcaklık YOK)"**
7. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"holding register okumaları 0 döner (eşikler YOK)"**
8. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"RESET coil'i yok sayılır (trip semantiği kalktı)"**
9. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"bilinmeyen discrete input false döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/control-panel-io/control-panel-io.test.ts` (13 test)

1. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state) **"kapılar kapalı, ışıklar sönük başlar"**
2. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state) **"FSS sağlıklı başlar: System OK=true, Fault/Discharged/2nd=false"**
3. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API)) **"setDoorState batarya kapısını açar"**
4. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API)) **"setDoorState panel kapısını açar"**
5. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"battery light AÇ → coil true, read-back yansır"**
6. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"battery light KAPAT → coil false"**
7. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"panel light bağımsız yönetilir"**
8. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState fault → Fault=true, System OK=false"**
9. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState discharged → Discharged=true, System OK=false"**
10. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState secondStage → 2nd Stage=true"**
11. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState temizlenince System OK geri döner"**
12. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI) > okuma sınırları) **"bilinmeyen DI adresi false döner"**
13. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI) > okuma sınırları) **"bilinmeyen coil adresi yazılmaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/dc-meter/dc-meter.test.ts` (12 test)

1. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Voltage 750.0 V — FLOAT32 BE kelime çifti"**
2. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Current 100.0 A — FLOAT32 BE kelime çifti"**
3. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Power 75.0 kW — FLOAT32 BE kelime çifti"**
4. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"Alarm Word 0 (normal çalışma)"**
5. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"setMeasurements voltage 1600 → eşik üstü değer okunur"**
6. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"yalnızca verilen alanlar değişir — diğerleri nominal kalır"**
7. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"current/power ayrı ayrı enjekte edilebilir (1680 A / 1784 kW senaryoları)"**
8. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"alarm word ham değer olarak enjekte edilebilir"**
9. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları) **"bilinmeyen adres 0 döner"**
10. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"readInputRegisters ardışık kelimeler döner (float çifti)"**
11. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"holding register 0 döner — komut YOKTUR"**
12. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"coil/discrete okumaları boş — I/O YOKTUR"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/dc-output/dc-output.test.ts` (10 test)

1. (DcOutputSimulator > initial state) **"has default voltage and discrete inputs"**
2. (DcOutputSimulator > initial state > on/off via coils) **"handles coil toggling"**
3. (DcOutputSimulator > initial state > on/off via coils) **"on/off cycle works"**
4. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift) **"voltage drifts toward setpoint when on"**
5. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift) **"voltage decays when off"**
6. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault) **"triggers fault when voltage exceeds ovThreshold * 10"**
7. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter) **"accumulates energy when output is on"**
8. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature) **"drifts toward target when on"**
9. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature > setpoints via holding registers) **"reads back written setpoints"**
10. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature > setpoints via holding registers) **"can change setpoints at runtime"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/demo-mv-station/demo-mv-simulator.test.ts` (5 test)

1. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"başlangıç: kesiciler kapalı, topraklar açık (AK-9.1)"**
2. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"kesici kapalıyken toprak kapanmaz (AK-9.2)"**
3. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"kesici açıkken toprak kapanır, sonra kesici kapanmaz"**
4. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"H01 toprak ayırıcısı her zaman kilitli"**
5. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"toprak açma serbest"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/host-connector-target.test.ts` (3 test)

1. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"env hedefi uygulanır (mevcut davranış)"**
2. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"connector.sim.target env'i EZER (per-connector port)"**
3. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"ikisi de tanımsızsa dosya hedefi korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/host.test.ts` (5 test)

1. (SimulatorHost — UC-3) **"AK-3.1 — yalnız simulator config'ler için sunucu açar; TCP okunur"**
2. (SimulatorHost — UC-3) **"AK-3.2 — deviceId→port indeksi kurulur"**
3. (SimulatorHost — UC-3) **"edge — bilinmeyen simülatör tipi fail-fast"**
4. (SimulatorHost — UC-3) **"edge — port çakışması fail-fast (kısmen açılanlar kapanır)"**
5. (SimulatorHost — UC-3) **"edge — stopAll idempotent"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/hvac/hvac.test.ts` (11 test)

1. (HvacSimulator > initial state) **"starts in standby"**
2. (HvacSimulator > initial state) **"has default temperature"**
3. (HvacSimulator > initial state > remote on/off) **"turns on when remoteOn is set"**
4. (HvacSimulator > initial state > remote on/off) **"turns off when remoteOn is cleared"**
5. (HvacSimulator > initial state > remote on/off > cooling mode) **"cools when temperature is above coolingSetpoint + deadband"**
6. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode) **"produces heat when remote is on with high setpoint"**
7. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms) **"has alarm registers that are readable"**
8. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset) **"resets alarm state"**
9. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift) **"changes temperature over time when running"**
10. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds) **"reports fan speeds when running"**
11. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds) **"reports fan speed values"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/imd/imd.test.ts` (10 test)

1. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"izolasyon direnci ~1 MΩ (Ω cinsinden UInt32 BE)"**
2. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Insulation Alarm 0 (OK)"**
3. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Insulation Prewarning 0 (OK)"**
4. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Device Error 0 (hata yok)"**
5. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(true) → Alarm 4 (Warning), direnç eşik altına düşer"**
6. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(true) → Prewarning 4 (Warning)"**
7. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(false) → Alarm 0'a döner, direnç sağlıklı seviyeye"**
8. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error)) **"setDeviceError(1) → Device Error register'ı kod taşır"**
9. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error)) **"setDeviceError(0) → temizlenir"**
10. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları) **"bilinmeyen adres 0 döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/server/modbus-server-bridge.test.ts` (13 test)

1. (ModbusServerBridge — UC-1) **"AK-1.1 — FC 03/04/01/02 adapter'dan anlık değer döner"**
2. (ModbusServerBridge — UC-1) **"AK-1.1 — çoklu holding okuma sıralı değer döner"**
3. (ModbusServerBridge — UC-1) **"AK-1.2 — korunan holding aralığına yazım 0x02 döner, adapter'a GİTMEZ"**
4. (ModbusServerBridge — UC-1) **"AK-1.2 — korunmayan holding adresine yazım adapter'a gider"**
5. (ModbusServerBridge — UC-1) **"AK-1.2 — çoklu holding yazımı korunan aralıkla kesişirse reddedilir"**
6. (ModbusServerBridge — UC-1) **"AK-1.2 — coil koruması korunan coil adresine yazımı reddeder"**
7. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected dışı holding okuma 0x02, korunmayan adres okunur"**
8. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected ranges yoksa tüm holding tablosu korunur"**
9. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected coil tablosunda da okumayı reddeder"**
10. (ModbusServerBridge — UC-1) **"AK-1.3 — adapter hatası (aralık dışı) exception döner, server ayakta kalır"**
11. (ModbusServerBridge — UC-1) **"yazma — tek register/çoklu register/coil adapter'a iletilir (FC 06/10/05/0F)"**
12. (ModbusServerBridge — UC-1) **"edge — port doğrulaması: port<=0 throw eder"**
13. (ModbusServerBridge — UC-1) **"edge — stop() idempotent; start/stop/start yeniden açılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/server/simulator-server.test.ts` (3 test)

1. (SimulatorServer — UC-2 self-host) **"AK-2.1 — network config ile start() sonrası TCP'den okuma"**
2. (SimulatorServer — UC-2 self-host) **"AK-2.2 — stop idempotent; start sonrası yeniden açılır"**
3. (SimulatorServer — UC-2 self-host) **"network yoksa start() no-op'tur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/wattox-pcs/bms-face.test.ts` (5 test)

1. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 03 okuması anlık değeri döner"**
2. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 06 yazımı simülatör deposuna uygulanır"**
3. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 10 çoklu yazım uygulanır"**
4. (Wattox BMS yüzü (ModbusServerBridge)) **"AK-2.3 — BMS bloğu DIŞI yazım 0x02 (767 ve 791)"**
5. (Wattox BMS yüzü (ModbusServerBridge)) **"AK-2.4 — BMS bloğu DIŞI okuma 0x02"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/wattox-pcs/wattox-pcs.test.ts` (17 test)

1. (WattoxPcsSimulator) **"ilk değerler: nominal (Stop, 50 Hz, anma güç, şebeke voltajı)"**
2. (WattoxPcsSimulator) **"start komutu: Stop → Standby; komut register'ı yazılanı tutar"**
3. (WattoxPcsSimulator) **"negatif setpoint → Charging; grid aktif güç birebir setpoint (şarj negatif)"**
4. (WattoxPcsSimulator) **"pozitif setpoint → Discharging"**
5. (WattoxPcsSimulator) **"sıfır setpoint → Standby (sıfır güç)"**
6. (WattoxPcsSimulator) **"stop komutu: Stop + setpoint sıfırlanır"**
7. (WattoxPcsSimulator) **"standby komutu: herhangi bir işletme durumundan Standby"**
8. (WattoxPcsSimulator) **"fault set → fault durumu + Fault; reset → temiz + Standby"**
9. (WattoxPcsSimulator) **"alarm word 3 bit9 (islanding) → alarm durumu 1"**
10. (WattoxPcsSimulator) **"fault word adresleri D01-D10 sıralı okunur"**
11. (WattoxPcsSimulator) **"E-stop bitleri: local/remote/BMS"**
12. (WattoxPcsSimulator) **"EMS yüzü BMS bloğunu değiştiremez (RO); setBmsRegister yazar"**
13. (WattoxPcsSimulator) **"BMS bloğu dışına setBmsRegister reddedilir (throw)"**
14. (WattoxPcsSimulator) **"komut kaynağı register'ı yazılabilir (EMS=1)"**
15. (WattoxPcsSimulator) **"tick: güç setpoint'e yakınsar (anında uygulama — tick kararlı kalır)"**
16. (WattoxPcsSimulator) **"BMS varsayılanları: SOC %50.0, pack voltaj 1500.0 V"**
17. (WattoxPcsSimulator) **"çoklu register okuma (FC 0x03 aralığı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/config.test.ts` (5 test)

1. (LoggerConfig signing key (T0.5) > loadSigningKey) **"dosyadan anahtar materyalini okur ve trim'ler"**
2. (LoggerConfig signing key (T0.5) > loadSigningKey) **"dosya yoksa fırlatır"**
3. (LoggerConfig signing key (T0.5) > loadSigningKey > resolveSigningKey) **"env override kazanır — dosyaya bakılmaz"**
4. (LoggerConfig signing key (T0.5) > loadSigningKey > resolveSigningKey) **"boş env override yok sayılır — dosya kullanılır"**
5. (LoggerConfig signing key (T0.5) > loadSigningKey > resolveSigningKey) **"dosya yoksa dev fallback + uyarı"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/pipeline.test.ts` (22 test)

1. (pipeline (T0.3) > redactValue) **"hassas anahtar değerini REDACTED yapar"**
2. (pipeline (T0.3) > redactValue) **"büyük/küçük harf duyarsız eşleşir"**
3. (pipeline (T0.3) > redactValue) **"iç içe nesnelerde de redakte eder"**
4. (pipeline (T0.3) > redactValue) **"dizilerdeki nesneleri de redakte eder"**
5. (pipeline (T0.3) > redactValue) **"anahtar adı kısmi içeriyorsa eşleşir (api_key, apiKey)"**
6. (pipeline (T0.3) > redactValue) **"hassas olmayan değerler dokunulmaz"**
7. (pipeline (T0.3) > redactValue) **"ilkel değerler aynen döner"**
8. (pipeline (T0.3) > redactValue > redactEvent) **"context'i redakte eder, diğer alanları korur"**
9. (pipeline (T0.3) > redactValue > redactEvent) **"context yoksa dokunmadan döner"**
10. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent) **"eksik alanları doldurur"**
11. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent) **"girdideki değerleri ezmez"**
12. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent) **"ts girdide varsa korunur"**
13. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"signature 64 hex karakterdir"**
14. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"deterministik — aynı zincir + girdi = aynı imza"**
15. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"nextState zinciri ilerletir"**
16. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"ikinci olayın prevHash'i ilk imzadır (zincir)"**
17. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"verifySignature geçerli event'i kabul eder"**
18. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"verifySignature kurcalanmış message'ı reddeder"**
19. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"verifySignature yanlış anahtarı reddeder"**
20. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature) **"verifySignature kurcalanmış seq'i reddeder"**
21. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature > canonicalize) **"context anahtar sırasından bağımsızdır"**
22. (pipeline (T0.3) > redactValue > redactEvent > enrichEvent > signEvent + nextState + verifySignature > canonicalize) **"dizi içeren context'i serileştirir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/alert-notifier.test.ts` (5 test)

1. (AlertNotifier (T0.4)) **"ilk olay iletilir"**
2. (AlertNotifier (T0.4)) **"aynı eventCode cooldown içinde bastırılır"**
3. (AlertNotifier (T0.4)) **"farklı eventCode'lar birbirini engellemez"**
4. (AlertNotifier (T0.4)) **"cooldown dolunca aynı kod yeniden iletilir"**
5. (AlertNotifier (T0.4)) **"sink hatası yukarı fırlatılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/console-sink.test.ts` (4 test)

1. (ConsoleSink (T0.4)) **"name() 'console' döner"**
2. (ConsoleSink (T0.4)) **"seviyeleri doğru console metoduna eşler"**
3. (ConsoleSink (T0.4)) **"JSON satırı olarak yazar (tamper alanlarıyla)"**
4. (ConsoleSink (T0.4)) **"close() hata fırlatmaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/file-sink.test.ts` (4 test)

1. (FileSink (T0.4)) **"name() 'file' döner"**
2. (FileSink (T0.4)) **"olayları satır satır append eder"**
3. (FileSink (T0.4)) **"close() sonrası write() reddedilir"**
4. (FileSink (T0.4)) **"boş dizi yazılmaz (dosya açılmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/http-sms-notifier.test.ts` (3 test)

1. (HttpSmsNotifier (T6.7)) **"her telefon için şablonlu ayrı POST atar"**
2. (HttpSmsNotifier (T6.7)) **"hata fırlatılır"**
3. (HttpSmsNotifier (T6.7)) **"close sonrası write fırlatır; close idempotent"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/http-webhook-sink.test.ts` (5 test)

1. (HttpWebhookSink (T6.2)) **"JSON batch + HMAC imza başlığı ile POST eder"**
2. (HttpWebhookSink (T6.2)) **"secret yoksa imza başlığı gönderilmez"**
3. (HttpWebhookSink (T6.2)) **"5xx → retries kadar dener, tükenince fırlatır"**
4. (HttpWebhookSink (T6.2)) **"2xx sonrası retry YOK"**
5. (HttpWebhookSink (T6.2)) **"close sonrası write fırlatır; close idempotent"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/smtp-notifier.test.ts` (3 test)

1. (SmtpNotifier (T6.7)) **"olayları tek mailde toplar (konu + JSON gövde)"**
2. (SmtpNotifier (T6.7)) **"close idempotent; kapandıktan sonra write fırlatır"**
3. (SmtpNotifier (T6.7)) **"SMTP hatası fırlatılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/syslog-sink.test.ts` (4 test)

1. (SyslogSink — RFC 5424 frame (T6.2)) **"PRI severity eşlemesi + zorunlu alanlar"**
2. (SyslogSink — RFC 5424 frame (T6.2)) **"warn(4) → 108, info(6) → 110"**
3. (SyslogSink — RFC 5424 frame (T6.2) > SyslogSink — UDP transport (T6.2)) **"her olay ayrı datagram olarak gönderilir"**
4. (SyslogSink — RFC 5424 frame (T6.2) > SyslogSink — UDP transport (T6.2)) **"close idempotent; kapandıktan sonra write fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/sinks/timescale-sink.test.ts` (6 test)

1. (TimescaleSink (T0.4)) **"name() 'timescale' döner"**
2. (TimescaleSink (T0.4)) **"çok satırlı tek INSERT üretir — kolon sayısı 12, parametre 12 dizi"**
3. (TimescaleSink (T0.4)) **"boş batch no-op"**
4. (TimescaleSink (T0.4)) **"opsiyonel alanlar eksikse NULL ile yazılır"**
5. (TimescaleSink (T0.4)) **"executor hatası fırlatılır"**
6. (TimescaleSink (T0.4)) **"close() hata fırlatmaz (bağlantı executor sahibinde)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/tamper-logger-alerts.test.ts` (5 test)

1. (TamperLogger — alertRules (T6.7)) **"eşleşen eventCode cooldown'lu notifier'a iletilir"**
2. (TamperLogger — alertRules (T6.7)) **"eşleşmeyen eventCode iletilmez"**
3. (TamperLogger — alertRules (T6.7)) **"cooldown: aynı eventCode kısa sürede tek bildirim"**
4. (TamperLogger — alertRules (T6.7)) **"alert hatası audit fail-closed zincirini bozmaz"**
5. (TamperLogger — alertRules (T6.7)) **"close alert sink'lerini kapatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/tamper-logger.test.ts` (21 test)

1. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)) **"validator reddederse log() fırlatır (fail-closed) — olay sink'e GİTMEZ"**
2. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)) **"validator kabul ederse normal akış işler"**
3. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)) **"validator verilmezse her string kabul edilir"**
4. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış) **"app olayı batch dolar dolmaz sink'e imzalı gider"**
5. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış) **"interval flush — batch dolmadan da yazılır"**
6. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış) **"context redakte edilir (password görünmez)"**
7. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış) **"correlationId yoksa üretilir"**
8. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security)) **"audit olayı batch'i beklemeden anında yazılır"**
9. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security)) **"security olayı sink başarısızsa log() reddeder"**
10. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security)) **"audit olayı sink başarısızsa log() reddeder"**
11. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası) **"error seviyesi sink başarısızsa drop + sayaç + health degraded"**
12. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası) **"debug/info sink başarısızsa drop + sayaç, health sağlıklı kalır"**
13. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app)) **"eşik altı app olayı sessizce düşer"**
14. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app)) **"eşik üstü yazılır"**
15. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app)) **"audit/security seviye filtresine takılmaz"**
16. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer) **"son işlenmiş olayları tutar"**
17. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer) **"limit parametresi ile daraltılır"**
18. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer > close()) **"kalan batch'i flush eder ve sink'leri kapatır"**
19. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer > close()) **"sonrasında log() yazmaz"**
20. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer > close() > constructor doğrulaması) **"boş sinks kabul edilmez"**
21. (TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu) > TamperLogger (T0.3) > temel akış > fail-closed (audit/security) > app kategorisi drop politikası > seviye filtresi (yalnızca app) > ring buffer > close() > constructor doğrulaması) **"boş signingKey kabul edilmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/types.test.ts` (6 test)

1. (tamper-logger tip sözleşmesi) **"LogLevel birliği 5 seviyeden oluşur"**
2. (tamper-logger tip sözleşmesi) **"LogCategory birliği 3 kategoriden oluşur"**
3. (tamper-logger tip sözleşmesi) **"isLogLevel geçerli/geçersiz değerleri ayırır"**
4. (tamper-logger tip sözleşmesi) **"isLogCategory geçerli/geçersiz değerleri ayırır"**
5. (tamper-logger tip sözleşmesi) **"LogEventInput zorunlu alanları taşır; zincir alanları yoktur"**
6. (tamper-logger tip sözleşmesi) **"LogEvent çıktısı zincir alanlarını zorunlu taşır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/tamper-logger/src/verify-chain.test.ts` (11 test)

1. (verifyChain (T0.9) @nis2-security) **"boş liste geçerlidir (0 olay, 0 segment)"**
2. (verifyChain (T0.9) @nis2-security) **"tek genesis olayı geçerlidir"**
3. (verifyChain (T0.9) @nis2-security) **"3 olaylık zincir geçerlidir"**
4. (verifyChain (T0.9) @nis2-security) **"aradan olay silinirse missing_event tespit edilir"**
5. (verifyChain (T0.9) @nis2-security) **"kurcalanmış içerik signature_mismatch üretir"**
6. (verifyChain (T0.9) @nis2-security) **"yanlış anahtar signature_mismatch üretir"**
7. (verifyChain (T0.9) @nis2-security) **"restart segmenti (yeni genesis zinciri) geçerlidir — 2 segment"**
8. (verifyChain (T0.9) @nis2-security) **"karışık dosya sırası missing_event üretir (write zinciri sırayı garanti eder)"**
9. (verifyChain (T0.9) @nis2-security) **"seq atlaması (silinen satır, eşleşen hash) missing_event üretir"**
10. (verifyChain (T0.9) @nis2-security) **"yinelenen seq out_of_order ihlali üretir"**
11. (verifyChain (T0.9) @nis2-security) **"başlangıç prevHash'i genesis değilse missing_event üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/colors/tokens.test.ts` (8 test)

1. (hexToNumber) **"converts hex string to number"**
2. (hexToNumber) **"handles alpha hex colors"**
3. (hexToNumber) **"handles white"**
4. (hexToNumber) **"handles black"**
5. (hexToNumber > COLORS tokens) **"all status tokens are valid hex"**
6. (hexToNumber > COLORS tokens) **"all background tokens are valid hex"**
7. (hexToNumber > COLORS tokens) **"all text tokens are valid hex"**
8. (hexToNumber > COLORS tokens) **"no two tokens share the same value for common groups"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/colors/tokensLight.test.ts` (4 test)

1. (light tokens (nova paleti)) **"alarm token'ı nova light değerini taşır"**
2. (light tokens (nova paleti)) **"tüm token'lar için sayısal karşılık üretilir"**
3. (light tokens (nova paleti) > hexToRgbTriple) **"hex'i CSS üçlüsüne çevirir"**
4. (light tokens (nova paleti) > hexToRgbTriple) **"geçersiz hex'te hata fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/FieldCard/FieldCard.test.tsx` (3 test)

1. (FieldCard @ui) **"saha adını ve metrikleri gösterir"**
2. (FieldCard @ui) **"durum etiketini çevirir (online → Çevrimiçi)"**
3. (FieldCard @ui) **"tıklamada onClick çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/FieldMap/FieldMap.test.tsx` (7 test)

1. (FieldMap @ui) **"her saha için marker render eder"**
2. (FieldMap @ui) **"popup saha kartını gösterir (FieldCard deseni — ad/durum/değerler)"**
3. (FieldMap @ui) **"detay butonu onOpenDetail(fieldId) çağırır"**
4. (FieldMap @ui) **"onOpenDetail verilmezse detay butonu render edilmez (yalnız kart kalır)"**
5. (FieldMap @ui) **"boş olmayan saha listesinde fitBounds çağrılır"**
6. (FieldMap @ui) **"tip glifi status renkli daire üstüne işlenir (wind/hydro + renkler)"**
7. (FieldMap @ui) **"tip verilmezse general glifi kullanılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/LogTerminal/LogTerminal.test.tsx` (5 test)

1. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"alarm satırında kutucuk render edilir"**
2. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolved=false kutucuk boş ve tıklanınca resolveAlarm çağrılır"**
3. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolved=true kutucuk işaretli + disabled + çözen gösterilir"**
4. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolveAlarm yoksa kutucuk disabled (saf UI kullanımı)"**
5. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"alarm'sız satırda kutucuk YOKTUR"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/RackCard/RackCard.test.tsx` (5 test)

1. (RackCard (T4)) **"temel metrikleri gösterir (SoC/SoH/Güç/Voltaj)"**
2. (RackCard (T4)) **"SoC % değeri 0-100 arasına kırpılır"**
3. (RackCard (T4)) **"onDetailClick verilirse Detay butonu render edilir ve çağrılır"**
4. (RackCard (T4)) **"onDetailClick verilmezse buton render edilmez"**
5. (RackCard (T4)) **"offline durumda offline etiketi görünür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/Sparkline/Sparkline.test.tsx` (7 test)

1. (Sparkline @ui-chart) **"boş data'da uPlot kurulmaz"**
2. (Sparkline @ui-chart) **"veriyle uPlot kurulur ve sparkline opts'ları taşır"**
3. (Sparkline @ui-chart) **"fill fonksiyonu dikey CanvasGradient döner (üst 0.35 → alt 0.02)"**
4. (Sparkline @ui-chart) **"data değişince yeni instance kurulmaz — setData çağrılır"**
5. (Sparkline @ui-chart) **"girdi mutate edilmez ve veri zamana göre sıralanır"**
6. (Sparkline @ui-chart) **"geçersiz tarihli ve sayısal olmayan noktalar seriden atlanır"**
7. (Sparkline @ui-chart) **"unmount'ta destroy çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/core/TelemetryGauge/TelemetryGauge.test.tsx` (5 test)

1. (TelemetryGauge tema) **"circular: success temasında arc, success paletinin mid tonudur"**
2. (TelemetryGauge tema) **"circular: varsayılan tema info'dur (mevcut davranış)"**
3. (TelemetryGauge tema) **"circular: %80 ve üzeri koyu tonu kullanır"**
4. (TelemetryGauge tema) **"linear: varsayılan bar rengi tema mid tonudur"**
5. (TelemetryGauge tema) **"linear: açık color prop'u temayı ezer"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/core/TranslationProvider/TranslationProvider.test.tsx` (5 test)

1. (TranslationProvider (T4)) **"varsayılan dilde çeviri + interpolasyon"**
2. (TranslationProvider (T4)) **"eksik anahtar anahtarın kendisini döner (fallback)"**
3. (TranslationProvider (T4)) **"extraKeys uygulama anahtarları UI sözlüğünü override eder"**
4. (TranslationProvider (T4)) **"setLocale dili değiştirir"**
5. (TranslationProvider (T4)) **"Provider dışında useTranslation hata fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/hooks/useTelemetryStream.test.ts` (4 test)

1. (useTelemetryStream — çok-abone) **"mount'ta addDevices + connect; unmount'ta removeDevices (disconnect DEĞİL)"**
2. (useTelemetryStream — çok-abone) **"observer verisi hook çıktısına yansır"**
3. (useTelemetryStream — çok-abone) **"abone OLUNMAYAN cihazın verisi buffer'a alınmaz (filtreleme)"**
4. (useTelemetryStream — çok-abone) **"names verilirse addDevices'e iletilir (sunucu filtresi)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/icons/demo-icons.test.tsx` (3 test)

1. (NOVA demo ikonları (T-32 / AK-7.2)) **"SCADA_ICONS'a nova* anahtarlarıyla kaydedilir"**
2. (NOVA demo ikonları (T-32 / AK-7.2)) **"tam 19 nova ikonu içerir"**
3. (NOVA demo ikonları (T-32 / AK-7.2)) **"mevcut Tabler ikonları korunur (Open-Closed)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/logging/client-logger.test.ts` (10 test)

1. (ClientLogger (T0.8)) **"batchSize dolunca tek send ile flush eder"**
2. (ClientLogger (T0.8)) **"interval geçince flush eder"**
3. (ClientLogger (T0.8)) **"send başarısızsa retry eder — aynı olaylar tekrar gönderilir"**
4. (ClientLogger (T0.8)) **"maxRetries aşılınca drop + sayaç"**
5. (ClientLogger (T0.8)) **"pending() bekleyen olay sayısını döner"**
6. (ClientLogger (T0.8)) **"close() kalan batch'i flush eder ve timer durur"**
7. (ClientLogger (T0.8)) **"boş transport kabul edilmez"**
8. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"window.onerror olayını logger'a iletir"**
9. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"unhandledrejection'ı logger'a iletir"**
10. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"temizleme fonksiyonu listener'ları kaldırır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoManeuverWizard.test.tsx` (3 test)

1. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"hidden kaydı göstermez (AK-5.1)"**
2. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"onay akışıyla scope + params gönderir (AK-5.3/5.4)"**
3. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"kapsam temizlenince gönderim devre dışı (edge)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/nova-components.test.tsx` (4 test)

1. (DemoCellDialog (FR-4.4 / AK-4.4)) **"ölçü hücresinde V/Hz/I gösterir"**
2. (DemoCellDialog (FR-4.4 / AK-4.4)) **"toprak kapalıyken kesici kapatmayı kilitler (AK-4.5)"**
3. (DemoCellDialog (FR-4.4 / AK-4.4)) **"geçerli komutta onCommand'ı çağırır"**
4. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3)) **"2 PCS ve 2 banka tablosu gösterir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/nova-mimic.test.ts` (7 test)

1. (nova-mimic saf yardımcılar (T-14)) **"computeEnergization fiderleri anahtarlardan hesaplar"**
2. (nova-mimic saf yardımcılar (T-14)) **"bankSeverity eşiklerini uygular"**
3. (nova-mimic saf yardımcılar (T-14)) **"tempFill sıcak/soğuk renk üretir"**
4. (nova-mimic saf yardımcılar (T-14)) **"defaultUnitStatus arıza durumunu bildirir"**
5. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars) **"token'lardan CSS değişkeni üretir"**
6. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars) **"bir elemana uygular"**
7. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1)) **"6 ünite çizer ve destroy temizler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/HttpPollingTransport.test.ts` (6 test)

1. (HttpPollingTransport (T2)) **"connect: ilk fetch + interval kurulur; state connected yayınlanır"**
2. (HttpPollingTransport (T2)) **"başarılı fetch onData'yı besler (telemetries fallback data)"**
3. (HttpPollingTransport (T2)) **"HTTP 500 → onError; state BOZULMAZ (kademeli bozulma)"**
4. (HttpPollingTransport (T2)) **"getToken Authorization header olarak eklenir"**
5. (HttpPollingTransport (T2)) **"disconnect: interval durur + state idle"**
6. (HttpPollingTransport (T2)) **"subscribe geri dönüşü observer'ı çıkarır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/MockTransport.test.ts` (8 test)

1. (MockTransport) **"starts in idle state"**
2. (MockTransport) **"transitions to connected on connect()"**
3. (MockTransport) **"generates data for each definition per tick"**
4. (MockTransport) **"generates values within min/max range"**
5. (MockTransport) **"stops generating after disconnect"**
6. (MockTransport) **"unsubscribe stops receiving data"**
7. (MockTransport) **"multiple observers all receive data"**
8. (MockTransport) **"respects custom intervalMs"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/WebSocketTransport.test.ts` (13 test)

1. (WebSocketTransport (T2)) **"connect → open: connected + deviceId başına subscribe mesajı"**
2. (WebSocketTransport (T2)) **"token varsa query'ye eklenir"**
3. (WebSocketTransport (T2)) **"initial ve telemetry mesajları onData'yı besler"**
4. (WebSocketTransport (T2)) **"malform mesaj onError üretir (bağlantı kopmaz)"**
5. (WebSocketTransport (T2)) **"açılmadan kapanma → error + rejected; reconnect YOK"**
6. (WebSocketTransport (T2)) **"açıldıktan sonra kapanma → üstel backoff reconnect (tavan 30 sn)"**
7. (WebSocketTransport (T2)) **"disconnect: cancelled — kapanma sonrası reconnect OLMAZ, state idle"**
8. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"addDevices açık sokette subscribe gönderir (yeni soket açmaz)"**
9. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"aynı deviceId referans sayılır — bir abone çıkınca unsubscribe GİTMEZ"**
10. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"connect idempotent: açık sokette ikinci connect yeni soket açmaz"**
11. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"reconnect sonrası tüm abonelikler yeniden gönderilir"**
12. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu) > WebSocketTransport — names filtresi (panel spec)) **"addDevices names verilirse subscribe mesajına ekler"**
13. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu) > WebSocketTransport — names filtresi (panel spec)) **"reconnect sonrası names korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/transport-contract.test.ts` (7 test)

1. (ITelemetryTransport contract) **"starts idle and transitions to connected"**
2. (ITelemetryTransport contract) **"transitions back to idle on disconnect"**
3. (ITelemetryTransport contract) **"notifies observer of connection state changes"**
4. (ITelemetryTransport contract) **"unsubscribe stops notifications"**
5. (ITelemetryTransport contract) **"onData callback delivers telemetry batches"**
6. (ITelemetryTransport contract) **"onError callback receives errors from transport"**
7. (ITelemetryTransport contract) **"multiple observers all receive notifications"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/channel/ws-socket-client.test.ts` (5 test)

1. (WsSocketClient (T2.1c)) **"send/ping/close raw'a delege edilir"**
2. (WsSocketClient (T2.1c)) **"message olayı string'e çevrilir"**
3. (WsSocketClient (T2.1c)) **"open/close/error/pong olayları birebir kablolanır"**
4. (WsSocketClient (T2.1c)) **"unexpected-response → statusCode (yoksa 0)"**
5. (WsSocketClient (T2.1c) > WsSocketClientFactory (T2.1c)) **"creator'ı url + headers ile çağırır ve sarar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/client/tunnel-client.test.ts` (25 test)

1. (TunnelClient (T3.2) > HTTP akışı) **"stream-open → ack (durum + başlıklar) → gövde frame'leri + FIN"**
2. (TunnelClient (T3.2) > HTTP akışı) **"yönlendirme: /api/* → web-service, diğer → statik"**
3. (TunnelClient (T3.2) > HTTP akışı) **"backpressure: kredi olmadan gövde gönderilmez, krediyle akar"**
4. (TunnelClient (T3.2) > HTTP akışı) **"POST gövdesi: BINARY frame'ler + FIN → fetch body"**
5. (TunnelClient (T3.2) > HTTP akışı) **"upstream 404 → ack 404"**
6. (TunnelClient (T3.2) > HTTP akışı) **"akış tavanı aşılınca 503 + stream-close"**
7. (TunnelClient (T3.2) > HTTP akışı) **"field stream-close → akış iptal edilir"**
8. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade)) **"upgrade → 101 ack + çift yönlü WS_OP frame'leri"**
9. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade)) **"loopback WS kapanınca stream-close gönderilir"**
10. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade)) **"boşta kalan akış idle timeout ile kapatılır"**
11. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"bilinmeyen streamId'li window/close/binary yok sayılır"**
12. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"kredi bekleyen akış stream-close ile temiz kapanır"**
13. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"ack sonrası kredi beklerken kapanma → çökme/çıkış frame'i yok"**
14. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"gövde ortasında kapanma → akış durur (abort)"**
15. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"upstream erişilemez → ack 502 + stream-close"**
16. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"gövdesiz yanıt (204) → yalnızca FIN frame"**
17. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"istek gövdesi tavan aşımı → RST + stream-close"**
18. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"GET akışında gövde frame'i yok sayılır"**
19. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"upstream gövde ortasında koparsa stream-close fetch-error"**
20. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"WS köprüsü: WS olmayan upstream → stream-close ws-error"**
21. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"WS köprüsü: binary opcode upstream'e binary iletilir"**
22. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"kapanmış akışa gelen WS_OP frame'i yok sayılır"**
23. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"FIN sonrası akış temizlenir — sıradaki stream-open 503 ALMAZ (sızıntı regresyonu)"**
24. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler)) **"gzip basliklari ack'e TASINMAZ (content-encoding/content-length strip)"**
25. (TunnelClient (T3.2) > HTTP akışı > WS köprüsü (upgrade) > kapsama (hata yolları + limitler) > max yaş sweep) **"azami yaş dolan akış max-age ile kapatılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/codec/frame-codec.test.ts` (18 test)

1. (FrameCodec (T3.1) @nis2-security > encode()) **"başlık + payload boyutu = 9 + payload.length"**
2. (FrameCodec (T3.1) @nis2-security > encode()) **"streamId u32 BE olarak yazılır"**
3. (FrameCodec (T3.1) @nis2-security > encode()) **"seq u32 BE olarak yazılır (wrap değerleri dahil)"**
4. (FrameCodec (T3.1) @nis2-security > encode()) **"flags baytı: FIN|RST|WS_OP birleşimi"**
5. (FrameCodec (T3.1) @nis2-security > encode()) **"negatif streamId reddedilir"**
6. (FrameCodec (T3.1) @nis2-security > encode()) **"u32 üstü streamId/seq reddedilir"**
7. (FrameCodec (T3.1) @nis2-security > encode()) **"ondalıklı streamId reddedilir"**
8. (FrameCodec (T3.1) @nis2-security > encode()) **"WS_OP set iken opcode zorunludur"**
9. (FrameCodec (T3.1) @nis2-security > encode()) **"WS_OP yokken opcode verilemez"**
10. (FrameCodec (T3.1) @nis2-security > encode()) **"opcode 4 bit ile sınırlıdır"**
11. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"9 bayttan kısa girdi → Err (throw yok)"**
12. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"boş payload'lı frame decode edilir"**
13. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"WS_OP + opcode geri okunur"**
14. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"bilinmeyen opcode değeri taşınır (ileri uyumluluk)"**
15. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"maxPayload aşımı → Err"**
16. (FrameCodec (T3.1) @nis2-security > encode() > decode()) **"payload tam uzunlukta döner"**
17. (FrameCodec (T3.1) @nis2-security > encode() > decode() > round-trip (fuzz)) **"rastgele 500 frame encode→decode eşitliği"**
18. (FrameCodec (T3.1) @nis2-security > encode() > decode() > round-trip (fuzz)) **"rastgele 1000 bayt akışı decode'da asla throw etmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/connector/reconnect-delay.test.ts` (13 test)

1. (ReconnectDelay (T2.1a) > delayFor()) **"attempt 1 → taban gecikme (1000 ms)"**
2. (ReconnectDelay (T2.1a) > delayFor()) **"üstel büyür: 1→1000, 2→2000, 3→4000, 4→8000"**
3. (ReconnectDelay (T2.1a) > delayFor()) **"60 sn tavanına takılır (attempt 7: 64000 → 60000)"**
4. (ReconnectDelay (T2.1a) > delayFor()) **"tavan üstü attempt'lerde de tavanı korur (attempt 100)"**
5. (ReconnectDelay (T2.1a) > delayFor()) **"jitter'ı ekler (deterministik jitter 0.5 → +500 ms)"**
6. (ReconnectDelay (T2.1a) > delayFor()) **"jitter tavanı ezemez"**
7. (ReconnectDelay (T2.1a) > delayFor()) **"jitter [0,1) dışında ise reddeder"**
8. (ReconnectDelay (T2.1a) > delayFor()) **"attempt 0 ve negatif attempt reddedilir"**
9. (ReconnectDelay (T2.1a) > delayFor()) **"ondalıklı attempt reddedilir"**
10. (ReconnectDelay (T2.1a) > delayFor() > reset()) **"deneme sayacını sıfırlar — sonraki delay yeniden tabandan başlar"**
11. (ReconnectDelay (T2.1a) > delayFor() > reset() > konfigürasyon doğrulaması) **"geçersiz taban (≤0) reddedilir"**
12. (ReconnectDelay (T2.1a) > delayFor() > reset() > konfigürasyon doğrulaması) **"tavan tabandan küçük olamaz"**
13. (ReconnectDelay (T2.1a) > delayFor() > reset() > konfigürasyon doğrulaması) **"negatif jitter açıklığı reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/connector/tunnel-connector.spec.ts` (7 test)

1. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"K2.1: start → connected < 5 sn (gerçek WS, ölçümlü)"**
2. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"heartbeat + telemetry snapshot gerçek WS üzerinden akar"**
3. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"T2.5: register-ack.config aralığı canlı uygular"**
4. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"T2.5: config-update frame'i heartbeat aralığını canlı değiştirir"**
5. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"T2.5: geçersiz config-update eski aralığı korur"**
6. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"WS kopunca backoff → yeniden bağlanır"**
7. (TunnelConnector integration (gerçek WS — T2.5/K2.1)) **"stop() sonrası yeniden bağlanma olmaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/connector/tunnel-connector.test.ts` (53 test)

1. (TunnelConnector (T2.1b) > start() / bağlanma) **"start() → connecting + ilk URL'e Bearer'lı bağlanır"**
2. (TunnelConnector (T2.1b) > start() / bağlanma) **"open sonrası register mesajı gönderir (peerId + peerType + protocolVersion)"**
3. (TunnelConnector (T2.1b) > start() / bağlanma) **"çift start() no-op — ikinci soket açılmaz"**
4. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"ack ok → ilk heartbeat + connected + snapshot push"**
5. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"ack ok → field_connected bilgi logu"**
6. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"heartbeat her 15 sn'de bir gönderilir"**
7. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"telemetri snapshot her 15 sn'de bir push edilir (boş veri push edilmez)"**
8. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"boş snapshot telemetry frame'i üretmez"**
9. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı) **"snapshot hatası bağlantıyı etkilemez (kademeli bozulma)"**
10. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"connected iken WS kapanırsa backoff → 1 sn sonra yeniden bağlanır"**
11. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"kopuş warn logu (ws_connection_lost) üretir"**
12. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"üstel backoff: 1, 2, 4 sn (jitter 0)"**
13. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"başarılı bağlantı deneme sayacını sıfırlar"**
14. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"register timeout (10 sn) → backoff"**
15. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"register-ack rejected → backoff + security logu"**
16. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"401 pre-upgrade → sıradaki URL denenir; tümü reddedilirse backoff"**
17. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma) **"reddedilen soketin geç kapanma olayı durumu bozmaz"**
18. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti)) **"60 sn pong yoksa bağlantı kapatılır + backoff"**
19. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti)) **"pong gelirse bağlantı canlı kalır"**
20. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti)) **"heartbeat gönderiminde ping atılır"**
21. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop()) **"connected iken stop → offline + soket kapanır + yeniden bağlanmaz"**
22. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop()) **"stop sonrası start tekrar bağlanır"**
23. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop()) **"offline durumda stop no-op"**
24. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5)) **"register-ack.config aralıkları değiştirir (heartbeat 5 sn)"**
25. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5)) **"config-update frame'i restart'sız aralık değiştirir"**
26. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5)) **"geçersiz config-update reddedilir — eski aralık korunur"**
27. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5)) **"geçersiz register-ack config'i de reddedilir ama bağlantı kurulur"**
28. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"malform JSON yok sayılır — çökme yok"**
29. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"bilinmeyen mesaj tipi yok sayılır"**
30. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"soket hatası loglanır (close olayı backoff'u yönetir)"**
31. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"error frame'i loglanır"**
32. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"kodsuz error frame'i 'unknown' ile loglanır"**
33. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"register-ack status alanı yoksa 'unknown' ile reddedilir"**
34. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı) **"403 pre-upgrade de security logu üretir"**
35. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması)) **"bayat soketin tüm olayları yok sayılır"**
36. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması)) **"bayat register timeout'u yeni bağlantıyı bozmaz"**
37. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları) **"stop sonrası geç kapanma olayı durumu bozmaz"**
38. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları) **"stop sonrası geç open register göndermez"**
39. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları) **"stop sonrası rejected yeniden bağlanmaz (tek URL)"**
40. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları) **"stop sonrası rejected sıradaki URL'i denemez (çok URL)"**
41. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri) **"snapshot beklerken bağlantı koparsa telemetri gönderilmez"**
42. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri) **"Error olmayan snapshot hatası da loglanır"**
43. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma) **"log çağrıları atlanır — çökme yok"**
44. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"bilinmeyen kontrol mesajı abonelere iletilir"**
45. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"unsubscribe sonrası iletilmez"**
46. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"sendControl JSON text frame gönderir"**
47. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"sendBinary ham binary frame gönderir"**
48. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"gelen binary frame abonelere iletilir"**
49. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3)) **"bağlı değilken sendControl/sendBinary no-op"**
50. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3) > constructor doğrulaması) **"boş URL listesi reddedilir"**
51. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3) > constructor doğrulaması) **"boş token reddedilir"**
52. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3) > constructor doğrulaması) **"boş peerId reddedilir"**
53. (TunnelConnector (T2.1b) > start() / bağlanma > register-ack → connected akışı > backoff / yeniden bağlanma > liveness (yarı-ölü bağlantı tespiti) > stop() > operational config (T2.5) > mesaj sağlamlığı > bayat soket olayları (generation koruması) > stop() yarışları > snapshot yarışı ve hata biçimleri > logger'sız çalışma > tünel kanal kancaları (Faz 3) > constructor doğrulaması) **"pozitif olmayan aralıklar reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/demo/loopback.spec.ts` (5 test)

1. (loopback uçtan uca (paket içi — ContainerProxy'siz)) **"TunnelConnector field'a kaydolur (register-ack → connected)"**
2. (loopback uçtan uca (paket içi — ContainerProxy'siz)) **"open-session → ack + kayıt + audit"**
3. (loopback uçtan uca (paket içi — ContainerProxy'siz)) **"GET / → SPA HTML akar (FIN ile biter)"**
4. (loopback uçtan uca (paket içi — ContainerProxy'siz)) **"GET /api/data/latest → JSON akar (K3.2)"**
5. (loopback uçtan uca (paket içi — ContainerProxy'siz)) **"/ws köprüsü çift yönlü WS_OP mesajı taşır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/protocol/messages.test.ts` (32 test)

1. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION) **"2'dir — sürümlü protokol (v2: peerId+peerType register) (tasarım §12.3)"**
2. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"tam config'i kabul eder"**
3. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"kısmi config'i kabul eder (yalnızca heartbeat)"**
4. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"boş config'i kabul eder (tüm alanlar opsiyonel)"**
5. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"bilinmeyen anahtarları strip eder — ileri uyumluluk"**
6. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"1000 ms altını reddeder"**
7. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"300000 ms üstünü reddeder"**
8. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"ondalıklı değeri reddeder"**
9. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema) **"tip uyuşmazlığını reddeder"**
10. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG) **"heartbeat 15 sn — tasarım §4.3"**
11. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG) **"telemetry 15 sn"**
12. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG) **"dondurulmuştur (immutable)"**
13. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState) **"geçerli durumları tanır"**
14. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState) **"geçersiz durumları reddeder"**
15. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"RegisterMessage alanlarını sabitler"**
16. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"RegisterAckMessage opsiyonel config taşır"**
17. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"HeartbeatMessage ms timestamp taşır"**
18. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"TelemetryMessage TelemetryData dizisi taşır"**
19. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"ConfigUpdateMessage tam config taşır"**
20. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"ErrorMessage kod + mesaj taşır"**
21. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"EventMessage jenerik olay bildirimi taşır (Boss Faz 5)"**
22. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"StreamOpenMessage akış açılışını taşır (§5.2)"**
23. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"StreamOpenMessage upgrade bayrağı WS köprüsü taşır (§5.3)"**
24. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"OpenSessionMessage eşlenmiş konteyner rolü taşır (§5.5)"**
25. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union)) **"OpenSessionAckMessage konteyner JWT + süre taşır"**
26. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri) **"TunnelConnectorState 5 durumludur"**
27. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri) **"TunnelOperationalConfig yalnızca iki opsiyonel alan taşır"**
28. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri) **"PeerConnectionState transport ConnectionState'ından ayrıdır"**
29. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri > operation-execute / operation-result (WS-TUNNEL-KAPASITE §6)) **"operationExecuteSchema: geçerli istek kabul edilir"**
30. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri > operation-execute / operation-result (WS-TUNNEL-KAPASITE §6)) **"operationExecuteSchema: eksik/boş zorunlu alanlar RED"**
31. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri > operation-execute / operation-result (WS-TUNNEL-KAPASITE §6)) **"operationExecuteSchema: bilinmeyen anahtar RED (strict güven sınırı)"**
32. (TunnelConnector sözleşmesi (T2.0) > TUNNEL_PROTOCOL_VERSION > tunnelOperationalConfigSchema > DEFAULT_TUNNEL_OPERATIONAL_CONFIG > isPeerConnectionState > kontrol mesajı tipleri (discriminated union) > durum tipi birlikleri > operation-execute / operation-result (WS-TUNNEL-KAPASITE §6)) **"OperationControlMessage union tipi iki yönü de kapsar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/proxy/session-gateway.test.ts` (10 test)

1. (mapSessionRole (§5.5 — 2026-08-30 birebir)) **"tüm roller aynen taşınır (birebir eşleme)"**
2. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"2026-08-30: guest oturum AÇABİLİR — konteyner rolü guest (birebir)"**
3. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"konteyner bağlı değilse 503 (TransientError)"**
4. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"ikinci açılış eskisini 'replaced' ile kapatır ve yenisini açar (Faz 5)"**
5. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"ack zaman aşımı → 503 (TransientError)"**
6. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"audit hatası → fail-closed (oturum açılmaz, FatalError)"**
7. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"closeSession → session-end frame + audit close + kayıt düşer"**
8. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"sweep süresi dolan oturumu session-end ile kapatır"**
9. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"sessionForPeer acik oturumu konteyner kimligiyle bulur"**
10. (mapSessionRole (§5.5 — 2026-08-30 birebir) > SessionGateway (T3.3)) **"sessionByToken kayıtlı oturumu döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/proxy/tunnel-proxy.test.ts` (24 test)

1. (sessionCookieValue) **"cookie başlığından değeri çözer"**
2. (sessionCookieValue) **"yoksa undefined"**
3. (sessionCookieValue) **"bozuk parçalar atlanır"**
4. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"ack → writeHead + gövde frame'leri + FIN → end"**
5. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"RST → destroy"**
6. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"ack gelmezse (timeout) hiçbir şey yazılmaz"**
7. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"tarayıcı kopması → stream-close"**
8. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"kredi: YARI pencere eşiğinde yeni stream-window gönderilir"**
9. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"kredi DEADLOCK KORUMASI: pencere altı tüketimde bile kredi yenilenir"**
10. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"authenticate: geçersiz cookie → undefined"**
11. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"requestBody → BINARY frame'ler + FIN gönderilir"**
12. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"konteyner stream-close (http) → yanıt destroy edilir"**
13. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"malform binary frame yok sayılır"**
14. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"akış tavanı dolunca stream açılmaz (writeHead yok)"**
15. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"sweep: boşta kalan http akışı kapatılır"**
16. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3)) **"logger varken akış kapanışı security kanalına düşer"**
17. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"101 ack → köprü açılır; WS_OP frame tarayıcıya iletilir"**
18. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"tarayıcı mesajı WS_OP frame'i olarak konteynere gider"**
19. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"konteyner stream-close → tarayıcı kapatılır"**
20. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"ack 101 değilse tarayıcı 1013 ile kapatılır"**
21. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"closeWs → stream-close kontrolü gönderilir"**
22. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"RST frame → tarayıcı 1011 ile kapatılır"**
23. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"binary tarayıcı mesajı Binary opcode taşır"**
24. (sessionCookieValue > isPathAllowed (§5.6) > TunnelProxy HTTP akışı (T3.3) > TunnelProxy WS köprüsü (T3.3)) **"bilinmeyen streamId'ye WS mesajı yok sayılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/session/client-session-server.test.ts` (3 test)

1. (ClientSessionServer (T3.3)) **"open-session → open-session-ack (token + expiresInSec)"**
2. (ClientSessionServer (T3.3)) **"session-end → kayıt düşer"**
3. (ClientSessionServer (T3.3)) **"bilinmeyen mesaj tipleri yok sayılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ws-tunnel/src/session/client-session-store.test.ts` (10 test)

1. (ClientSessionStore (T3.3) > open() / authenticate()) **"open → token doğrulanır, kullanıcı + rol döner"**
2. (ClientSessionStore (T3.3) > open() / authenticate()) **"geçersiz token undefined döner"**
3. (ClientSessionStore (T3.3) > open() / authenticate()) **"tahrifli token (farklı secret) undefined döner"**
4. (ClientSessionStore (T3.3) > open() / authenticate()) **"bilinmeyen sessionId'li geçerli-imza token da reddedilir"**
5. (ClientSessionStore (T3.3) > open() / authenticate() > end()) **"iptal sonrası authenticate undefined döner"**
6. (ClientSessionStore (T3.3) > open() / authenticate() > end() > TTL + idle sweep) **"4 saat TTL dolunca oturum kapanır"**
7. (ClientSessionStore (T3.3) > open() / authenticate() > end() > TTL + idle sweep) **"15 dk idle → oturum kapanır; aktivite süreyi uzatır"**
8. (ClientSessionStore (T3.3) > open() / authenticate() > end() > TTL + idle sweep) **"sweep TTL'den önce oturumu kapatmaz"**
9. (ClientSessionStore (T3.3) > open() / authenticate() > end() > TTL + idle sweep) **"activeCount açık oturum sayısını döner"**
10. (ClientSessionStore (T3.3) > open() / authenticate() > end() > TTL + idle sweep > role eşlemesi passthrough) **"field'da eşlenen konteyner rolü korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/data-service/src/data-service.test.ts` (13 test)

1. (DataService > start()) **"registers WRITE_TELEMETRY worker with onFailed boundary"**
2. (DataService > start() > worker processing) **"writes telemetry to timescale on WRITE_TELEMETRY job"**
3. (DataService > start() > worker processing) **"telemetri akışından system_logs'a YAZIM YOKTUR (Açık 2 kapanışı)"**
4. (DataService > start() > worker processing) **"write hatası → TransientError fırlatılır (retry tetiklenir)"**
5. (DataService > start() > worker processing) **"skips processing when service is stopped"**
6. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11)) **"denemeler tükenince jobId + deviceId'lerle loglanır"**
7. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11)) **"logger yoksa onFailed sessizdir (geriye uyumluluk)"**
8. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop()) **"closes all connections"**
9. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when stopped"**
10. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns true when all services healthy"**
11. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when message queue is unhealthy"**
12. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when timescale is unhealthy"**
13. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false on exception"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/alarm-state-repository.test.ts` (7 test)

1. (AlarmStateRepository (Faz 0 eki)) **"initialize DDL'i oluşturur"**
2. (AlarmStateRepository (Faz 0 eki)) **"activate UPSERT üretir — yeni oluşumda resolved sıfırlanır"**
3. (AlarmStateRepository (Faz 0 eki)) **"deactivate yalnızca aktif satırı kapatır"**
4. (AlarmStateRepository (Faz 0 eki)) **"resolve — aktif satır bulunursa true"**
5. (AlarmStateRepository (Faz 0 eki)) **"resolve — aktif satır yoksa false (409 kaynağı)"**
6. (AlarmStateRepository (Faz 0 eki)) **"resetAll cihazların bayat aktiflerini kapatır"**
7. (AlarmStateRepository (Faz 0 eki)) **"listActive / recentEnded sorguları tabloyu okur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/alarm-transition-detector.test.ts` (16 test)

1. (alarmSamples (kural → örnek)) **"kural telemetri adıyla eşleşir"**
2. (alarmSamples (kural → örnek)) **"value !== 0 → aktif (varsayılan)"**
3. (alarmSamples (kural → örnek)) **"activeLow: value === 0 → aktif"**
4. (alarmSamples (kural → örnek)) **"telemetri üretilmediyse örnek yok (geçiş yok — durum korunur)"**
5. (alarmSamples (kural → örnek)) **"kural yoksa örnek yok"**
6. (alarmSamples (kural → örnek)) **"aynı isimli birden fazla satır OR ile birleşir (rack başına alanlar)"**
7. (alarmSamples (kural → örnek)) **"aynı isimli TÜM satırlar pasifse alarm pasiftir"**
8. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"yükselen kenar → tek set"**
9. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"aktifken tekrar eden okuma sessizdir"**
10. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"düşen kenar → clear"**
11. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"clear sonrası yeni aktif → yeniden tek set"**
12. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"cihazlar birbirinden izoledir"**
13. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"reset cihazın tüm alarm durumlarını unutur"**
14. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"reset yalnızca hedef cihazı etkiler"**
15. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"aynı pollda birden fazla yükselen kenar toplu döner"**
16. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"hiç aktif olmamış alarmda pasif örnek geçiş üretmez (kenar yok)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/config-loader.test.ts` (4 test)

1. (DeviceConfigLoader > constructor) **"throws when configDir is empty"**
2. (DeviceConfigLoader > constructor > parseFile (via public API)) **"throws when directory does not exist"**
3. (DeviceConfigLoader > constructor > parseFile (via public API) > load() — source of truth (kök configs/)) **"tüm cihaz config dosyalarını yükler ve şemadan geçirir"**
4. (DeviceConfigLoader > constructor > parseFile (via public API) > load() — source of truth (kök configs/)) **"service.json yüklenir (global servis konfigürasyonu)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-factory.test.ts` (7 test)

1. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"transport olmayan config varsayılan TCP ile çalışır"**
2. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"rtu transport'lu config cihaz üretir (bağlantı kurmaz)"**
3. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"kind:'simulator' config yine TCP cihaz üretir (simulator dalı YOK)"**
4. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)"**
5. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"canonical verilmeyen telemetride tags.canonical YOKTUR"**
6. (DeviceFactory — transport seçimi (yalnız TCP/RTU) > DeviceFactory — connector device-subset türetimi) **"connector bölümü varsa 2. MODBUS cihazı üretir"**
7. (DeviceFactory — transport seçimi (yalnız TCP/RTU) > DeviceFactory — connector device-subset türetimi) **"connector bölümü yoksa undefined döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-scheduler.test.ts` (6 test)

1. (DeviceScheduler > scheduleRead()) **"creates repeatable job with correct name and interval"**
2. (DeviceScheduler > scheduleRead()) **"uses deviceId in job name"**
3. (DeviceScheduler > scheduleRead() > scheduleManagement()) **"creates management job with default interval"**
4. (DeviceScheduler > scheduleRead() > scheduleManagement()) **"uses configured managementIntervalMs"**
5. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"adds job when telemetry data is provided"**
6. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"skips when telemetry data is empty"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-service.test.ts` (21 test)

1. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"read hatası processor'ı REJECT ETMEZ — poll devam eder"**
2. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"online→offline geçişinde 1× error log + devices.status='offline'"**
3. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"sürekli hata 60 sn içinde yeni log üretmez (spam önleme)"**
4. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"60 sn sonra debug hatırlatma üretir"**
5. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"offline→online geçişinde info log + status='online'"**
6. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"logger yoksa eski davranış korunur (console.warn)"**
7. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"write hatası → audit command_rejected + app modbus_write_failed"**
8. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"başarılı yazma → audit command_executed"**
9. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"audit fail-closed: command_rejected logu başarısızsa job düşer"**
10. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"'positive' sağlanıyorsa → validated: true"**
11. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"ilişki sağlanmıyorsa timeout sonuna kadar poll → validated: false"**
12. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"ilişki dışı string birebir eşitlik olarak kalır"**
13. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz) **"logger varsa request_rejected loglanır, publish yok"**
14. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"yükselen kenar → activate UPSERT + tek device_alarm logu"**
15. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"aktifken tekrar eden okumalar SESSİZDİR (dedup)"**
16. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"düşen kenar → deactivate + device_alarm_cleared logu"**
17. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"çözülme sonrası yeniden oluşum → yeniden tek log"**
18. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"logger yoksa durum tablosu yine çalışır"**
19. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"sql yoksa yalnızca log çalışır (tablo yazımı atlanır)"**
20. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"alarm kuralları yoksa hiçbir alarm işlemi yapılmaz"**
21. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"start() restart sonrası bayat aktifleri kapatır + dedup sıfırlar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/telemetry-tagger.test.ts` (5 test)

1. (TelemetryTagger) **"korur elle girilen tag'leri ve device_id ekler"**
2. (TelemetryTagger) **"container-level app'te container_id ekler"**
3. (TelemetryTagger) **"field-level app'te field_id ekler, container_id eklemez"**
4. (TelemetryTagger) **"kimlik yoksa sadece device_id ekler"**
5. (TelemetryTagger) **"tags olmayan telemetriye de tag ekler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/integration-service/src/external-series-writer.test.ts` (5 test)

1. (ExternalSeriesWriter) **"init tablo, hypertable ve index olusturur"**
2. (ExternalSeriesWriter) **"write upsert SQL uretir ve parametreleri sirali gecer"**
3. (ExternalSeriesWriter) **"bos listede write hicbir SQL calistirmaz"**
4. (ExternalSeriesWriter) **"query satirlari MarketDataPoint'e cevirir"**
5. (ExternalSeriesWriter) **"close baglantiyi kapatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/integration-service/src/integration-service.test.ts` (12 test)

1. (IntegrationService) **"start — integration pluginlerini aktive eder ve interval job planlar"**
2. (IntegrationService) **"start — integration olmayan pluginleri atlar"**
3. (IntegrationService) **"start — cron mode'da cron job planlar"**
4. (IntegrationService) **"start — manual mode'da zamanlama kaydetmez"**
5. (IntegrationService) **"worker isi — fetch eder ve yazar"**
6. (IntegrationService) **"runPlugin — manuel calistirir ve yazilan sayiyi dondurur"**
7. (IntegrationService) **"runPlugin — bilinmeyen pluginde firlatir"**
8. (IntegrationService) **"stop — pluginleri deactivate eder ve kaynaklari kapatir"**
9. (IntegrationService) **"2026-08-30 (T3): worker — bilinmeyen plugin job'ı YOK SAYILIR (kademeli bozulma)"**
10. (IntegrationService) **"2026-08-30 (T3): worker — plugin fetch HATASI job'ı düşürür, yazım YAPILMAZ (hata akışı yukarı fırlar)"**
11. (IntegrationService) **"2026-08-30 (T3): worker — boş fetch sonucu BOŞ listeyle yazıma gider (writer no-op'tur)"**
12. (IntegrationService) **"2026-08-30 (T3): runPlugin — fetch hatası çağırana fırlar (yutulmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/action-executor.test.ts` (22 test)

1. (ActionExecutor) **"kural ateşleme logu: auto_rule_fired (info, context.rule)"**
2. (ActionExecutor) **"command aksiyonu başarı → executeAndWait + auto_rule_action_ok"**
3. (ActionExecutor) **"validate olmayan komutta timeout varsayılan 3000 + tampon"**
4. (ActionExecutor) **"command aksiyonu job başarısız → auto_rule_action_failed"**
5. (ActionExecutor) **"command aksiyonu çözümleme hatası → fail (throw yok, akış durmaz)"**
6. (ActionExecutor) **"zorunlu param eksik command → fail; sonraki aksiyon devam eder"**
7. (ActionExecutor) **"log aksiyonu: config eventCode + level; logger yoksa console fallback"**
8. (ActionExecutor) **"log aksiyonu logger hatası → fail; akış devam eder"**
9. (ActionExecutor) **"container-command başarı → kanal trace'iyle çağrılır + auto_rule_action_ok"**
10. (ActionExecutor) **"container-command kanal fail → auto_rule_action_failed (akış durmaz)"**
11. (ActionExecutor) **"container-command kanal YOK → fail (kademeli bozulma)"**
12. (ActionExecutor) **"notify aksiyonu: eventCode auto_rule_<name> ile loglanır; başarı sonucu ok"**
13. (ActionExecutor) **"logger yoksa notify ATLANIR (ok sonuç)"**
14. (ActionExecutor) **"notify logu hatası → fail sonucu (akış durmaz)"**
15. (ActionExecutor) **"beklenmeyen mq throw → fail sonucu, akış devam eder"**
16. (ActionExecutor) **"sonuç logu hatası aksiyon sonucunu değiştirmez (best-effort)"**
17. (ActionExecutor) **"logger yoksa log aksiyonu console fallback: error ve info seviyeleri"**
18. (ActionExecutor) **"sonuç listesi aksiyon sırasını korur"**
19. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"kanal YOKSA fail (channel_not_configured) — akış durmaz"**
20. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"ok sonucu → auto_rule_action_ok + trace auto:<kural>"**
21. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"202 (started) → ok + started context taşınır"**
22. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"fail (409 disabled — UC-4) → auto_rule_action_failed + reason; sonraki aksiyon devam"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/automation-rules.spec.ts` (8 test)

1. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1)) **"V>1500 + debounce 1 sn → CB open + BSC open_contactors (tüm aktif cihazlar) + audit"**
2. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1)) **"Voltage L-N Avg < 180 + debounce 5 sn → şalter AÇ + kontaktör AÇ (tüm aktif cihazlar)"**
3. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak) **"Max Pack Temp > 50 + debounce 5 dk → tüm HVAC force_cool + tüm BSC stop"**
4. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis) **"HVAC-1 25.2°C → force_cool job'ı GERÇEK config'ten üretilir"**
5. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io)) **"Battery Door Open 1 → ışık AÇ + tüm BSC stop"**
6. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io)) **"kenar-tetik: kapı kapalıyken KAPATMA kuralı ateşler (ışık söner)"**
7. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io) > FL-11 — toprak direnci (IMD-1)) **"Insulation Alarm 4 + debounce 2 sn → CB open + kontaktör AÇ (tüm aktif cihazlar)"**
8. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io) > FL-11 — toprak direnci (IMD-1) > fail-safe (K-A4)) **"FL-06/09/12 senaryosu kural üretmez — job listesi boş"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/container-command-channel.test.ts` (6 test)

1. (HttpContainerCommandChannel) **"URL + gövde + trace başlığı doğru"**
2. (HttpContainerCommandChannel) **"internalToken verilirse x-internal-token başlığı gider"**
3. (HttpContainerCommandChannel) **"sonuçlarda success=false → ok=false + reason"**
4. (HttpContainerCommandChannel) **"HTTP 503 → ok=false, throw YOK"**
5. (HttpContainerCommandChannel) **"network hatası → ok=false + String(error)"**
6. (HttpContainerCommandChannel) **"baseUrl/fillId eksik → constructor reddeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/container-rules.test.ts` (20 test)

1. (konteyner rules.json — kural envanteri) **"zod-valid + fail-fast yüklenir; 43 kural"**
2. (konteyner rules.json — kural envanteri) **"K-A4: FL-06/09/12 kural adı YOKTUR (fail-safe)"**
3. (konteyner rules.json — kural envanteri) **"K-A8/K-A9: hiçbir aksiyon PCS'e veya BSC charge/discharge'a gitmez"**
4. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_cool_on_h1: Current Temp ≥ 25 → force_cool + log; cooldown 60 sn"**
5. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_cool_off_h1: < 23 → on"**
6. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_heat_on_h1: ≤ 17 → force_heat"**
7. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_heat_off_h1: ≥ 20 → on"**
8. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"HVAC-1..8 için dörtlü tamam (32 kural)"**
9. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_overheat_protect: 3 kademeli debounce + HVAC force + BSC stop"**
10. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_overcold_protect: 3 kademeli + force_heat + BSC stop"**
11. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_humidity_alarm: Return Humidity ≥ 85 → BSC stop + log + notify"**
12. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_temp_diff_protect: per-rack R1..R8 (≥10 rack / ≥5 pack) → BSC stop"**
13. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340)) **"eşik 180 V + debounce 5 sn; CB open ×2 + BSC open_contactors ×2"**
14. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI)) **"batarya kapısı AÇIK → ışık + BSC stop; KAPALI → ışık söndür"**
15. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI)) **"panel kapısı kuralları aynı desen (panel_light_on/off)"**
16. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1)) **"V>1500 / I>1680 / P>1784 (debounce 1 sn) → şalter AÇ + kontaktör AÇ"**
17. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map)) **"Insulation Alarm / Device Error aktif (≠0, debounce 2 sn) → koruma"**
18. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-08: eşik altı ATEŞLEMEZ; eşik üstü + debounce → tek ateşleme"**
19. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-05 normal: HVAC-1 25.1°C → tms_cool_on_h1 tek ateşleme"**
20. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-07: kapı DI 1 → fl07_battery_door_open ateşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/cycle-snapshot-store.test.ts` (10 test)

1. (CycleSnapshotStore) **"record + snapshot: değer adıyla okunur, unit ve recordedAt taşınır"**
2. (CycleSnapshotStore) **"yeni kayıt eskisini ezer (aynı anahtar)"**
3. (CycleSnapshotStore) **"maxAgeMs aşan giriş snapshot'a girmez"**
4. (CycleSnapshotStore) **"bayat giriş depodan temizlenir — sonraki snapshot tutarlı"**
5. (CycleSnapshotStore) **"olmayan cihaz/anahtar → undefined"**
6. (CycleSnapshotStore) **"canonical etiketiyle erişim: key ad değilse tags.canonical indeksine düşer"**
7. (CycleSnapshotStore) **"canonical indeksi de yeni kayıtla güncellenir"**
8. (CycleSnapshotStore) **"boş store → boş snapshot"**
9. (CycleSnapshotStore) **"snapshot anlık görüntüdür — sonraki record'lar dönen nesneyi etkilemez"**
10. (CycleSnapshotStore) **"çok cihaz: deviceIds tümünü listeler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/device-catalog.test.ts` (7 test)

1. (DeviceCatalog) **"seçici yoksa tüm cihazlar"**
2. (DeviceCatalog) **"ids seçicisi birebir döner"**
3. (DeviceCatalog) **"types seçicisi eşleşen cihazları döner"**
4. (DeviceCatalog) **"ids + types birleşim (çift kayıt yok)"**
5. (DeviceCatalog) **"bilinmeyen type → yalnızca ids varsa onlar"**
6. (DeviceCatalog) **"type olmayan cihaz yalnızca ids ile seçilir"**
7. (DeviceCatalog) **"bilinmeyen id sessizce yok sayılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/field-rules.test.ts` (5 test)

1. (field rules.json (R-06 + SOC örneği)) **"geçerli: r06_recovery + soc_discharge_example (disabled)"**
2. (field rules.json (R-06 + SOC örneği)) **"tetikleyici: E-stop 0 + fault 0 (all)"**
3. (field rules.json (R-06 + SOC örneği)) **"aksiyonlar: maneuver(fl06_recovery) + log + notify — KOMUT aksiyonu YOK (KURAL-MOTORU-V2)"**
4. (field rules.json (R-06 + SOC örneği)) **"debounce: E-stop düşen kenarı 2 sn doğrulanır"**
5. (field rules.json (R-06 + SOC örneği)) **"SOC örneği: operation(field_discharge) + params delegasyonu"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/management-service.test.ts` (6 test)

1. (ManagementService) **"start: MANAGEMENT worker kaydedilir; job telemetrisi snapshot'a yazılır"**
2. (ManagementService) **"runCycle: koşul sağlanınca kural ateşlenir ve executor çağrılır"**
3. (ManagementService) **"tick döngüsü: interval sonrası değerlendirme kendiliğinden çalışır"**
4. (ManagementService) **"worker yalnızca MANAGEMENT tipini kaydeder (non-MANAGEMENT job yok sayılır)"**
5. (ManagementService) **"stop: döngü durur, mq.close çağrılır; çift stop güvenli"**
6. (ManagementService) **"health: çalışıyorsa mq.health yansır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/maneuver-operation-channel.test.ts` (7 test)

1. (HttpManeuverOperationChannel) **"POST yolu + gövde + başlıklar birebir"**
2. (HttpManeuverOperationChannel) **"maneuver türü doğru önek üretir"**
3. (HttpManeuverOperationChannel) **"rolled_back → ok (kompanzasyon tamamlandı — terminal)"**
4. (HttpManeuverOperationChannel) **"failed/rejected → ok:false + reason (409 operation_disabled — UC-4)"**
5. (HttpManeuverOperationChannel) **"202 → ok + started (arka planda sürüyor)"**
6. (HttpManeuverOperationChannel) **"network hatası / 503 → ok:false (throw YOK)"**
7. (HttpManeuverOperationChannel) **"timeout → ok:false + reason timeout (AbortController)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/ppc-rule.spec.ts` (4 test)

1. (PPC sinyal zinciri (WS3 + D4)) **"bağlantı koptu (0) → kural ateşler + kanala auto:<rule> trace ile gider"**
2. (PPC sinyal zinciri (WS3 + D4)) **"stale eşlemesi (2) de tetikler; bağlı (1) ATEŞLEMEZ"**
3. (PPC sinyal zinciri (WS3 + D4)) **"kenar-tetik: aynı snapshot ikinci kez değerlendirilmez"**
4. (PPC sinyal zinciri (WS3 + D4)) **"kanal fail (ok=false) → aksiyon fail sonucu; sonraki aksiyon DEVAM eder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/rule-config-loader.test.ts` (9 test)

1. (RuleConfigLoader.loadRules) **"geçerli dosyayı yükler (tipli)"**
2. (RuleConfigLoader.loadRules) **"dosya yok → throw"**
3. (RuleConfigLoader.loadRules) **"bozuk JSON → throw"**
4. (RuleConfigLoader.loadRules) **"şema reddi (then boş) → throw"**
5. (RuleConfigLoader.loadRules) **"bilinmeyen anahtar → throw (strict şema)"**
6. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"dizindeki cihaz config'lerinden katalog üretir"**
7. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"bozuk cihaz dosyası atlanır (best-effort)"**
8. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"dizin yoksa boş katalog"**
9. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"type alanı olmayan cihaz da kataloga girer (type undefined)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/rule-evaluator.test.ts` (17 test)

1. (RuleEvaluator) **"yükselen kenarda bir kez döner; aktifken tekrarlamaz"**
2. (RuleEvaluator) **"düşüş sonrası yeniden yükseliş yeni kenardır (cooldown yoksa ateşler)"**
3. (RuleEvaluator) **"debounce: süre dolmadan aktifleşme olmaz; dolunca ateşler"**
4. (RuleEvaluator) **"per-condition debounce: hızlı kademe yavaş kademeyi BEKLEMEZ (REV03 K-A1)"**
5. (RuleEvaluator) **"debounce sırasında düşüş sayaç sıfırlar — yeniden tam süre gerekir"**
6. (RuleEvaluator) **"cooldown içinde yeni kenar bastırılır; sonrası ateşler"**
7. (RuleEvaluator) **"when.any: bir koşul sağlansa yeterli"**
8. (RuleEvaluator) **"when.all: bir koşul false ise ateşleme yok"**
9. (RuleEvaluator) **"enabled: false kural hiç ateşlemez"**
10. (RuleEvaluator) **"device seçicisi hedef dışındaki cihaz değerini yok sayar"**
11. (RuleEvaluator) **"koşul hedef sette en az bir cihazda sağlanırsa TRUE"**
12. (RuleEvaluator) **"veri yok → koşul FALSE (bayat veriyle asla tetiklenmez)"**
13. (RuleEvaluator) **"sayısal op string değerde false (karşılaştırma yapılmaz)"**
14. (RuleEvaluator) **"eq sayısal eşitlikte çalışır"**
15. (RuleEvaluator) **"aynı snapshot ile ikinci çağrı boş döner (tekrarlı tick güvenliği)"**
16. (RuleEvaluator) **"bağımsız kurallar aynı cycle'da birlikte döner"**
17. (RuleEvaluator) **"gte/lt/lte/neq operatorleri"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/change-password-use-case.test.ts` (4 test)

1. (ChangePasswordUseCase (T1.6)) **"kullanıcı yoksa fail"**
2. (ChangePasswordUseCase (T1.6)) **"eski şifre yanlışsa fail — hash değişmez"**
3. (ChangePasswordUseCase (T1.6)) **"yeni şifre eskiyle aynıysa fail"**
4. (ChangePasswordUseCase (T1.6)) **"başarı — hash + bayrak düşürme + yeni token'lar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/login-use-case.test.ts` (16 test)

1. (LoginUseCase) **"returns tokens and user on successful login"**
2. (LoginUseCase) **"fails when user is not found"**
3. (LoginUseCase) **"fails when password hash is missing"**
4. (LoginUseCase) **"fails when password does not match"**
5. (LoginUseCase) **"stores refresh token on success"**
6. (LoginUseCase) **"passes the user to signAccess and signRefresh"**
7. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"başarısız giriş security kanalında login_failed loglar — password YOK"**
8. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"bilinmeyen kullanıcı da security login_failed loglar"**
9. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"başarılı giriş audit kanalında login_succeeded loglar"**
10. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"fail-closed: audit sink kapalıyken geçerli giriş REDDEDİLİR"**
11. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"fail-closed: başarısız girişte log hatası crash etmez — yanıt yine başarısız"**
12. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış) **"MFA aktif kullanıcıda access/refresh ÜRETİLMEZ — mfaRequired + mfaToken döner"**
13. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış) **"MFA kapalı kullanıcıda normal token akışı korunur"**
14. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"kilitli hesapta DOĞRU şifre de reddedilir"**
15. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"eşik geçişinde login_locked security logu atılır (tek sefer)"**
16. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"başarılı girişte sayaç temizlenir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/mfa-enroll-use-case.test.ts` (9 test)

1. (MfaEnrollUseCase.enroll (T6.1)) **"sır üretir, saklar ve otpauth URI döner"**
2. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"doğru kod: MFA aktifleşir, 10 kurtarma kodu döner, hash'ler saklanır"**
3. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"yanlış kod: fail + mfa_login_failed logu; enableMfa ÇAĞRILMAZ"**
4. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"fail-closed: mfa_enrolled audit logu yazılamazsa MFA AÇILMAZ"**
5. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"kayıt yoksa (sır yok) fail"**
6. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"T1.6: kilitli kullanıcıda kod DENENMEZ (confirm — brute-force koruması)"**
7. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"T1.6: yanlış kod throttle sayacını artırır"**
8. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1) > MfaEnrollUseCase.reset (T6.1)) **"MFA'yı düşürür + mfa_reset audit logu"**
9. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1) > MfaEnrollUseCase.reset (T6.1)) **"fail-closed: audit logu yazılamazsa reset YAPILMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/mfa-login-use-case.test.ts` (9 test)

1. (MfaLoginUseCase (T6.1)) **"geçerli TOTP kodu ile token üretir"**
2. (MfaLoginUseCase (T6.1)) **"mfa token geçersizse fail — TOTP denenmez"**
3. (MfaLoginUseCase (T6.1)) **"TOTP geçersizse kurtarma kodu dener; başarılı kurtarma yanar"**
4. (MfaLoginUseCase (T6.1)) **"TOTP + kurtarma ikisi de geçersiz → fail + mfa_login_failed security logu"**
5. (MfaLoginUseCase (T6.1)) **"kullanıcıda TOTP sırrı yoksa fail (MFA pasif)"**
6. (MfaLoginUseCase (T6.1)) **"T1.6: kilitli kullanıcıda TOTP/kurtarma DENENMEZ (brute-force koruması)"**
7. (MfaLoginUseCase (T6.1)) **"T1.6: başarısız kod throttle sayacını artırır"**
8. (MfaLoginUseCase (T6.1)) **"T1.6: başarılı doğrulama sayacı temizler (recordSuccess)"**
9. (MfaLoginUseCase (T6.1)) **"T1.6: throttle hatası fail-closed (doğrulama reddedilir)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/refresh-token-use-case.test.ts` (5 test)

1. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"verifyRefresh BAŞARISIZ → err; reuse tespiti YAPILMAZ (repo'ya hiç dokunulmaz)"**
2. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"imza geçerli + hash DB'de YOK → K5 reuse: clearRefreshToken(sub) + err"**
3. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"hash DB'de VAR ama kullanıcı eşleşmiyor → reuse yolu (clearRefreshToken)"**
4. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"başarılı refresh → yeni çift üretilir + storeRefreshToken yeni token ile (rotasyon)"**
5. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"rotasyon sonrası eski token yeniden sunulursa → reuse → iptal (K4+K5 birlikte)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/user-use-cases.test.ts` (4 test)

1. (DeleteUserUseCase) **"deletes user when id is different from current user"**
2. (DeleteUserUseCase) **"fails when trying to delete self"**
3. (DeleteUserUseCase > CreateUserUseCase) **"creates user when username is available"**
4. (DeleteUserUseCase > CreateUserUseCase) **"fails when username already exists"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/config/default.test.ts` (28 test)

1. (seedUsers (T1.6 + 2026-08-30)) **"container tier: dev default'ları + admin/boss mustChangePassword true, guest FALSE (otomatik guest)"**
2. (seedUsers (T1.6 + 2026-08-30)) **"field tier: SEED_*_PASSWORD yoksa fırlatır (fail-fast)"**
3. (seedUsers (T1.6 + 2026-08-30)) **"field tier: env şifreleri kullanılır; guest bayrağı false kalır"**
4. (seedUsers (T1.6 + 2026-08-30)) **"field tier: 8 karakterden kısa env değeri de fırlatır"**
5. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"field tier + dev secret → fırlatır"**
6. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"field tier + geçerli secret → ok"**
7. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"container tier + dev secret → ok (dev ortamı)"**
8. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"kapalıysa undefined döner"**
9. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"etkinse URL listesi + token + containerId ayrıştırılır"**
10. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"etkin ama URL yoksa fail-fast fırlatır"**
11. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"etkin ama token yoksa fail-fast fırlatır"**
12. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"etkin ama containerId yoksa fail-fast fırlatır"**
13. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"ws:// veya wss:// olmayan URL reddedilir"**
14. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"field tier'da etkin = hata"**
15. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3)) **"tek URL de geçerli"**
16. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"field tier + geçerli UUID → config döner"**
17. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"field tier + FIELD_ID yoksa fail-fast fırlatır"**
18. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"field tier + geçersiz UUID fail-fast fırlatır"**
19. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"field tier + FIELD_NAME env'den isim alır"**
20. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"container tier → undefined (FIELD_ID opsiyonel)"**
21. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env)) **"boss tier → undefined (çok saha ileride)"**
22. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"field tier varsayılan: admin,teknik"**
23. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"MFA_ENABLED=false → [] (debug)"**
24. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"MFA_ENABLED=false + AUTH_MFA_REQUIRED_ROLES dolu → yine [] (bayrak öncelikli)"**
25. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"AUTH_MFA_REQUIRED_ROLES boş string → []"**
26. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"container tier her zaman []"**
27. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag) > fieldTunnelPathAllowlist (Boss Faz 3 dev eki)) **"env boşsa undefined — §5.6 varsayılanları geçerli kalır"**
28. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > fieldConnectorConfig (T2.3) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag) > fieldTunnelPathAllowlist (Boss Faz 3 dev eki)) **"virgüllü ek önekler §5.6 varsayılanlarına EKLENİR"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/bun-password-hasher.test.ts` (4 test)

1. (BunPasswordHasher @nis2-security) **"hash Bun.password.hash'e delege eder"**
2. (BunPasswordHasher @nis2-security) **"verify Bun.password.verify'e delege eder — true sonucu aynen döner"**
3. (BunPasswordHasher @nis2-security) **"verify false sonucu false döner"**
4. (BunPasswordHasher @nis2-security) **"verify THROW ederse false döner (kontrat — login 500 koruması)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/jose-token-signer.test.ts` (4 test)

1. (JoseTokenSigner) **"sign → verify round-trip: payload korunur"**
2. (JoseTokenSigner) **"farklı secret ile doğrulanan token reddedilir"**
3. (JoseTokenSigner) **"bozuk token undefined döner (throw yok)"**
4. (JoseTokenSigner) **"süresi dolmuş token reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/otplib-totp-service.test.ts` (7 test)

1. (OtpLibTotpService.generateSecret (T6.1)) **"her çağrıda yeni bir sır döner (base32)"**
2. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1)) **"otpauth://totp URI'si issuer ve kullanıcıyı taşır"**
3. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"RFC 6238 vektörü: T=59 → 94287082 (6 haneli: 287082) geçerli"**
4. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"pencere içi komşu adımlar geçerlidir (±30 sn)"**
5. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"pencere dışı reddedilir"**
6. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"yanlış kod reddedilir"**
7. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"sayısal olmayan/boş kod throw etmez — false döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/redis-login-throttle.test.ts` (5 test)

1. (RedisLoginThrottle (T6.6) @nis2-security) **"ilk başarısız giriş: sayaç penceresi kurulur, kilit YOK"**
2. (RedisLoginThrottle (T6.6) @nis2-security) **"eşik aşılınca kilit kurulur (SET + EX — EXPIRE var olmayan anahtarı yaratmaz)"**
3. (RedisLoginThrottle (T6.6) @nis2-security) **"recordSuccess sayaç ve kilidi temizler"**
4. (RedisLoginThrottle (T6.6) @nis2-security) **"isLocked mevcut kilit anahtarını okur"**
5. (RedisLoginThrottle (T6.6) @nis2-security) **"Redis hatası fırlatılır (fail-open YOK)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/redis-totp-throttle.test.ts` (5 test)

1. (RedisTotpThrottle (T1.6) @nis2-security) **"ilk başarısız deneme: sayaç penceresi kurulur, kilit YOK"**
2. (RedisTotpThrottle (T1.6) @nis2-security) **"eşik aşılınca kilit kurulur (SET + EX)"**
3. (RedisTotpThrottle (T1.6) @nis2-security) **"recordSuccess sayaç ve kilidi temizler"**
4. (RedisTotpThrottle (T1.6) @nis2-security) **"isLocked mevcut kilit anahtarını okur"**
5. (RedisTotpThrottle (T1.6) @nis2-security) **"Redis hatası fırlatılır (fail-open YOK)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/service-token.test.ts` (3 test)

1. (sha256Hex (Faz 1)) **"bilinen vektörü üretir (RFC 6234: abc)"**
2. (sha256Hex (Faz 1)) **"deterministik ve 64 hex karakterdir"**
3. (sha256Hex (Faz 1)) **"farklı girdiler farklı özet üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/token-adapter.test.ts` (16 test)

1. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"signAccess → verifyAccess round-trip kimliği korur"**
2. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyAccess başarısız token'da fırlatır"**
3. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"refresh token'ı access olarak doğrulanamaz"**
4. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyAccess fieldIds döndürür (T1.3)"**
5. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"fieldIds'siz kullanıcıda alan undefined/boş kalır"**
6. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyRefresh jti/sub döner"**
7. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: mfaEnabled claim'i round-trip korunur"**
8. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: signMfa → verifyMfa sub döner; access olarak KULLANILAMAZ"**
9. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: access token mfa olarak doğrulanamaz"**
10. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: bozuk mfa token fırlatır"**
11. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"süresi dolmuş (exp geçmiş) access token reddedilir"**
12. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"YANLIŞ secret ile imzalanmış GEÇERLİ biçimli JWT reddedilir (sahte imza)"**
13. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"alg:none token reddedilir (algoritma karıştırma)"**
14. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"HS512 ile imzalanmış token HS256 doğrulamasında reddedilir"**
15. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"mustChangePassword claim'i sign→verify round-trip korunur (rbac güvenir)"**
16. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"süresi dolmuş refresh token reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/commands/command-channel.test.ts` (9 test)

1. (CommandChannel) **"execute: isimli komut job üretir + executeAndWait; sonuç ok"**
2. (CommandChannel) **"execute: çözümleme hatası (bilinmeyen komut) → fail — throw YOK"**
3. (CommandChannel) **"execute: ham telemetries fallback'i (komutsuz adım)"**
4. (CommandChannel) **"execute: kuyruk hatası → fail sonucu (throw YOK — kademeli)"**
5. (CommandChannel) **"execute: executeAndWait success=false → fail + reason taşınır"**
6. (CommandChannel) **"schedule: stop komutu builder'dan çözülür + addJob delay"**
7. (CommandChannel) **"schedule: bilinmeyen komut → THROW (best-effort çağıran audit'ler)"**
8. (CommandChannel > DeviceRegistryTargets) **"resolveAvailable: tipe göre filtreler"**
9. (CommandChannel > DeviceRegistryTargets) **"filterAvailable: online kesişimi (sıra korunur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/commands/load-maneuver-records.test.ts` (4 test)

1. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"demo dosyaları yokken yalnız mevcut katalog yüklenir (AK-10.7)"**
2. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"demo dosyaları mevcutsa eklemeli birleştirir (AK-10.1)"**
3. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"bozuk demo dosyası fail-fast fırlatır"**
4. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"hiçbir dosya yoksa boş döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-proxy/container-connection-telemetry-publisher.test.ts` (4 test)

1. (ContainerConnectionTelemetryPublisher) **"connected → value 1 MANAGEMENT job'ı (deviceId=field)"**
2. (ContainerConnectionTelemetryPublisher) **"durum eşlemesi: idle→0, stale→2, error→0"**
3. (ContainerConnectionTelemetryPublisher) **"addJob reddi yutulur — throw YOK (best-effort)"**
4. (ContainerConnectionTelemetryPublisher) **"diğer observer callback'leri no-op"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-proxy/container-proxy-field-channel.test.ts` (4 test)

1. (ContainerProxyFieldChannel) **"sendControl/sendBinary ContainerProxy'ye delege edilir"**
2. (ContainerProxyFieldChannel) **"onControlMessage aboneyi containerId ile besler; unsubscribe söker"**
3. (ContainerProxyFieldChannel) **"onBinaryFrame aboneyi ham frame ile besler"**
4. (ContainerProxyFieldChannel) **"isConnected yalnızca connected durumda true"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-proxy/container-proxy.test.ts` (52 test)

1. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"geçerli token ile register — connected + registry URL"**
2. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"yanlış token ile register — bağlantı kapatılır, kayıt yok"**
3. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"token'sız register — bağlantı kapatılır"**
4. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"registry'de bilinmeyen containerId — kapatılır"**
5. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"sql yoksa fail-closed — register reddedilir"**
6. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"reddedilen register ws_register_rejected security logu üretir"**
7. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"authenticateContainerToken — registry'deki hash ile true"**
8. (container-proxy T1.1 sözleşmesi (token doğrulama)) **"authenticateContainerToken — bilinmeyen token false"**
9. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch)) **"health() registry URL'ine token'lı fetch yapar"**
10. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch)) **"token RAM'de yoksa fetch headersız gider (restart sonrası kademeli)"**
11. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"historical() WS'e telemetry-query frame'i gönderir ve telemetry-result ile çözülür"**
12. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"telemetry-query-error → boş dizi (kademeli bozulma)"**
13. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"konteyner kayıtlı değilse veya WS kapalıysa frame gönderilmez — boş dizi"**
14. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"timeout aşılınca boş dizi döner (queryTimeoutMs enjekte edilir)"**
15. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"WS kapanınca bekleyen sorgular boş diziyle kapatılır"**
16. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)) **"ilgisiz mesajlar bekleyen sorguları etkilemez (observer'a düşer)"**
17. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar)) **"observer'a connection değişimi bildirilir"**
18. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar)) **"telemetry mesajı latest günceller + onData"**
19. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar)) **"close → idle bildirimi"**
20. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar)) **"unregisterContainer siler"**
21. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"başarılı register register-ack ok gönderir"**
22. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"reddedilen register register-ack rejected + kapatma"**
23. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"register lastSeenAt'i şimdiye kurar"**
24. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"heartbeat lastSeenAt'i tazeler"**
25. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"45 sn sessizlik → stale (observer bildirimi dahil)"**
26. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"stale → heartbeat → connected geri döner"**
27. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"close sonrası kayıt + lastSeenAt korunur (idle — §12.4)"**
28. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"kayıtsız container lastSeenAt undefined"**
29. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"stale eşiği config ile değiştirilebilir"**
30. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"kapalıysa pushConfigUpdate frame göndermez"**
31. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"pushConfigUpdate config-update frame'i gönderir"**
32. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale)) **"operationalConfig register-ack'e gömülür"**
33. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"sql'siz authenticateContainerToken false"**
34. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"sql hatasında authenticateContainerToken false (fail-closed)"**
35. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"registry sorgusu hata verirse register reddedilir"**
36. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"yeniden register eski bağlantıyı kapatır"**
37. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"registry'de container_url yoksa health false; historical frame'le yine çalışır"**
38. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"malform JSON mesajı yok sayılır"**
39. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"kayıtsız container latestTelemetry boş döner"**
40. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"historical() from/to/points frame'e taşınır"**
41. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"historical() gönderim hatası → boş dizi"**
42. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"allHistorical çoklu konteyner"**
43. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"health() fetch hatası → false"**
44. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"start/stop + sweep (kapalı soket → idle)"**
45. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"removeObserver bildirimi durdurur"**
46. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"register-ack gönderiminde soket zaten kapalıysa gönderilmez"**
47. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"unregister sonrası heartbeat yok sayılır"**
48. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları)) **"security logu yazılamazsa da register reddedilir (fail-closed)"**
49. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları) > container-proxy Faz 3 kanalı (control + binary)) **"bilinmeyen kontrol mesajı observer'a iletilir"**
50. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları) > container-proxy Faz 3 kanalı (control + binary)) **"binary frame observer'a iletilir (text parse edilmez)"**
51. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları) > container-proxy Faz 3 kanalı (control + binary)) **"sendControl açık WS'e JSON gönderir; kapalıysa no-op"**
52. (container-proxy T1.1 sözleşmesi (token doğrulama) > container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch) > container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i) > container-proxy karakterizasyon (değişmeyen davranışlar) > container-proxy T2.4 sözleşmesi (heartbeat + stale) > container-proxy kapsama (T2.4 ek — hata yolları) > container-proxy Faz 3 kanalı (control + binary)) **"sendBinary açık WS'e ham frame gönderir; kapalıysa no-op"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-proxy/container-ws-routes.test.ts` (4 test)

1. (container-ws-routes T1.1 sözleşmesi) **"token yoksa upgrade öncesi 401"**
2. (container-ws-routes T1.1 sözleşmesi) **"hash'i registry'de olmayan token → 401"**
3. (container-ws-routes T1.1 sözleşmesi) **"geçerli token + register mesajı → registerContainer(token) çağrılır"**
4. (container-ws-routes T1.1 sözleşmesi) **"register mesajındaki containerUrl setContainerUrl'ı tetikLEMEZ (trust kalktı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-session/fastify-stream-sink.test.ts` (3 test)

1. (FastifyStreamSink) **"status → writeHead (headers varsayılan {})"**
2. (FastifyStreamSink) **"write/end/destroy birebir delege edilir"**
3. (FastifyStreamSink) **"onClose → raw 'close' olayına abone olur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-session/session-audit.test.ts` (5 test)

1. (SessionAudit (T3.4)) **"ensureSchema session_audit DDL'ini kurar"**
2. (SessionAudit (T3.4)) **"open → INSERT + security logu; logger hatası fail-closed"**
3. (SessionAudit (T3.4)) **"close → UPDATE + security logu"**
4. (SessionAudit (T3.4)) **"SESSION_AUDIT_DDL dışa açıktır (init kullanımı)"**
5. (SessionAudit (T3.4)) **"IAuditSink sözleşmesini uygular (derleme kanıtı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-session/session-user-map.test.ts` (3 test)

1. (SessionUserMap) **"toTunnelUser yalnızca tünel alanlarını taşır"**
2. (SessionUserMap) **"toWebUser geçici oturum kullanıcısı üretir"**
3. (SessionUserMap) **"round-trip: role korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-session/tunnel-maneuver-channel.test.ts` (8 test)

1. (TunnelManeuverChannel (C1)) **"connected + 200 yanıt → ok"**
2. (TunnelManeuverChannel (C1)) **"timer verilince gövdeye eklenir (additive)"**
3. (TunnelManeuverChannel (C1)) **"timer YOKKEN gövde yalnızca params (mevcut davranış)"**
4. (TunnelManeuverChannel (C1)) **"bağlantı connected değilse system_unreachable — stream açılmaz"**
5. (TunnelManeuverChannel (C1)) **"stream: POST /api/maneuvers/:name/execute + params gövdesi + oturum cookie"**
6. (TunnelManeuverChannel (C1)) **"upstream 404 → ok:false + reason gövdeden"**
7. (TunnelManeuverChannel (C1)) **"stream hatası → ok:false (tunnel_stream_failed)"**
8. (TunnelManeuverChannel (C1)) **"oturum yoksa programatik açılır; varsa yeniden kullanılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/container-session/tunnel.spec.ts` (4 test)

1. (Faz 3 uçtan uca tünel (K3.1-K3.3)) **"K3.1: curl benzeri GET / → HTML akar (FIN ile biter)"**
2. (Faz 3 uçtan uca tünel (K3.1-K3.3)) **"K3.2: GET /api/data/latest → JSON akar"**
3. (Faz 3 uçtan uca tünel (K3.1-K3.3)) **"K3.2: /ws köprüsü çift yönlü WS_OP mesajı taşır"**
4. (Faz 3 uçtan uca tünel (K3.1-K3.3)) **"K3.3: session_audit INSERT + session_open security logu"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-connector/realtime-snapshot-source.test.ts` (6 test)

1. (RealtimeSnapshotSource (T2.1c)) **"her cihazın en yeni değerlerini döndürür"**
2. (RealtimeSnapshotSource (T2.1c)) **"(deviceId, name) başına ilk görülen (en yeni) korunur"**
3. (RealtimeSnapshotSource (T2.1c)) **"bozuk kayıtları eler"**
4. (RealtimeSnapshotSource (T2.1c)) **"SQL hatası → boş dizi (kademeli bozulma)"**
5. (RealtimeSnapshotSource (T2.1c)) **"tek cihazın Redis hatası diğerlerini etkilemez"**
6. (RealtimeSnapshotSource (T2.1c)) **"cihaz yoksa boş dizi döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-connector/telemetry-query-responder.test.ts` (7 test)

1. (TelemetryQueryResponder (Faz 5.1 B2)) **"geçerli sorgu → series() çağrılır ve telemetry-result döner"**
2. (TelemetryQueryResponder (Faz 5.1 B2)) **"deviceIds/names opsiyoneldir — varsa sorguya taşınır"**
3. (TelemetryQueryResponder (Faz 5.1 B2)) **"geçersiz sorgu → telemetry-query-error (kaynağa ulaşılmaz)"**
4. (TelemetryQueryResponder (Faz 5.1 B2)) **"queryId'siz geçersiz mesaj → queryId 'unknown'"**
5. (TelemetryQueryResponder (Faz 5.1 B2)) **"kaynak hatası → telemetry-query-error"**
6. (TelemetryQueryResponder (Faz 5.1 B2)) **"farklı tipte mesajlar yok sayılır"**
7. (TelemetryQueryResponder (Faz 5.1 B2)) **"start idempotenttir; stop aboneliği söker"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-connector/telemetry-series-source.test.ts` (4 test)

1. (TelemetrySeriesSource (Faz 5.1 B2)) **"çevrimiçi cihazlarda downsampled sorgular ve birleştirir"**
2. (TelemetrySeriesSource (Faz 5.1 B2)) **"deviceIds filtresi uygulanır"**
3. (TelemetrySeriesSource (Faz 5.1 B2)) **"tek cihaz hatası diğer sonuçları etkilemez"**
4. (TelemetrySeriesSource (Faz 5.1 B2)) **"tüm cihazlar hatalıysa boş dizi döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/field-event-collector.test.ts` (6 test)

1. (FieldEventCollector (Faz 5)) **"event frame'i dedupe INSERT ile yazar (ON CONFLICT DO NOTHING)"**
2. (FieldEventCollector (Faz 5)) **"whitelist dışı olay yok sayılır"**
3. (FieldEventCollector (Faz 5)) **"list JOIN ile saha adını taşır + ISO dönüşümü"**
4. (FieldEventCollector (Faz 5)) **"countSince sonrasını sayar"**
5. (FieldEventCollector (Faz 5)) **"demoSeed açıkken ensureSchema 3 örnek bildirim eker (idempotent)"**
6. (FieldEventCollector (Faz 5)) **"demoSeed kapalıyken ensureSchema seed EKMEZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` (7 test)

1. (FieldRegistry (Faz 3)) **"token hash'i kaydeder (düz metin SQL'e girmez)"**
2. (FieldRegistry (Faz 3)) **"bilinmeyen token → authenticate false (fail-closed)"**
3. (FieldRegistry (Faz 3)) **"register: token eşleşmezse rejected ack + kapanış"**
4. (FieldRegistry (Faz 3)) **"register: token eşleşirse ok ack + connected"**
5. (FieldRegistry (Faz 3)) **"heartbeat lastSeenAt'i tazeler; 45 sn sessizlik → stale"**
6. (FieldRegistry (Faz 3)) **"binary frame ve kontrol mesajı gözlemcilere akar"**
7. (FieldRegistry (Faz 3)) **"WS kapanırsa idle (kayıt düşer)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/operation-flow.spec.ts` (2 test)

1. (K1 — operasyon akışı uçtan uca (gerçek WS)) **"operation-execute → yürütücü → operation-result aynı kanaldan döner"**
2. (K1 — operasyon akışı uçtan uca (gerçek WS)) **"bilinmeyen kontrol mesajı sessiz yok sayılır — kanal AÇIK kalır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/operation-requester.test.ts` (3 test)

1. (OperationRequester (C2b)) **"operation-execute frame'i gönderilir + aynı id'li sonuç çözülür"**
2. (OperationRequester (C2b)) **"farklı operationId / peer yok sayılır"**
3. (OperationRequester (C2b)) **"timeout → undefined + abonelik sökülür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/operation-responder.test.ts` (5 test)

1. (OperationResponder (C2b)) **"geçerli operation-execute → yürütücü + operation-result (completed)"**
2. (OperationResponder (C2b)) **"geçersiz frame → rejected(invalid_request) — yürütücü ÇALIŞMAZ"**
3. (OperationResponder (C2b)) **"rejected sonuç reason ile taşınır"**
4. (OperationResponder (C2b)) **"yürütme throw → failed sonucu; abonelik KALIR (kanal kapanmaz)"**
5. (OperationResponder (C2b)) **"audit: operation_boss_request + operation_result_sent"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/field-uplink/uplink-event-relay.test.ts` (6 test)

1. (UplinkEventRelay (Faz 5)) **"ilk tur backlog (son 1 saat) gönderir — eventId correlation_id ile"**
2. (UplinkEventRelay (Faz 5)) **"sonraki turlar yalnızca cursor sonrasını gönderir (2 sn örtüşme payı)"**
3. (UplinkEventRelay (Faz 5)) **"whitelist dışı satırlar elenir (log gürültüsü aktarılmaz)"**
4. (UplinkEventRelay (Faz 5)) **"correlation_id yoksa eventId seq'e düşer"**
5. (UplinkEventRelay (Faz 5)) **"whitelist varsayılanı alarm + oturum + operasyon koşusu audit'idir"**
6. (UplinkEventRelay (Faz 5)) **"start → 10 sn interval; stop → döngü biter"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/market/market-series.test.ts` (4 test)

1. (MarketSeries (Faz 2)) **"points kronolojik noktaları ISO timestamp'e çevirir"**
2. (MarketSeries (Faz 2)) **"latest boş sonuçta undefined döner"**
3. (MarketSeries (Faz 2)) **"average NULL sonucu undefined'a eşler"**
4. (MarketSeries (Faz 2)) **"average sayısal sonucu döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/device-registry.test.ts` (3 test)

1. (DeviceRegistry — refresh TTL cache) **"ttl içindeki ardışık refresh tek sorgu yapar"**
2. (DeviceRegistry — refresh TTL cache) **"force=true ttl'i atlar"**
3. (DeviceRegistry — refresh TTL cache) **"online() önbellekten döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/log-repository.test.ts` (4 test)

1. (LogRepository (A1)) **"initialize hem system_logs hem log_events DDL'ini oluşturur"**
2. (LogRepository (A1)) **"query UNION üretir — iki kaynağı birleştirir"**
3. (LogRepository (A1)) **"query filtreleri UNION dışına uygulanır"**
4. (LogRepository (A1)) **"insert system_logs'a yazar (client olayları — geçiş)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/operation-def-store.test.ts` (6 test)

1. (OperationDefStore) **"initialize DDL oluşturur (operation_defs)"**
2. (OperationDefStore) **"create: (kind, name) varsa THROW — rota 409 üretir"**
3. (OperationDefStore) **"create: yoksa INSERT eder (enabled TRUE)"**
4. (OperationDefStore) **"update: upsert (ON CONFLICT DO UPDATE)"**
5. (OperationDefStore) **"setEnabled: yoksa THROW; varsa UPDATE (soft)"**
6. (OperationDefStore) **"findByKindAndName: satır eşlenir; yoksa undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/operation-run-store.test.ts` (6 test)

1. (OperationRunStore) **"initialize DDL oluşturur (operation_runs + indeksler)"**
2. (OperationRunStore) **"begin: running INSERT — parametreler birebir"**
3. (OperationRunStore) **"begin: DB hatası THROW eder (fail-closed — yürütücü reddeder)"**
4. (OperationRunStore) **"finish: terminal durum UPDATE — params birebir; hata throw"**
5. (OperationRunStore) **"findById: satır eşlenir; yoksa undefined"**
6. (OperationRunStore) **"listRecent: started_at DESC limit; boş liste"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/site-field-seed.test.ts` (2 test)

1. (ensureSiteField) **"FIELD_ID + isim ile UPSERT çalıştırır (ON CONFLICT DO NOTHING)"**
2. (ensureSiteField) **"boş isim yerine varsayılan kullanılmaz — config'in sorumluluğu"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/user-repository.test.ts` (12 test)

1. (UserRepository (developer rolü migration — 2026-08-30)) **"initialize users DDL'ini oluşturur (developer CHECK dahil)"**
2. (UserRepository (developer rolü migration — 2026-08-30)) **"initialize eski kurulumlar için role CHECK constraint'ini yeniler (idempotent)"**
3. (UserRepository (developer rolü migration — 2026-08-30)) **"create satırı döndürür; satır gelmezse hata fırlatır"**
4. (UserRepository (developer rolü migration — 2026-08-30)) **"findById yoksa undefined döner"**
5. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"totpSecretByUserId: satır yok/null ise undefined"**
6. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"setTotpSecret: yeni sır yazılırken mfa_enabled FALSE'a düşer (yeniden kayıt sözleşmesi)"**
7. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"enableMfa satır döndürür; satır yoksa hata fırlatır"**
8. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"disableMfa: mfa_enabled FALSE + sır NULL + kurtarma kodları silinir; satır yoksa hata"**
9. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"storeRecoveryCodes: önce tüm eski kodlar silinir, sonra her hash INSERT edilir"**
10. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"consumeRecoveryCode: kullanılmamış kod 1 satır etkiler → true; kullanılmış → false (tek kullanımlık SQL koşulu)"**
11. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu) > UserRepository refresh token hash (K4 — 2026-09-23)) **"storeRefreshToken DB'ye SHA-256 hash yazar — düz metin DEĞİL (AK-4.1)"**
12. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu) > UserRepository refresh token hash (K4 — 2026-09-23)) **"findByRefreshToken gelen token'ı hash'leyip eşleştirir (AK-4.1)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/realtime/realtime-manager.test.ts` (11 test)

1. (RealtimeManager (Faz 5.1 B1)) **"büyük parti (isim sayısı > RING_BUFFER_MAX) tamamen korunur — B1 regresyonu"**
2. (RealtimeManager (Faz 5.1 B1)) **"küçük partiler RING_BUFFER_MAX'ta kesilir (geçmiş korunur)"**
3. (RealtimeManager (Faz 5.1 B1)) **"tek kayıt writeToRingBuffer trim sınırında kalır"**
4. (RealtimeManager (Faz 5.1 B1)) **"ringBuffer en-yeni-önce sıralı JSON nesneleri döner"**
5. (RealtimeManager (Faz 5.1 B1)) **"ringBuffer bozuk JSON'u ham string olarak döndürür"**
6. (RealtimeManager (Faz 5.1 B1)) **"broadcast yalnızca OPEN soketlere JSON gönderir"**
7. (RealtimeManager (Faz 5.1 B1)) **"subscribe/unsubscribe abone defterini tutarlı tutar"**
8. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"names ile broadcast yalnız istenen isimleri yollar"**
9. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"names yoksa tüm satırlar gider (geriye uyumlu)"**
10. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"eşleşen isim yoksa gönderim atlanır"**
11. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"sendInitialData yalnız istenen isimlerin en yenisini yollar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/realtime/ws-routes.test.ts` (7 test)

1. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"token'sız handshake 401 ile reddedilir"**
2. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"geçersiz token 401 ile reddedilir"**
3. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"geçerli access token bağlanır; subscribe → subscribed + initial data"**
4. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"tünel oturum token'ı sessionStore üzerinden kabul edilir (Faz 3)"**
5. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"unsubscribe → unsubscribed karşılığı döner"**
6. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"malform JSON mesajı error tipi yanıt üretir (bağlantı kopmaz)"**
7. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"kapanışta realtime.unsubscribeAll çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/wireguard/wg-host-store.test.ts` (4 test)

1. (WgHostStore (Faz 4)) **"list çıktısında psk alanı YOKTUR"**
2. (WgHostStore (Faz 4)) **"create PSK'yı SQL'e yazar ama çıktıya düşürür"**
3. (WgHostStore (Faz 4)) **"byIdWithPsk iç kullanım için PSK döner (yalnızca bağlantı kurarken)"**
4. (WgHostStore (Faz 4)) **"remove DELETE çalıştırır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/wireguard/wireguard-connection.test.ts` (5 test)

1. (WireGuardConnection (Faz 4)) **"connect driver.up'ı PSK'lı peer config'iyle çağırır"**
2. (WireGuardConnection (Faz 4)) **"disconnect idempotent down döner"**
3. (WireGuardConnection (Faz 4)) **"removeHost önce down sonra siler"**
4. (WireGuardConnection (Faz 4)) **"yoksa NotFoundError (kind not_found)"**
5. (WireGuardConnection (Faz 4)) **"driver.up hatası üste taşınır (kademeli bozulma — state düşmez)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/error-handler.test.ts` (7 test)

1. (error-handler (T0.6) > DomainError eşlemesi) **"${c.name} → ${c.status}"**
2. (error-handler (T0.6) > DomainError eşlemesi) **"ZodError → 400 (mevcut davranış korunur)"**
3. (error-handler (T0.6) > DomainError eşlemesi) **"bilinmeyen hata → 500 genel mesaj — stack sızmaz"**
4. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"beklenen hata app kanalında warn ile loglanır"**
5. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"unauthorized güvenlik kanalında loglanır"**
6. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"beklenmeyen hata app kanalında error ile loglanır"**
7. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"log() hatası istemciye yansımaz (yanıt yine de gönderilir)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/log-rate-limiter.test.ts` (4 test)

1. (LogRateLimiter (T0.8)) **"limit altında izin verir"**
2. (LogRateLimiter (T0.8)) **"limit aşılınca reddeder"**
3. (LogRateLimiter (T0.8)) **"farklı anahtarlar birbirini etkilemez"**
4. (LogRateLimiter (T0.8)) **"pencere dolunca sıfırlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/rbac.test.ts` (40 test)

1. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"PUBLIC_PREFIXES JWT'siz geçer"**
2. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"Bearer yoksa 401"**
3. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"geçersiz token → 401"**
4. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/auth/users yalnızca admin'e açık — teknik 403"**
5. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/auth/users admin için açık"**
6. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: /api/fields guest için AÇIK (saha dashboard salt-okunur)"**
7. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: /api/fields developer için AÇIK"**
8. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/fields boss için açık"**
9. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/admin/fields izin satırı kaldırıldı (2026-08-28) — rbac serbest, uç yok (404)"**
10. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/data/ beş role de açık (guest + developer dahil)"**
11. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: developer /api/commands için KAPALI (403) — salt-okunur rol"**
12. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: developer /api/auth/users için KAPALI (403)"**
13. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands guest için KAPALI (403) — delik kapatıldı"**
14. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands teknik için AÇIK"**
15. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands admin için AÇIK"**
16. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-28: /api/fields mutasyon izin satırı kaldırıldı — rbac 403 ÜRETMEZ (uçlar kaldırıldı, gerçek sistemde 404)"**
17. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/fields GET teknik için AÇIK (okuma korunur)"**
18. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"izinsiz yol (tabloda yok) doğrulanmış kullanıcıya açıktır"**
19. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"geçerli container_session cookie'si Bearer'sız erişir"**
20. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"sessionCookieName: field_session — boss field oturumu Bearer'sız erişir"**
21. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"field tünel yolları JWT'siz erişilir (cookie doğrulama route'ta — Boss Faz 3)"**
22. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"geçersiz oturum cookie'si → 401 (fail-closed)"**
23. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"oturum kullanıcısına rol izinleri uygulanır (guest → komut 403)"**
24. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"oturum kullanıcısında mustChangePassword uygulanmaz"**
25. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"2026-08-30: guest mustChangePassword enforcement'ından MUAFTIR (otomatik misafir girişi)"**
26. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"mustChangePassword olan teknik 403 alır (T1.6 korunur)"**
27. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"cookie yoksa Bearer akışı korunur"**
28. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"T3.3: /api/fields/ POST (session) teknik'e açık; 2026-08-30: guest/developer da AÇIK (birebir tünel eşlemesi)"**
29. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"tünel yolları PUBLIC'dir (cookie auth route katmanında)"**
30. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA kaydı olmayan admin veri uçlarına 403 alır (MFA kaydi gerekli)"**
31. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA allowlist yolları (enroll/confirm/logout/session) açık kalır"**
32. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA kayıtlı admin (mfaEnabled=true) veri uçlarına girer"**
33. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"zorunlu liste dışındaki roller etkilenmez (boss/guest)"**
34. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"mfaRequiredRoles boşsa enforcement KAPALI (container tier davranışı)"**
35. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"session kullanıcısında MFA enforcement UYGULANMAZ (pinleme — regresyon koruması)"**
36. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"PUBLIC_PREFIX segment sınırı: benzer ama farklı yollar JWT'siz 401 döner"**
37. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"PUBLIC yollar query param'la da geçer (401 DEĞİL — rota yoksa 404)"**
38. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"mustChangePassword + MFA zorunluluğu birlikte: ÖNCE şifre değişimi 403 döner (öncelik pinleme)"**
39. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"session yolu method eşleşmezse rbac serbesttir (uç yoksa 404 — pinleme)"**
40. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"developer MFA zorunlu listesinde değilse enforcement'dan etkilenmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/request-context.test.ts` (9 test)

1. (RequestContext (T0.6)) **"run içinde current() id'yi döner"**
2. (RequestContext (T0.6)) **"run dışında current() undefined döner"**
3. (RequestContext (T0.6)) **"run dönüş değerini aynen iletir"**
4. (RequestContext (T0.6)) **"run async fn'i destekler"**
5. (RequestContext (T0.6)) **"iç içe run içteki id'yi kullanır, dışarıda dıştaki geçerli kalır"**
6. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"başlık yoksa id üretir, yanıta yazar ve bağlama kurar"**
7. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"gelen X-Request-Id başlığını kullanır ve yankılar"**
8. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"boş başlık üretilmiş id ile değiştirilir"**
9. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"üretim fonksiyonu yoksa UUID formatı üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/admin-routes.test.ts` (15 test)

1. (admin-routes (T0.6 karakterizasyon)) **"GET / → 200 liste"**
2. (admin-routes (T0.6 karakterizasyon)) **"GET /:id — yoksa 404"**
3. (admin-routes (T0.6 karakterizasyon)) **"POST / → 201"**
4. (admin-routes (T0.6 karakterizasyon)) **"POST / — fieldType poller'a geçer (harita glifi)"**
5. (admin-routes (T0.6 karakterizasyon)) **"PUT /:id — fieldType güncellemeye geçer"**
6. (admin-routes (T0.6 karakterizasyon)) **"PUT /:id — yoksa 404"**
7. (admin-routes (T0.6 karakterizasyon)) **"PUT /:id — updateField Field not found → 404"**
8. (admin-routes (T0.6 karakterizasyon)) **"PUT /:id — beklenmeyen hata sınıra yayılır (rethrow)"**
9. (admin-routes (T0.6 karakterizasyon)) **"DELETE /:id → 200 {success}"**
10. (admin-routes (T0.6 karakterizasyon)) **"GET /:id/summary — saha API erişilemezse 502"**
11. (admin-routes (T0.6 karakterizasyon)) **"GET / — registry bağlıysa status online + last_seen_at (S1 overlay)"**
12. (admin-routes (T0.6 karakterizasyon)) **"GET / — bağlı sahanın boş özeti DEMO değerlerle dolar (field→cloud push öncesi)"**
13. (admin-routes (T0.6 karakterizasyon)) **"GET / — bağlı sahanın dolu özeti DEMO ile EZİLMEZ"**
14. (admin-routes (T0.6 karakterizasyon)) **"GET / — registry bağlı değilse DB durumu korunur"**
15. (admin-routes (T0.6 karakterizasyon)) **"GET /:id — registry bağlıysa overlay uygulanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/alarm-routes.test.ts` (7 test)

1. (alarm-routes (Faz 0 eki)) **"GET /alarms — aktif + kapananlar birleşik döner"**
2. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — teknik: audit log + DB güncellemesi"**
3. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — admin de çözebilir"**
4. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — guest 403"**
5. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — aktif olmayan alarm 409"**
6. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — audit log fail-closed: yazılamazsa 500 + DB'ye GİDİLMEZ"**
7. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — eksik gövde 400"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/auth-routes.test.ts` (31 test)

1. (Auth Routes (Fastify integration) > POST /login) **"returns 200 with tokens on valid credentials"**
2. (Auth Routes (Fastify integration) > POST /login) **"returns 400 when username is empty"**
3. (Auth Routes (Fastify integration) > POST /login) **"returns 400 when password is empty"**
4. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 200 with new tokens"**
5. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 401 when refresh token is invalid"**
6. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"K5: imza geçerli + DB'de yok → 401 + clearRefreshToken (reuse tespiti)"**
7. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 400 when refreshToken is empty"**
8. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users) **"returns 200 with user list"**
9. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id) **"returns 200 with user by id"**
10. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id) **"returns 404 when user not found"**
11. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 201 on successful create"**
12. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 400 when role is invalid"**
13. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"2026-08-30: developer rolü GEÇERLİDİR (201)"**
14. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 400 when password is too short"**
15. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id) **"returns 200 on successful delete"**
16. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout) **"route is registered"**
17. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"geçerli istek → 200 + yeni token'lar"**
18. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"kısa yeni şifre → 400 (zod)"**
19. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"yanlış eski şifre → 400"**
20. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"kimlik çözülmüşse kullanıcı + tunnel bayrağı döner (cookie yok → false)"**
21. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"container_session cookie'si varsa tunnel true"**
22. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"kimlik çözülmemişse 401"**
23. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — başarılı akışta 200 + token döner"**
24. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — use case fail → 401"**
25. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — T1.6: TOTP deneme kilidi → 429"**
26. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — bozuk gövde → 400"**
27. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/enroll — 200 + secret/uri döner"**
28. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/confirm — 200 + kurtarma kodları döner"**
29. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/reset — admin değilse 403; admin ise 200"**
30. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/reset — userId yoksa 400"**
31. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"T6.6: login kilitli hesap → 429"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/command-routes.test.ts` (14 test)

1. (command-routes (T0.6)) **"POST /execute — geçersiz gövde → 400 (zod)"**
2. (command-routes (T0.6)) **"POST /execute — bilinmeyen cihaz → 404"**
3. (command-routes (T0.6)) **"POST /execute — zorunlu param eksik → 400"**
4. (command-routes (T0.6)) **"POST /execute — başarılı → 200"**
5. (command-routes (T0.6)) **"POST /execute — mq başarısız → 422"**
6. (command-routes (T0.6)) **"POST /execute-multi — parallel başarılı → 200"**
7. (command-routes (T0.6)) **"POST /execute-multi — onFailure=stop sequential ilk hatada durur"**
8. (command-routes (T0.6)) **"GET /:deviceId/commands — config yoksa boş liste"**
9. (command-routes (T0.6)) **"GET /:deviceId/commands → 200 {commands}"**
10. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"başarılı adımda stop job'ı delay ile planlanır + timer_scheduled audit"**
11. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"timer.stopCommand özel komutu çözümlenir"**
12. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"komut BAŞARISIZSA planlama YAPILMAZ"**
13. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"logger yoksa console bilgi çıktısı (geriye uyumlu)"**
14. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"planlama hatası → timer_schedule_failed audit"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/data-routes.test.ts` (13 test)

1. (data-routes karakterizasyon (mevcut davranış)) **"GET /devices → 200 {devices}"**
2. (data-routes karakterizasyon (mevcut davranış)) **"GET /devices — hata → 500 genel mesaj"**
3. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/latest → 200 {telemetries}"**
4. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/range — from/to yoksa 400"**
5. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/range → 200 {telemetries}"**
6. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/downsampled — from/to yoksa 400"**
7. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate — fn geçersizse 400"**
8. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate → 200 {buckets}"**
9. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate — hata → 500"**
10. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"geçersiz tags JSON → ValidationError → 400 (önceki davranış: 500)"**
11. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"geçerli tags JSON ayrıştırılır ve sorguya iletilir"**
12. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"route içinde console hata logu yoktur — altyapı hatası sınıra ulaşır"**
13. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"sınır logu altyapı hatasını request_failed olarak kaydeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/device-routes.test.ts` (2 test)

1. (device-routes (T0.6 + Faz 5.1 B3)) **"GET /devices → 200 {devices}"**
2. (device-routes (T0.6 + Faz 5.1 B3)) **"DB hatası → 200 {devices: []} (Faz 5.1 B3 — kademeli bozulma)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-container-command.spec.ts` (4 test)

1. (field-container-command.spec — çapraz yığın komut (WS4 D3)) **"field → tünel → konteyner upstream → doğrulanmış sonuç geri döner"**
2. (field-container-command.spec — çapraz yığın komut (WS4 D3)) **"trace başlığı upstream'e ulaşır (D1 — çapraz audit eşlemesi)"**
3. (field-container-command.spec — çapraz yığın komut (WS4 D3)) **"internal token programatik kanalı açar (system kullanıcısı)"**
4. (field-container-command.spec — çapraz yığın komut (WS4 D3)) **"yanlış internal token → 403; upstream'e İSTEK GİTMEZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-container-commands.test.ts` (13 test)

1. (field-container-commands (D3)) **"yetki yok (token/user yok) → 403; oturum/stream açılmaz"**
2. (field-container-commands (D3)) **"yanlış internal token → 403 (fail-closed)"**
3. (field-container-commands (D3)) **"Bearer admin kullanıcı → kabul; guest → 403"**
4. (field-container-commands (D3)) **"konteyner connected değilse 503 — oturum/stream açılmaz"**
5. (field-container-commands (D3)) **"mevcut oturum yeniden kullanılır — programatik açılış YOK"**
6. (field-container-commands (D3)) **"oturum yoksa system kullanıcısıyla programatik açılır"**
7. (field-container-commands (D3)) **"stream: POST /api/commands/execute-multi + trace + cookie başlıkları"**
8. (field-container-commands (D3)) **"upstream yanıtı AYNEN döner (200 → gövde)"**
9. (field-container-commands (D3)) **"upstream 422 → durum kodu aynen, gövde aynen"**
10. (field-container-commands (D3)) **"audit field_container_command — traceId bağlamda"**
11. (field-container-commands (D3)) **"audit hatası akışı KESMEZ (best-effort)"**
12. (field-container-commands (D3)) **"stream destroy (kopma) → 502"**
13. (field-container-commands (D3)) **"x-gd-trace-id yoksa üretilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-routes.test.ts` (15 test)

1. (field-routes karakterizasyon (mevcut davranış)) **"T1.3: boş fieldIds'li teknik /:fieldId/containers erişEMEZ (403)"**
2. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/summary → 200 yapı"**
3. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/containers → 200 + connectionStatus"**
4. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: containers → gerçek lastSeenAt + stale durumu"**
5. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: containers → lastSeenAt yoksa alan yok"**
6. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: summary → gerçek lastSeenAt + stale ≠ connected"**
7. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/telemetry/latest → 200"**
8. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/telemetry/downsampled — proxy yoksa {} (kademeli)"**
9. (field-routes karakterizasyon (mevcut davranış)) **"2026-08-28: saha registry uçları KALDIRILDI — POST/PUT/DELETE 404"**
10. (field-routes karakterizasyon (mevcut davranış)) **"2026-08-28: saha listesi ucu KALDIRILDI — GET / 404"**
11. (field-routes karakterizasyon (mevcut davranış)) **"T1.2: register endpoint'i admin için 201 — yalnızca hash saklanır"**
12. (field-routes karakterizasyon (mevcut davranış)) **"T1.2: kısa token → 400"**
13. (field-routes karakterizasyon (mevcut davranış)) **"2026-08-30: payload'daki containerUrl YOK SAYILIR — 201 + DB'ye yazılmaz"**
14. (field-routes karakterizasyon (mevcut davranış)) **"T1.2: teknik → 403"**
15. (field-routes karakterizasyon (mevcut davranış)) **"T1.2: bilinmeyen saha → 404"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-session-routes.test.ts` (7 test)

1. (field-session-routes (Faz 3)) **"POST /:fid/session → 200 + redirectUrl + Path-scoped cookie"**
2. (field-session-routes (Faz 3)) **"gateway hatası → 503 (transient)"**
3. (field-session-routes (Faz 3)) **"DELETE /:fid/session → açık oturum yoksa 404"**
4. (field-session-routes (Faz 3)) **"/fields/:fid/ui/* → cookie'siz 401"**
5. (field-session-routes (Faz 3)) **"/fields/:fid/ui/* → oturumlu ama allowlist dışı 403"**
6. (field-session-routes (Faz 3)) **"FIELD_TUNNEL_ALLOWED_PREFIXES ek önekleri — /src/ gibi dev asset yolu geçer"**
7. (field-session-routes (Faz 3)) **"/fields/:fid/ui/ws/* → cookie'siz 1008 kapanışı"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/health-route.test.ts` (2 test)

1. (health-route (T0.10)) **"sağlıklı logger → status ok + log yansıması"**
2. (health-route (T0.10)) **"error drop sonrası → status degraded + sayaç"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/log-routes.test.ts` (10 test)

1. (log-routes (T0.6)) **"GET / → 200 {logs}"**
2. (log-routes (T0.6)) **"GET / — sorgu parametreleri repo'ya iletilir"**
3. (log-routes (T0.6)) **"POST / → 201"**
4. (log-routes (T0.6)) **"POST / — eksik alan → 400 (mevcut davranış korunur)"**
5. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"POST / { events: [...] } → 201 {accepted}"**
6. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"POST / events boşsa 400"**
7. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"rate-limit aşılınca 429"**
8. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"rateLimiter yoksa limitsizdir (geriye uyumlu)"**
9. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"GET / — altyapı hatası sınıra ulaşır, route console.error kullanmaz"**
10. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"sınır logu altyapı hatasını correlationId ile kaydeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/maneuver-routes.test.ts` (17 test)

1. (maneuver/operation rotaları — yetki) **"yetki yok → 403 (tüm uçlar)"**
2. (maneuver/operation rotaları — yetki) **"Bearer admin/teknik kabul; guest 403"**
3. (maneuver/operation rotaları — yetki) **"geçerli iç token kabul; yanlış token 403 (fail-closed)"**
4. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"GET /maneuvers + /operations registry listesini döner"**
5. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"POST /maneuvers/:name/execute: executor argümanları + 200"**
6. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"HTTP eşlemesi: not_found 404 / missing_param 400 / persist 503 / failed 422"**
7. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"rolled_back → 200 (terminal durum alanıyla)"**
8. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"GET /operations/runs + /runs/:id (yok → 404)"**
9. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"teknik/guest tanım YÖNETİMİNE erişemez (403) — yürütme erişebilir"**
10. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"bozuk tanım → 400 (persist anında zod — kaydedilmez)"**
11. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"mükerrer kayıt → 409; audit + persist zinciri"**
12. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"audit FAIL-CLOSED: audit yazılamazsa tanım REDDEDİLİR (§11.2)"**
13. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"PUT: isim uyuşmazlığı 400; başarılı güncelleme 200"**
14. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"DELETE: yumuşak silme (enabled=false); yoksa 404"**
15. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"operasyon tanımı: bozuk şema 400; geçerli 201"**
16. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2) > yürütme rotaları — 15 sn → 202 (KURAL-MOTORU-V2 §3.2)) **"uzun yürütme → 202 {status:running}; yürütme arka planda sürer"**
17. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2) > yürütme rotaları — 15 sn → 202 (KURAL-MOTORU-V2 §3.2)) **"hızlı yürütme → normal sonuç (202 DEĞİL)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/market-routes.test.ts` (4 test)

1. (market-routes (Faz 2)) **"GET /ptf → 200 seri noktaları + lastUpdatedAt"**
2. (market-routes (Faz 2)) **"GET /gip-weighted-average → 200"**
3. (market-routes (Faz 2)) **"GET /summary → son değerler + gün ortalaması"**
4. (market-routes (Faz 2)) **"veri yoksa summary null döner (kademeli bozulma — UI bozulmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/notification-routes.test.ts` (5 test)

1. (notification-routes (Faz 5)) **"GET / → 200 liste"**
2. (notification-routes (Faz 5)) **"limit 500 üstü sınıra çekilir"**
3. (notification-routes (Faz 5)) **"after parametresi aktarılır (son görülme sınırı)"**
4. (notification-routes (Faz 5)) **"GET /unread-count?since → { count }"**
5. (notification-routes (Faz 5)) **"since yoksa 400"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/operation-boss-routes.test.ts` (5 test)

1. (operationBossRoutes (C2b)) **"admin → requester.send (uuid operationId + params + trace) → 200 {result}"**
2. (operationBossRoutes (C2b)) **"teknik kabul; guest/anonim 403; iç token kabul"**
3. (operationBossRoutes (C2b)) **"requester yoksa 503 (tier uyuşmazlığı)"**
4. (operationBossRoutes (C2b)) **"timeout (undefined) → 503 operation_timeout"**
5. (operationBossRoutes (C2b)) **"rejected sonuç AYNEN döner (200 + status)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/session-routes.test.ts` (6 test)

1. (session-routes (T3.3)) **"POST session → 302 + Path-scoped HttpOnly cookie + open-session"**
2. (session-routes (T3.3)) **"gateway conflict → 409"**
3. (session-routes (T3.3)) **"teknik fieldIds'siz saha için 403"**
4. (session-routes (T3.3)) **"DELETE session → açık oturum kapatılır (200); yoksa 404"**
5. (session-routes (T3.3)) **"tünel HTTP: cookie'siz 401; yasaklı yol 403; geçerli → proxy akışı"**
6. (session-routes (T3.3)) **"tünel WS: geçersiz oturum 1008 ile kapanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/status-route.test.ts` (3 test)

1. (status-route (T2.2)) **"bağlı connector → connected true + state + heartbeat"**
2. (status-route (T2.2)) **"heartbeat hiç atılmadıysa lastHeartbeatAt yoktur"**
3. (status-route (T2.2)) **"connector yoksa kapalı durum bildirir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/unified-routes.test.ts` (17 test)

1. (unified-routes (T0.6)) **"GET /telemetry/latest → 200 {telemetries}"**
2. (unified-routes (T0.6)) **"GET /telemetry/latest — kısmi başarı: cihaz hatası warn + boş sonuç (allSettled korunur)"**
3. (unified-routes (T0.6)) **"GET /telemetry/downsampled — from/to yoksa 400"**
4. (unified-routes (T0.6)) **"GET /telemetry/downsampled → 200"**
5. (unified-routes (T0.6)) **"GET /telemetry/:deviceId → 200 {deviceId, interval, dataPointCount, data}"**
6. (unified-routes (T0.6)) **"GET /devices/:deviceId/telemetry-config — config yoksa 404"**
7. (unified-routes (T0.6)) **"GET /devices/:deviceId/telemetry-config → 200"**
8. (unified-routes (T0.6)) **"GET /timeseries/hypertables → 200 {hypertables}"**
9. (unified-routes (T0.6)) **"GET /timeseries/hypertables/:name → 200"**
10. (unified-routes (T0.6)) **"GET /timeseries/materialized-views → 200"**
11. (unified-routes (T0.6)) **"POST /timeseries/materialized-views — hypertable yoksa 400"**
12. (unified-routes (T0.6)) **"POST /timeseries/materialized-views → 200"**
13. (unified-routes (T0.6)) **"GET /projects → 200 {projects}"**
14. (unified-routes (T0.6)) **"POST /projects → 201 {id}"**
15. (unified-routes (T0.6)) **"PUT /projects/:id → 200"**
16. (unified-routes (T0.6)) **"DELETE /projects/:id → 200 {success}"**
17. (unified-routes (T0.6)) **"altyapı hatası sınıra ulaşır — console.error yok, 500"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/wireguard-routes.test.ts` (5 test)

1. (wireguard-routes (Faz 4)) **"GET / → 200 host listesi"**
2. (wireguard-routes (Faz 4)) **"POST / → 201"**
3. (wireguard-routes (Faz 4)) **"PUT /:id → yoksa 404"**
4. (wireguard-routes (Faz 4)) **"POST /:id/connect → state up"**
5. (wireguard-routes (Faz 4)) **"connect NotFoundError → 404"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

