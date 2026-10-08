import React from "react";
import { DemoAdminView } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/** DemoAdminPage — read-only master admin (SPEC UC-8). */
export const DemoAdminPage: React.FC = () => {
  const { logs } = useDemoProjectContext();
  return <DemoAdminView topology={DEMO_TOPOLOGY} logs={logs} />;
};
