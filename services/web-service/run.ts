import { main } from "./src/index";

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
