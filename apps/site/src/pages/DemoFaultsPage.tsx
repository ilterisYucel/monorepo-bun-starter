import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DemoFaultsView } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { demoAlarmApi } from "../features/demo-data/demoAlarmApi";

/** DemoFaultsPage — Faults (UC-7): liste/detay/notlu çözme + injection (dummy). */
export const DemoFaultsPage: React.FC = () => {
  const { alarms } = useDemoProjectContext();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  const handleResolve = async (deviceId: string, alarmName: string, note: string): Promise<void> => {
    setBusy(true);
    setMessage("");
    try {
      await demoAlarmApi.resolve(deviceId, alarmName, note);
      setMessage("Resolved.");
      await qc.invalidateQueries({ queryKey: ["demo-alarms"] });
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return <DemoFaultsView alarms={alarms} onResolve={handleResolve} busy={busy} message={message} />;
};
