# Claude Code — Repo Rehberi

> Bu dosya Claude Code içindir. Takımın ortak kaynağı `AGENTS.md`'dir; aşağıdaki
> import ile aynen yüklenir (AGENTS-* referansları dahil). OpenCode kurulumu
> `.opencode/`, Codex kurulumu `.codex/` altındadır — üçü de aynı repoda birlikte yaşar.

@AGENTS.md

## Claude Code'a özgü notlar

### Nx (plugin'den gelir)
- `.claude/settings.json` içindeki `nx@nx-claude-plugins` marketplace'i etkindir:
  nx-mcp MCP sunucusu + nx skill'leri + `ci-monitor-subagent` plugin'den gelir.
  Bu repoda nx skill/subagent KOPYASI tutulmaz (tek kaynak Nx).
- CI izleme işleri için Nx plugin'inin `monitor-ci` skill'ini kullanın.

### Bu repoda taşınan özel parçalar
- `reviewer` subagent — `.claude/agents/reviewer.md` (KAPANIŞ dokümanı üretimi;
  AGENTS.md "Geliştirme İş Akışı" aşama 5).
- `/kapanis` komutu — `.claude/commands/kapanis.md`.
- `graphify` skill — `.claude/skills/graphify/`; `graphify-out/` varsa kod
  sorularında önce `graphify query "<soru>"` kullanın (AGENTS.md "graphify").
- opencode'a özgü JS plugin'leri (graphify bash hatırlatması, sonar-watch) burada
  yoktur; graphify hatırlatması bu dosyadaki satırla karşılanır.

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