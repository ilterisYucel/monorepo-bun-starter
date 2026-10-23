// EMS config export (CLI): site dosyasından deployment/simlab/<site>/ altına device-config'ler,
// topology.json ve v2 compose overlay'leri üretir.
//   bun run apps/sim-lab/src/tools/export-ems-config.ts [--site sites/gd1.site.json] [--ems-host host.docker.internal] [--out deployment/simlab/x]
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expandSite, exportEmsConfigs, loadSiteSpec } from "@gd-monorepo/simulators/physical";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../..");
const repoRoot = resolve(appDir, "../..");
const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const { spec, baseDir } = loadSiteSpec(resolve(arg("site") ?? join(appDir, "sites", "gd1.site.json")));
if (arg("ems-host")) spec.network.emsHost = arg("ems-host")!;
const r = exportEmsConfigs(expandSite(spec, baseDir), repoRoot, arg("out"));
console.log(`[export] ${r.files.length} dosya → ${r.outDir}`);
