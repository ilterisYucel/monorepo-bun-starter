import React from "react";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useNotifications, touchLastSeen } from "../features/notifications/hooks/useNotifications";
import type { FieldNotification } from "../features/notifications/types";
import * as S from "./NotificationsPage.styles";

const AlarmIcon = SCADA_ICONS.logWarning;
const ClearedIcon = SCADA_ICONS.logSuccess;
const InfoIcon = SCADA_ICONS.logInfo;

const EVENT_STYLE: Record<
  string,
  { color: string; icon: React.ElementType }
> = {
  device_alarm: { color: COLORS.error, icon: AlarmIcon },
  device_alarm_cleared: { color: COLORS.success, icon: ClearedIcon },
  alarm_resolved: { color: COLORS.info, icon: InfoIcon },
  session_open: { color: COLORS.textMuted, icon: InfoIcon },
  session_end: { color: COLORS.textMuted, icon: InfoIcon },
};

const defaultStyle = { color: COLORS.textMuted, icon: InfoIcon };

const MUTED_KEY = "boss-notifications-muted";

/** Bilinen olay kodları — çip sırası bu listeden gelir. */
const KNOWN_CODES = [
  "device_alarm",
  "device_alarm_cleared",
  "alarm_resolved",
  "session_open",
  "session_end",
];

const readMutedCodes = (): string[] => {
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
};

const persistMutedCodes = (codes: string[]): void => {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(codes));
  } catch {
    // storage erişilemez — mute yalnızca oturum içinde
  }
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const eventCodeLabel = (t: (key: string) => string, code: string): string => {
  const key = `boss.notifications.${code}`;
  const label = t(key);
  return label === key ? code : label;
};

const Row: React.FC<{ notification: FieldNotification; t: (key: string) => string }> = ({
  notification,
  t,
}) => {
  const style = EVENT_STYLE[notification.eventCode] ?? defaultStyle;
  const Icon = style.icon;
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        padding: "12px 14px",
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "10px",
      }}
    >
      <span style={{ color: style.color, display: "flex", marginTop: "2px" }}>
        <Icon size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textPrimary }}>
            {notification.fieldName}
          </span>
          <span style={{ fontSize: "11px", color: style.color }}>
            {eventCodeLabel(t, notification.eventCode)}
          </span>
          <span style={{ fontSize: "11px", color: COLORS.textMuted, marginLeft: "auto" }}>
            {formatTime(notification.occurredAt)}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: COLORS.textMuted, marginTop: "2px" }}>
          {notification.message}
        </div>
      </div>
    </div>
  );
};

/**
 * Bildirimler (BOSS-UYGULAMA-MIMARISI.md §4.6) — field alarm/audit akışı.
 * Filtre barı: tip çipleri (sayaçlı, show/hide), metin arama ve tip başına
 * "yok say" (mute — localStorage'da kalıcı). Liste 15 sn'de tazelenir.
 */
export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: notifications, isLoading } = useNotifications();

  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const [muted, setMuted] = React.useState<Set<string>>(
    () => new Set(readMutedCodes()),
  );
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    touchLastSeen();
  }, []);

  const items = notifications ?? [];
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.eventCode, (counts.get(item.eventCode) ?? 0) + 1);
  }
  const presentCodes = KNOWN_CODES.filter((code) => counts.has(code));

  const toggleHidden = (code: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleMuted = (code: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      persistMutedCodes([...next]);
      return next;
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (muted.has(item.eventCode)) return false;
    if (hidden.has(item.eventCode)) return false;
    if (normalizedQuery.length === 0) return true;
    return (
      item.fieldName.toLowerCase().includes(normalizedQuery) ||
      item.message.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <S.Page>
      <S.FilterPanel>
        <S.SearchInput
          placeholder={t("boss.notifications.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("boss.notifications.searchPlaceholder")}
        />

        <S.ChipsRow>
          <S.Chip
            $active={hidden.size === 0}
            onClick={() => setHidden(new Set())}
          >
            {t("boss.notifications.filterAll")} ({items.length})
          </S.Chip>
          {presentCodes.map((code) => {
            const isMuted = muted.has(code);
            const isHidden = hidden.has(code);
            return (
              <S.ChipGroup key={code}>
                <S.Chip
                  $active={!isHidden}
                  $muted={isMuted}
                  onClick={() => toggleHidden(code)}
                >
                  {eventCodeLabel(t, code)} ({counts.get(code) ?? 0})
                </S.Chip>
                <S.MuteButton
                  onClick={() => toggleMuted(code)}
                  aria-label={isMuted ? t("boss.notifications.unmute") : t("boss.notifications.mute")}
                  title={isMuted ? t("boss.notifications.unmute") : t("boss.notifications.mute")}
                >
                  {isMuted ? "●" : "○"}
                </S.MuteButton>
              </S.ChipGroup>
            );
          })}
        </S.ChipsRow>
      </S.FilterPanel>

      {isLoading && (
        <div style={{ fontSize: "12px", color: COLORS.textMuted }}>...</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {visible.map((notification) => (
          <Row key={notification.eventId} notification={notification} t={t} />
        ))}
        {!isLoading && items.length > 0 && visible.length === 0 && (
          <div style={{ fontSize: "13px", color: COLORS.textMuted, padding: "16px 0" }}>
            {t("boss.notifications.empty")}
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div style={{ fontSize: "13px", color: COLORS.textMuted, padding: "16px 0" }}>
            {t("boss.notifications.empty")}
          </div>
        )}
      </div>
    </S.Page>
  );
};
