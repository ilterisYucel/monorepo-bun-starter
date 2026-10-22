---
description: KAPANIŞ dokümanı üret (diff incelemesi + §A DOĞRULAMA + §B TEST KAPSAMI)
argument-hint: <modül adı veya değişiklik özeti>
---
KAPANIŞ aşaması (AGENTS.md "Geliştirme İş Akışı" 5/5).

`reviewer` subagent'ını Task ile çağır; diff'i ve test sonuçlarını inceleyip
`docs/architecture/<MODUL>-KAPANIS.md` dosyasını §A DOĞRULAMA + §B TEST KAPSAMI
formatında üretsin. Üretilen dosyada satır numarası referansı YASAK — kod
referansları `path/file.ts#sembol` biçiminde olmalı.

İstenen değişiklik/modül: $ARGUMENTS
