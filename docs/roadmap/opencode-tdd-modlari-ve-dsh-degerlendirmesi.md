# OpenCode TDD Modları (Tab) ve DeepSeek Harness Değerlendirmesi

> Durum: **ÖNERİ** (2026-11-02) — uygulama onayı bekliyor.
> Kapsam: OpenCode TUI'de aşama başına ayrı sekme + model rotası; DeepSeek Harness (DSH)
> alternatifinin bu ihtiyaç için uygunluğu.
> Kaynak: `AGENTS.md` (TDD iş akışı), `.opencode/opencode.json`, `.opencode/agents/*`,
> OpenCode agents dokümanı, DSH dokümanları (deepseek-harness.github.io).

## 1. Sorun

Mevcut kurulumda OpenCode TUI'de **Tab yalnızca `plan` ↔ `build`** arasında geçiyor.
TDD akışının aşamaları tek bir mode'a sıkışıyor:

| Aşama | İstenen model | Mevcut durum |
| :--- | :--- | :--- |
| SPEC / plan | pro | `plan` modu ✅ |
| KIRMIZI test yazımı | pro | `build` (flash) içinde kalıyor ❌ |
| YEŞİL implementasyon | flash | `build` ✅ |
| Review / KAPANIŞ | pro, subagentsiz ayrı mod | sadece `@reviewer` subagent ✅/❌ |

İhtiyaç: her aşamaya Tab ile geçilen, görünür (renkli) bir sekme ve aşamaya sabitlenmiş model.

## 2. Çözüm — OpenCode custom primary agent'lar

OpenCode'ta `mode: "primary"` olan her agent **TUI'de Tab ile geçilen sekme** olur
(`switch_agent` keybind ile de geçilebilir) ve kendi `model`, `prompt`, `permission`,
`color` değerlerini taşır. "2 mod" gibi bir limit yoktur; limit yalnızca tanımlı
agent sayısıdır.

Hedef sekme seti:

| Sekme | Model | Renk | Görev |
| :--- | :--- | :--- | :--- |
| `plan` | `opencode-go/deepseek-v4-pro` | info | SPEC/JSDoc, kod değişikliği yok |
| `test` | `opencode-go/deepseek-v4-pro` | warning | KIRMIZI test yazımı; implementasyon YASAK |
| `build` | `opencode-go/deepseek-v4.1-flash` | success | YEŞİL implementasyon |
| `review` | `opencode-go/deepseek-v4-pro` | error | KAPANIŞ §A/§B; read-only (doküman hariç) |

Not: `reviewer` agent'ı `mode: "all"` yapıldığında hem Tab sekmesi olur hem de
`@reviewer` ile subagent olarak çağrılabilir. AGENTS.md'deki KAPANIŞ otomasyonu ve
`.opencode/commands/kapanis` akışı bozulmaz.

## 3. Uygulama adımları

1. **`.opencode/agents/test.md` (yeni)** — `mode: primary`, model pro; prompt TDD
   sözleşmesi: JSDoc → test yaz → kırmızı doğrula → dur. Permission: `edit: allow`
   (test dosyaları), `bash: allow` (vitest). Implementasyon talimatı verilmez.
2. **`.opencode/agents/review.md` (yeni) veya `reviewer.md` dönüşümü** — `mode: all`,
   model pro; mevcut reviewer prompt'u (KAPANIŞ §A DOĞRULAMA + §B TEST KAPSAMI,
   `#sembol` referansı, satır numarası yasağı, `spec:check` kapısı). `edit: allow`
   yalnızca `docs/architecture/**`; diğer edit'ler `deny`.
3. **`.opencode/opencode.json`** — mevcut `plan`/`build` girdilerine `color`;
   `test`/`review` modelleri markdown frontmatter'da taşınır, JSON'da tekrar gerekmez.
4. **Doğrulama** — `opencode agent list` ile 4 primary agent; TUI'de Tab döngüsü;
   `@reviewer` hâlâ çalışıyor mu; `test` sekmesinde vitest kırmızı koşusu.

## 4. DeepSeek Harness (DSH) değerlendirmesi

**Sonuç: interaktif terminal-TUI ihtiyacı için uygun değil (bugün).**

- DSH'de `apps/` yalnızca `cli`, `web`, `desktop`, `desktop-host` içeriyor; **TUI yok**.
  CLI README'deki `dsh --profile tui` yalnızca "kuruluysa" örneği (varsayımsal).
- Terminal seçenekleri: `dsh web` (tarayıcı), `--profile headless` (tek seferlik,
  REPL yok), `--profile acp` (editör istemcisi), `--profile sdk` (JSON-RPC).
- İstenen model rotası DSH'de teknik olarak var: subagent `agentOptions`
  (provider/model/reasoning-effort override), `agentRouteDefaults`,
  `ctx.subagentModelSelection`, agent preset'leri, yerleşik plan mode.
- Ancak **developer preview**: "THERE WILL BE COMPATIBILITY-BREAKING CHANGES" uyarısı
  mevcut. Plugin API'leri kırılabilir.

**Ne zaman tekrar bakılır:** interaktif TUI yayınlanırsa veya topluluk `dsh-plugin`
topic'inde olgun bir TUI profili çıkarsa; ayrıca headless/schedule tabanlı otomasyon
(ör. CI içinde KAPANIŞ üretimi, periyodik monitor-ci) için DSH ayrı bir hat olarak
değerlendirilebilir.

## 5. Açık kararlar

- **A-1:** `review` sekmesi KAPANIŞ dosyasını kendisi mi yazsın (`edit: allow`,
  yalnızca `docs/architecture/**`), yoksa salt-okunur mu olsun (raporu üretir, yazımı
  geliştirici yapar)? Öneri: kendisi yazsın — AGENTS.md akışıyla uyumlu.
- **A-2:** `test` sekmesinde implementasyon dosyalarına `edit: deny` mi, yoksa
  "önce test, sonra dur" prompt kuralı mı? Sert kapı için `deny` önerilir, ancak
  mevcut dosyayı düzenlemek gereken istisnalar için `ask` da olabilir.
- **A-3:** Sekme sırası (plan → test → build → review) OpenCode'un agent sıralamasına
  bağlı; uygulama sonrası Tab döngüsünde doğrulanacak.

## 6. Riskler

- Model kimlikleri (`opencode-go/deepseek-v4-pro`, `deepseek-v4.1-flash`) provider
  tarafında değişirse dört agent birlikte güncellenmeli.
- `mode: all` yapılan `reviewer` iki yönlü çağrılabilir hale gelir; prompt hem
  Tab oturumunda hem `@reviewer` subagent bağlamında tutarlı olmalı.
