import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { fieldSessionApi } from "../services/fieldSessionApi";

const CloseIcon = SCADA_ICONS.collapse;
const ExpandIcon = SCADA_ICONS.zoomIn;

/**
 * FieldRemoteFrame — boss "Field Uygulamasını Aç" tünel overlay'i
 * (field uygulamasındaki ContainerFrame'in birebir karşılığı — Boss Faz 3):
 *
 * - `createPortal` + `position: fixed; inset: 0; z-index: 2000` — sidebar,
 *   header dahil tüm boss uygulamasını kaplar (ayrı route YOKTUR).
 * - Mount'ta oturum AÇAR (POST /api/fields/:id/session → Path-scoped
 *   `field_session` cookie'si) → iframe src = `/fields/:id/ui/`.
 * - Açılışta tarayıcı Fullscreen API'si DENENİR (kullanıcı gesture'ı buton
 *   tıklamasıdır); reddedilirse overlay yine tam viewport'u kaplar.
 * - Üst çubukta "Tam Ekran" toggle + "Kapat" (oturum kapatılır);
 *   Escape → kapat. Oturum açılamazsa hata mesajı — asla boş iframe.
 */
export const FieldRemoteFrame: React.FC<{
  fieldId: string;
  fieldName?: string;
  onClose: () => void;
}> = ({ fieldId, fieldName, onClose }) => {
  const { t } = useTranslation();
  const [framePath, setFramePath] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [closing, setClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fieldSessionApi
      .open(fieldId)
      .then(() => {
        if (cancelled) return;
        setFramePath(`/fields/${fieldId}/ui/`);
      })
      .catch((sessionError: unknown) => {
        if (cancelled) return;
        setError(
          sessionError instanceof Error ? sessionError.message : String(sessionError),
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  // Açılır açılmaz tam ekran (gesture penceresi içinde best-effort).
  useEffect(() => {
    const el = overlayRef.current;
    if (!el?.requestFullscreen) return;
    void el.requestFullscreen().catch(() => {
      // tarayıcı izin vermediyse overlay zaten tüm viewport'u kaplar.
    });
  }, []);

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
    void fieldSessionApi
      .close(fieldId)
      .catch(() => {
        // kapanış başarısız olsa bile kullanıcı geri döner — audit en iyi çaba
      })
      .finally(onClose);
  }, [closing, fieldId, onClose]);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

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
      void el.requestFullscreen().catch(() => {});
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
        <span
          style={{
            flex: 1,
            fontSize: "13px",
            fontWeight: 600,
            color: COLORS.textWhite,
          }}
        >
          {fieldName ?? fieldId}
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
          <div style={{ padding: "20px", color: COLORS.error }}>
            {t("boss.remote.sessionFailed")}: {error}
          </div>
        )}
        {!error && framePath && (
          <iframe
            src={framePath}
            title={`field-${fieldId}`}
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
