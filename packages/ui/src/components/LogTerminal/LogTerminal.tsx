import React, { useRef, useEffect, useState, useMemo } from "react";
import { SCADA_ICONS } from "../../icons";
import type { LogTerminalProps } from "./LogTerminal.types";
import * as S from "./LogTerminal.styles";

const SuccessIcon = SCADA_ICONS.logSuccess;
const ErrorIcon = SCADA_ICONS.logError;
const WarningIcon = SCADA_ICONS.logWarning;
const InfoIcon = SCADA_ICONS.logInfo;
const CommandIcon = SCADA_ICONS.sourceCommand;
const BatteryIcon = SCADA_ICONS.battery;
const SchedulerIcon = SCADA_ICONS.sourceScheduler;
const SystemIcon = SCADA_ICONS.sourceSystem;
const TrashIcon = SCADA_ICONS.trash;

const typeIconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const sourceIconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  command: CommandIcon,
  rack: BatteryIcon,
  scheduler: SchedulerIcon,
  system: SystemIcon,
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
  title = "Komut Terminali & Event Log",
  titleIcon = <InfoIcon size={18} />,
  tagFilters,
}) => {
  const { logs, clearLogs } = provider;
  const bodyRef = useRef<HTMLDivElement>(null);

  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});

  const tagOptions = useMemo(() => {
    if (!tagFilters || logs.length === 0) return {};
    const options: Record<string, string[]> = {};
    for (const filter of tagFilters) {
      const values = new Set<string>();
      for (const log of logs) {
        const v = log.tags?.[filter.tagKey];
        if (v) values.add(v);
      }
      options[filter.tagKey] = [...values].sort();
    }
    return options;
  }, [tagFilters, logs]);

  useEffect(() => {
    if (!tagFilters || Object.keys(tagOptions).length === 0) return;
    if (Object.keys(selectedTags).length > 0) return;
    const initial: Record<string, string> = {};
    for (const filter of tagFilters) {
      const first = tagOptions[filter.tagKey]?.[0];
      if (first) initial[filter.tagKey] = first;
    }
    if (Object.keys(initial).length > 0) setSelectedTags(initial);
  }, [tagFilters, tagOptions, selectedTags]);

  const filteredLogs = useMemo(() => {
    if (!tagFilters) return logs;
    return logs.filter((log) => {
      for (const filter of tagFilters) {
        const selected = selectedTags[filter.tagKey];
        if (selected && log.tags?.[filter.tagKey] !== selected) return false;
      }
      return true;
    });
  }, [logs, tagFilters, selectedTags]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <S.ScrollContainer style={{ height: maxHeight }}>
      <S.Header>
        <S.Title>
          <span>{titleIcon}</span>
          <span>{title}</span>
        </S.Title>
        {tagFilters && (
          <S.FiltersRow>
            {tagFilters.map((filter) => (
              <S.FilterGroup key={filter.tagKey}>
                <S.FilterLabel>{filter.label}</S.FilterLabel>
                <S.FilterSelect
                  value={selectedTags[filter.tagKey] ?? tagOptions[filter.tagKey]?.[0] ?? ""}
                  onChange={(e) =>
                    setSelectedTags((prev) => ({
                      ...prev,
                      [filter.tagKey]: e.target.value,
                    }))
                  }
                >
                  {(tagOptions[filter.tagKey] ?? []).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </S.FilterSelect>
              </S.FilterGroup>
            ))}
          </S.FiltersRow>
        )}
        <S.ClearBtn onClick={clearLogs}>
          <TrashIcon size={14} /> Temizle
        </S.ClearBtn>
      </S.Header>

      <S.Body ref={bodyRef}>
        {filteredLogs.length === 0 ? (
          <S.Empty>
            <S.EmptyIcon>
              <InfoIcon size={32} />
            </S.EmptyIcon>
            <S.EmptyText>Henüz log kaydı yok.</S.EmptyText>
            <S.EmptySmall>
              Komut gönderdiğinizde burada görünecektir.
            </S.EmptySmall>
          </S.Empty>
        ) : (
          filteredLogs.map((log) => {
            const EntryComponent = getEntryComponent(log.type);
            const TypeIcon = typeIconMap[log.type] || InfoIcon;
            const SrcIcon = sourceIconMap[log.source] || SystemIcon;
            return (
              <EntryComponent key={log.id}>
                <S.Time>{formatTime(log.timestamp)}</S.Time>
                <S.Icon className="log-icon">
                  <TypeIcon size={14} /> <SrcIcon size={14} />
                </S.Icon>
                <S.Message>{log.message}</S.Message>
                {log.details && <S.Details>{log.details}</S.Details>}
              </EntryComponent>
            );
          })
        )}
      </S.Body>

      <S.Footer>
        <span>Toplam {filteredLogs.length} kayıt</span>
        <S.Legend>
          <S.LegendSuccess><SuccessIcon size={12} /> Başarılı</S.LegendSuccess>
          <S.LegendError><ErrorIcon size={12} /> Hata</S.LegendError>
          <S.LegendWarning><WarningIcon size={12} /> Uyarı</S.LegendWarning>
          <S.LegendInfo><InfoIcon size={12} /> Bilgi</S.LegendInfo>
        </S.Legend>
      </S.Footer>
    </S.ScrollContainer>
  );
};
