import { createHashRouter } from "react-router-dom";
import { routes } from "./routes";

// Faz 4 T4.2: hash router — /containers/:cid/ui/#/dashboard subpath'inde
// server rewrite gerektirmez; desktop ile ortak davranis.
export const router = createHashRouter(routes);
