-- Ortak TimescaleDB — tek instance, tier başına ayrı veritabanı (AWS m6i.large RAM).
-- POSTGRES_DB=battery imaj tarafından oluşturulur (field tier). Konteyner tier'ları
-- için aşağıda ek DB'ler açılır. Initdb script'leri YALNIZCA boş veri dizininde
-- (ilk kurulum) çalışır. \gexec ile idempotent (PG14'te CREATE DATABASE IF NOT EXISTS yok).
--
-- ÖNEMLİ: `create_hypertable` için timescaledb uzantısı HER DB'de açık olmalı.
-- İmajın kendi init script'i yalnızca POSTGRES_DB'ye (battery) kurar — yeni
-- DB'ler için uzantıyı burada açıyoruz.

SELECT 'CREATE DATABASE container1'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'container1')\gexec

SELECT 'CREATE DATABASE container2'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'container2')\gexec

\connect container1
CREATE EXTENSION IF NOT EXISTS timescaledb;

\connect container2
CREATE EXTENSION IF NOT EXISTS timescaledb;

\connect battery
CREATE EXTENSION IF NOT EXISTS timescaledb;
