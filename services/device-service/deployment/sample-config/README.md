# Device Service — Örnek Konfigürasyon

Bu dizin yalnızca **yol gösterici örnektir**. Servis imajına konfigürasyon
gömülmez; gerçek konfigürasyonlar runtime'da bind mount edilir.

- `service.json` — global servis ayarları (redis, poll interval, opsiyonel postgresql).
- `device-example.json` — tek MODBUS cihazı (telemetri; opsiyonel `bitfieldConfigs`,
  `alarms`, `connector`).

Cihaz konfigürasyonlarının **source of truth'u** kök `configs/` dizinidir — yeni
cihaz config'i **önce oraya gerçek alet adıyla** eklenir (örn. `flex-bsc.json`),
projede kullanılırken `deployment/<site>/<tier>/device-configs/`'e kopyalanır ve
yalnız projeye özgü değişkenler (host, port, slaveId, instance adı/id) değiştirilir.
Register listesi ve alarmlar projeye göre değişmez.

Şema: `packages/shared-types/src/schemas/device-config.ts`.
