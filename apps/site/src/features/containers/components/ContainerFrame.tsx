import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { containersApi } from "../services/containersApi";

const CloseIcon = SCADA_ICONS.collapse;
const ExpandIcon = SCADA_ICONS.zoomIn;

/**
 * ContainerFrame — tünel "Tam Ekran" overlay'i (Faz 5 T5.3 + 2026-09-02):
 *
 * - `createPortal` + `position: fixed; inset: 0; z-index: 2000` — sidebar,
 *   SystemHeader dahil tüm uygulamayı kaplar (route değişikliği YOK).
 * - Mount'ta oturum AÇAR (302 → Path-scoped HttpOnly cookie tarayıcıda) →
 *   iframe src = `/containers/:cid/ui/` — cookie iframe isteklerinde otomatik.
 * - Üst çubukta "Tam Ekran" (browser Fullscreen API — F11 etkisi; tekrar
 *   tıklama veya tarayıcı ESC'si çıkar, overlay açık kalır) ve "Kapat"
 *   (endSession → session-end + audit → onClose).
 * - Oturum açılamazsa hata mesajı — asla boş iframe.
 */
export const ContainerFrame: React.FC<{
  fieldId: string;
  containerId: string;
  onClose: () => void;
}> = ({ fieldId, containerId, onClose }) => {
  const { t } = useTranslation();
  const [framePath, setFramePath] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [closing, setClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    containersApi
      .openSession(fieldId, containerId)
      .then((outcome) => {
        if (cancelled) return;
        if (outcome.ok) {
          // Cookie (Path-scoped, HttpOnly) artık tarayıcıda — iframe src
          // sonra kurulur; iframe istekleri cookie'yi otomatik taşır.
          setFramePath(`/containers/${containerId}/ui/`);
        } else {
          setError(t("frame.openFailed"));
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("frame.openFailed"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, containerId]);

  // Fullscreen API durum senkronu — tarayıcı ESC'si de fullscreenchange üretir.
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    void containersApi
      .endSession(fieldId, containerId)
      .catch(() => {
        // kapanış başarısız olsa bile kullanıcı geri döner — audit en iyi çaba
      })
      .finally(onClose);
  }, [closing, fieldId, containerId, onClose]);

  // Escape handler'ı mount'ta sabit referansla bağlar (close fonksiyonu
  // state'e bağımlı — en güncelini ref üzerinden çağırır).
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  // Tam ekran dışındayken Escape → overlay kapanır (Modal sözleşmesi).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        closeRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const el = overlayRef.current;
    if (el?.requestFullscreen) {
      void el.requestFullscreen();
    }
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        background: COLORS.bgApp,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 12px",
          background: COLORS.bgHeader,
          borderBottom: `1px solid ${COLORS.borderDefault}`,
        }}
      >
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: COLORS.textWhite }}>
          {containerId}
        </span>
        <button
          onClick={toggleFullscreen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "6px",
            color: COLORS.textWhite,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          <ExpandIcon size={14} />
          {isFullscreen ? t("frame.closeFullscreen") : t("frame.fullscreen")}
        </button>
        <button
          onClick={close}
          disabled={closing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "6px",
            color: COLORS.textWhite,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          <CloseIcon size={14} />
          {t("frame.close")}
        </button>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {error && (
          <div style={{ padding: "20px", color: COLORS.error }}>{error}</div>
        )}
        {!error && framePath && (
          <iframe
            src={framePath}
            title={containerId}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: COLORS.bgApp,
            }}
          />
        )}
        {!error && !framePath && (
          <div style={{ padding: "20px", color: COLORS.textMuted }}>
            {t("frame.opening")}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
