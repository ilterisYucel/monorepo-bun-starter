import { main } from "./src/index";

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
