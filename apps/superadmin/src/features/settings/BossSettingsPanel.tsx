import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SCADA_ICONS, Tabs, COLORS, useTranslation } from "@gd-monorepo/ui";
import type { TabItem } from "@gd-monorepo/ui";
import {
  useWireGuardHosts,
  useCreateWgHost,
  useWgConnect,
  useWgDisconnect,
  useWgRemove,
} from "../wireguard/hooks/useWireGuard";
import * as S from "./BossSettingsPanel.styles";

const STORAGE_KEY = "boss-settings";

interface BossSettings {
  locale: string;
}

const persistSettings = (settings: BossSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

interface BossSettingsPanelProps {
  onClose: () => void;
}

const CloseIcon = SCADA_ICONS.close;

/**
 * BossSettingsPanel — ayarlar modalı (container-web SettingsPanel deseni).
 * Sidebar footer'daki ayar butonundan açılır; sekmeler:
 * Seçenekler (dil/tema), Ağ (WireGuard hostları), Hesap (şifre değişimi).
 */
export const BossSettingsPanel: React.FC<BossSettingsPanelProps> = ({
  onClose,
}) => {
  const { t, locale, setLocale } = useTranslation();
  const navigate = useNavigate();

  const { data: wgEntries } = useWireGuardHosts();
  const createHost = useCreateWgHost();
  const wgConnect = useWgConnect();
  const wgDisconnect = useWgDisconnect();
  const wgRemove = useWgRemove();

  const [wgFormOpen, setWgFormOpen] = React.useState(false);
  const [wgName, setWgName] = React.useState("");
  const [wgEndpoint, setWgEndpoint] = React.useState("");
  const [wgPublicKey, setWgPublicKey] = React.useState("");
  const [wgPsk, setWgPsk] = React.useState("");

  const changeLocale = (next: "tr" | "en") => {
    void setLocale(next);
    persistSettings({ locale: next });
  };

  const submitWgHost = async () => {
    await createHost.mutateAsync({
      name: wgName,
      endpoint: wgEndpoint,
      publicKey: wgPublicKey,
      psk: wgPsk,
    });
    setWgFormOpen(false);
    setWgName("");
    setWgEndpoint("");
    setWgPublicKey("");
    setWgPsk("");
  };

  const currentLocale = locale();

  const tabs = useMemo<TabItem[]>(() => {
    return [
      {
        key: "options",
        label: t("boss.settings.tab.options"),
        content: (
          <>
            <S.Section>
              <S.SectionLabel>{t("boss.settings.locale")}</S.SectionLabel>
              <S.ToggleGroup>
                <S.ToggleBtn
                  $active={currentLocale === "tr"}
                  onClick={() => changeLocale("tr")}
                >
                  {t("boss.settings.localeTr")}
                </S.ToggleBtn>
                <S.ToggleBtn
                  $active={currentLocale === "en"}
                  onClick={() => changeLocale("en")}
                >
                  {t("boss.settings.localeEn")}
                </S.ToggleBtn>
              </S.ToggleGroup>
            </S.Section>

            <S.Section>
              <S.SectionLabel>{t("boss.settings.theme")}</S.SectionLabel>
              <S.ComingSoon>—</S.ComingSoon>
            </S.Section>
          </>
        ),
      },
      {
        key: "network",
        label: t("boss.settings.tab.network"),
        content: (
          <S.Section>
            <S.SectionLabel>{t("boss.settings.network")}</S.SectionLabel>
            <S.SectionCard>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
                  {t("boss.settings.wgAdd")}
                </span>
                <S.ActionButton onClick={() => setWgFormOpen((open) => !open)}>
                  {t("boss.settings.wgAdd")}
                </S.ActionButton>
              </div>

              {wgFormOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <S.Input
                    placeholder={t("boss.settings.wgName")}
                    value={wgName}
                    onChange={(e) => setWgName(e.target.value)}
                    aria-label={t("boss.settings.wgName")}
                  />
                  <S.Input
                    placeholder={t("boss.settings.wgEndpoint")}
                    value={wgEndpoint}
                    onChange={(e) => setWgEndpoint(e.target.value)}
                    aria-label={t("boss.settings.wgEndpoint")}
                  />
                  <S.Input
                    placeholder={t("boss.settings.wgPublicKey")}
                    value={wgPublicKey}
                    onChange={(e) => setWgPublicKey(e.target.value)}
                    aria-label={t("boss.settings.wgPublicKey")}
                  />
                  <S.Input
                    placeholder={t("boss.settings.wgPsk")}
                    value={wgPsk}
                    onChange={(e) => setWgPsk(e.target.value)}
                    aria-label={t("boss.settings.wgPsk")}
                  />
                  <S.ActionButton
                    onClick={() => void submitWgHost()}
                    disabled={
                      wgName.trim().length === 0 ||
                      wgEndpoint.trim().length === 0 ||
                      wgPublicKey.trim().length === 0
                    }
                    style={{
                      opacity:
                        wgName.trim().length === 0 ||
                        wgEndpoint.trim().length === 0 ||
                        wgPublicKey.trim().length === 0
                          ? 0.5
                          : 1,
                    }}
                  >
                    {t("boss.save")}
                  </S.ActionButton>
                </div>
              )}

              {(wgEntries ?? []).map(({ host, state }) => (
                <S.HostRow key={host.id}>
                  <S.HostInfo>
                    <S.HostName>{host.name}</S.HostName>
                    <S.HostEndpoint>{host.endpoint}</S.HostEndpoint>
                  </S.HostInfo>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color:
                        state === "up" ? COLORS.success : COLORS.textMuted,
                    }}
                  >
                    {state === "up"
                      ? t("boss.settings.wgStateUp")
                      : t("boss.settings.wgStateDown")}
                  </span>
                  {state === "up" ? (
                    <S.GhostButton
                      onClick={() => void wgDisconnect.mutateAsync(host.id)}
                    >
                      {t("boss.settings.wgDisconnect")}
                    </S.GhostButton>
                  ) : (
                    <S.GhostButton
                      onClick={() => void wgConnect.mutateAsync({ id: host.id })}
                    >
                      {t("boss.settings.wgConnect")}
                    </S.GhostButton>
                  )}
                  <S.GhostButton
                    onClick={() => void wgRemove.mutateAsync(host.id)}
                    aria-label={t("boss.delete")}
                  >
                    ✕
                  </S.GhostButton>
                </S.HostRow>
              ))}
              {(wgEntries ?? []).length === 0 && (
                <S.Muted>{t("boss.settings.wgKeyMissing")}</S.Muted>
              )}
            </S.SectionCard>
          </S.Section>
        ),
      },
      {
        key: "account",
        label: t("boss.settings.tab.account"),
        content: (
          <S.Section>
            <S.ActionButton onClick={() => navigate("/change-password")}>
              {t("boss.settings.changePassword")}
            </S.ActionButton>
          </S.Section>
        ),
      },
    ];
  }, [t, currentLocale, wgEntries, wgFormOpen, wgName, wgEndpoint, wgPublicKey, wgPsk]);

  return (
    <S.Overlay onClick={onClose}>
      <S.Panel onClick={(event) => event.stopPropagation()} aria-label="settings-panel">
        <S.Header>
          <S.Title>{t("boss.nav.settings")}</S.Title>
          <S.CloseBtn onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon size={18} />
          </S.CloseBtn>
        </S.Header>
        <Tabs tabs={tabs} defaultKey="options" />
      </S.Panel>
    </S.Overlay>
  );
};
