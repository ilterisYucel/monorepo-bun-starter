#!/usr/bin/env bun
/**
 * GD-PMS dokümanlarını Wiki.js'e toplu aktaran import scripti.
 *
 * Kaynak: docs/{standards,architecture,product,analysis,decisions,process,roadmap}/*.md
 * Yalnızca frontmatter'da `status: active` olanlar aktarılır; archived/ ve diğerleri atlanır.
 * Frontmatter: status, space, tags (+ opsiyonel title/description).
 *
 * Kullanım:
 *   WIKI_URL=http://localhost:8090 WIKI_API_KEY=<key> bun tools/import-wiki.ts
 *   bun tools/import-wiki.ts --dry-run --url http://localhost:8090
 */

const WIKI_URL = process.env.WIKI_URL ?? "http://localhost:8090";
const API_KEY = process.env.WIKI_API_KEY ?? "";
const DOCS_ROOT = new URL("../docs/", import.meta.url).pathname;
const LOCALE = "tr";

const SPACES = [
  "standards",
  "architecture",
  "product",
  "analysis",
  "decisions",
  "process",
  "roadmap",
];

interface PageMeta {
  status: string;
  space: string;
  tags: string[];
}

interface ImportCandidate {
  file: string;
  title: string;
  path: string;
  content: string;
  description: string;
  tags: string[];
}

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const urlFlagIdx = args.indexOf("--url");
const wikiUrl = urlFlagIdx >= 0 ? args[urlFlagIdx + 1] : WIKI_URL;

function slugify(input: string): string {
  const charMap: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const mapped = input
    .split("")
    .map((c) => charMap[c] ?? c)
    .join("")
    .toLowerCase();
  const slug = mapped
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "sayfa";
}

function parseFrontmatter(raw: string): { meta: PageMeta | null; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: null, body: raw };
  const meta: Partial<PageMeta> = {};
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const value = rest.join(":").trim();
    if (key.trim() === "status") meta.status = value.replace(/['"]/g, "");
    if (key.trim() === "space") meta.space = value.replace(/['"]/g, "");
    if (key.trim() === "tags") {
      meta.tags = value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((t) => t.trim().replace(/['"]/g, ""))
        .filter(Boolean);
    }
  }
  if (!meta.status || !meta.space) return { meta: null, body: match[2] };
  return { meta: meta as PageMeta, body: match[2] };
}

function extractTitleAndDescription(body: string, fallbackTitle: string): { title: string; description: string } {
  const lines = body.split("\n");
  let title = "";
  const contentStart = lines.findIndex((l) => l.startsWith("# "));
  if (contentStart >= 0) title = lines[contentStart].replace(/^#\s+/, "").trim();
  if (!title) title = fallbackTitle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  let description = "";
  for (let i = contentStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith(">") || line.startsWith("|") || line.startsWith("```")) continue;
    description = line.replace(/[*_`]/g, "").slice(0, 240);
    break;
  }
  return { title, description };
}

async function gql(query: string, variables?: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${wikiUrl}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
  return json.data;
}

async function listExistingSlugs(): Promise<Set<string>> {
  const data = await gql(`query { pages { list(orderBy: CREATED, limit: 10000) { slug } } }`);
  return new Set(data.pages.list.map((p: { slug: string }) => p.slug));
}

async function createPage(candidate: ImportCandidate, withTags: boolean): Promise<void> {
  const mutation = `
    mutation CreatePage(
      $content: String!, $description: String!, $editor: String!,
      $isPublished: Boolean!, $isPrivate: Boolean!, $locale: String!,
      $path: String!, $tags: [String]!, $title: String!
    ) {
      pages {
        create(
          content: $content, description: $description, editor: $editor,
          isPublished: $isPublished, isPrivate: $isPrivate, locale: $locale,
          path: $path, tags: $tags, title: $title
        ) {
          responseResult { succeeded slug message }
        }
      }
    }`;
  await gql(mutation, {
    content: candidate.content,
    description: candidate.description,
    editor: "markdown",
    isPublished: true,
    isPrivate: false,
    locale: LOCALE,
    path: candidate.path,
    tags: withTags ? candidate.tags : [],
    title: candidate.title,
  });
}

async function main(): Promise<void> {
  if (!API_KEY && !isDryRun) {
    console.error("WIKI_API_KEY tanımlı değil. Admin > API Access'ten key üretip env'e ekle.");
    process.exit(1);
  }

  const candidates: ImportCandidate[] = [];
  for (const space of SPACES) {
    const dir = `${DOCS_ROOT}${space}`;
    for await (const entry of new Bun.Glob("*.md").scan(dir)) {
      const raw = await Bun.file(`${dir}/${entry}`).text();
      const { meta, body } = parseFrontmatter(raw);
      if (!meta || meta.status !== "active") {
        console.log(`  [atla] ${space}/${entry} (status=${meta?.status ?? "yok"})`);
        continue;
      }
      const { title, description } = extractTitleAndDescription(body, entry.replace(/\.md$/, ""));
      const slug = slugify(entry.replace(/\.md$/, ""));
      candidates.push({
        file: `${space}/${entry}`,
        title,
        path: `${space}/${slug}`,
        content: body.trim(),
        description,
        tags: [space, ...meta.tags],
      });
    }
  }

  console.log(`Aktarılacak: ${candidates.length} sayfa${isDryRun ? " (dry-run)" : ""}`);

  let existing = new Set<string>();
  if (!isDryRun) existing = await listExistingSlugs();

  let ok = 0;
  for (const c of candidates) {
    if (existing.has(c.path)) {
      console.log(`  [zaten var] ${c.path}`);
      continue;
    }
    if (isDryRun) {
      console.log(`  [kuru] ${c.path} — "${c.title}" tags=${c.tags.join(",")}`);
      continue;
    }
    try {
      await createPage(c, true);
      console.log(`  [ok] ${c.path}`);
      ok++;
    } catch (err) {
      try {
        await createPage(c, false);
        console.log(`  [ok*] ${c.path} (tags olmadan)`);
        ok++;
      } catch (err2) {
        console.error(`  [HATA] ${c.path}: ${err2}`);
      }
    }
  }
  console.log(`Bitti: ${ok} yeni sayfa oluşturuldu.`);
}

main().catch((err) => {
  console.error(`Beklenmeyen hata: ${err}`);
  process.exit(1);
});
