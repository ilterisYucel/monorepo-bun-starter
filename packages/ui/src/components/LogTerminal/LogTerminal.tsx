// packages/ui/src/components/LogTerminal/LogTerminal.tsx
import React, { useRef, useEffect } from "react";
import type { LogTerminalProps } from "./LogTerminal.types";
import * as S from "./LogTerminal.styles";

const getTypeIcon = (type: string): string => {
  switch (type) {
    case "success":
      return "✅";
    case "error":
      return "❌";
    case "warning":
      return "⚠️";
    default:
      return "📌";
  }
};

const getSourceIcon = (source: string): string => {
  switch (source) {
    case "command":
      return "🎮";
    case "rack":
      return "🔋";
    case "scheduler":
      return "⏰";
    default:
      return "⚙️";
  }
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getEntryComponent = (type: string) => {
  switch (type) {
    case "success":
      return S.EntrySuccess;
    case "error":
      return S.EntryError;
    case "warning":
      return S.EntryWarning;
    default:
      return S.EntryInfo;
  }
};

export const LogTerminal: React.FC<LogTerminalProps> = ({
  provider,
  maxHeight = 350,
}) => {
  const { logs, clearLogs } = provider;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div
      style={{ height: maxHeight, display: "flex", flexDirection: "column" }}
    >
      <S.Header>
        <S.Title>
          <span>📋</span>
          <span>Komut Terminali & Event Log</span>
        </S.Title>
        <S.ClearBtn onClick={clearLogs}>🗑️ Temizle</S.ClearBtn>
      </S.Header>

      <S.Body ref={bodyRef}>
        {logs.length === 0 ? (
          <S.Empty>
            <S.EmptyIcon>📭</S.EmptyIcon>
            <S.EmptyText>Henüz log kaydı yok.</S.EmptyText>
            <S.EmptySmall>
              Komut gönderdiğinizde burada görünecektir.
            </S.EmptySmall>
          </S.Empty>
        ) : (
          logs.map((log) => {
            const EntryComponent = getEntryComponent(log.type);
            return (
              <EntryComponent
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "8px 12px",
                  marginBottom: "6px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "#1a1a2e",
                  borderLeft: "3px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                <S.Time>{formatTime(log.timestamp)}</S.Time>
                <S.Icon className="log-icon">
                  {getTypeIcon(log.type)} {getSourceIcon(log.source)}
                </S.Icon>
                <S.Message>{log.message}</S.Message>
                {log.details && <S.Details>{log.details}</S.Details>}
              </EntryComponent>
            );
          })
        )}
      </S.Body>

      <S.Footer>
        <span>📊 Toplam {logs.length} kayıt</span>
        <S.Legend>
          <S.LegendSuccess>✅ Başarılı</S.LegendSuccess>
          <S.LegendError>❌ Hata</S.LegendError>
          <S.LegendWarning>⚠️ Uyarı</S.LegendWarning>
          <S.LegendInfo>📌 Bilgi</S.LegendInfo>
        </S.Legend>
      </S.Footer>
    </div>
  );
};
