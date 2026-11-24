# Claude Code — Repo Rehberi

> Bu dosya Claude Code içindir. Takımın ortak kaynağı `AGENTS.md`'dir; aşağıdaki
> import ile aynen yüklenir (AGENTS-* referansları dahil). OpenCode kurulumu
> `.opencode/`, Codex kurulumu `.codex/` altındadır — üçü de aynı repoda birlikte yaşar.

@AGENTS.md

## Claude Code'a özgü notlar

## Ön yüz kuralları
- PMS arayüz geliştirmeleri @apps/site içersinde yapılır
- EMS arayüz geliştirmeleri @apps/container içerisinde yapılır.

## Klasör kuralları
- Kod değişikliği yalnızca şu klasörlerde yapılır: @packages/simulators, @apps/container, @apps/site, @apps/sim-lab.
- **Doküman istisnası:** İş akışının SPEC / KAPANIŞ dokümanları için `docs/` klasörüne yazılabilir.
- **Claude yapılandırması:** `.claude/` (ajanlar, komutlar, ayarlar) düzenlenebilir.
- **Yasak alanlar:** `services/**` ve `packages/simulators` dışındaki tüm `packages/**`. Bu alanlarda değişiklik
  gerekirse dokunma, işi durdur ve GitHub Issue aç.
- **Issue açma:** Issue dışa dönük bir işlemdir — önce taslak (başlık + gerekçe + önerilen değişiklik) hazırlanır,
  developer onayı alındıktan sonra `gh issue create` ile açılır.

## İş akışının Claude Code uyarlaması
- AGENTS.md'deki DeepSeek/GLM model adları ve `~/.opencode/plan/` konumu OpenCode içindir; Claude Code'da aynı
  aşamalar (SPEC → onay → SÖZLEŞME+TEST → onay → IMPL+MUTASYON → REVIEW) bu oturumda yürütülür.
- **SPEC konumu:** SPEC doğrudan `docs/architecture/<MODUL>-MIMARISI.md` olarak açılır (Status `✏️ Specified`);
  plan konumu ve taşıma adımı Claude Code için uygulanmaz. Onay kapıları aynen geçerlidir.

### Aşama → model eşlemesi (maliyet)

OpenCode'daki "planı güçlü, kodu ucuz, review'u bir tık aşağı" düzeninin karşılığı:

| Aşama | OpenCode | Claude Code |
| :--- | :--- | :--- |
| 1. SPEC | DeepSeek V4 Pro | Ana oturum — **Opus** |
| 2. SÖZLEŞME + TEST | DeepSeek V4.1 Flash | `builder` alt ajanı — **Sonnet** (`.claude/agents/builder.md`) |
| 3. IMPL + MUTASYON | DeepSeek V4.1 Flash | `builder` alt ajanı — **Sonnet** |
| 4. REVIEW | Qwen 3.8 | `reviewer` alt ajanı — **Sonnet** (`.claude/agents/reviewer.md`) |

- Ana oturum SPEC'i yazar ve onay kapılarını yönetir. SPEC onaylanınca Aşama 2'yi, Aşama 2 onaylanınca
  Aşama 3'ü `builder`'a devreder (girdi: SPEC yolu + UC + aşama numarası). `builder` her aşama sonunda
  rapor verip durur; developer onayı ana oturumda alınır.
- Review, developer isteyince `reviewer` ile (veya `/kapanis`) koşar; otomatik başlatılmaz.
- Ana oturumda Opus yalnız planlama/teşhis için gerekir. Build/review devredildiğinde ana oturum
  model seçiciden Sonnet'e alınabilir (ek tasarruf).
- `builder` takılırsa (teşhis gerektiren ortam/mimari sorun) iş ana oturuma döner; ucuz modelle
  tekrar tekrar denenmez.

## Elegant Object — React istisnası
- React component'lerinin render etmeyeceği durumda `null` döndürmesi serbesttir; satıra
  `// ELEGANT-EXCEPTION: React component render etmiyor` yorumu eklenir.

### Nx (plugin'den gelir)
- `.claude/settings.json` içindeki `nx@nx-claude-plugins` marketplace'i etkindir:
  nx-mcp MCP sunucusu + nx skill'leri + `ci-monitor-subagent` plugin'den gelir.
  Bu repoda nx skill/subagent KOPYASI tutulmaz (tek kaynak Nx).
- CI izleme işleri için Nx plugin'inin `monitor-ci` skill'ini kullanın.

### Bu repoda taşınan özel parçalar
- `reviewer` subagent — `.claude/agents/reviewer.md` (KAPANIŞ dokümanı üretimi;
  AGENTS.md "Geliştirme İş Akışı" aşama 5).
- `/kapanis` komutu — `.claude/commands/kapanis.md`.
- opencode'a özgü JS plugin'leri (sonar-watch) burada yoktur.

### Ponytail (opsiyonel)
- Bu repo opencode'da ponytail (lazy senior dev modu) kullanır; Claude Code için
  otomatik kurulmaz. İstersen:
  `/plugin marketplace add DietrichGebert/ponytail` →
  `/plugin install ponytail@ponytail`.

### Kaynaklar
- Hızlı komutlar, test katmanları ve zorunlu iş akışı `AGENTS.md` + `TESTING.md`
  içindedir; buraya kopyalamayın.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->