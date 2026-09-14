import React from "react";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { AdminField, AdminFieldInput } from "../types";
import {
  useCreateField,
  useUpdateField,
} from "../hooks/useAdminFields";
import * as S from "./FieldFormModal.styles";

interface FieldFormModalProps {
  /** Modal açık mı (komut — saha ekle/düzenle). */
  open: boolean;
  /** Düzenlenen saha; undefined ise yeni saha oluşturulur. */
  editing: AdminField | undefined;
  onClose: () => void;
}

const CloseIcon = SCADA_ICONS.close;

/** Bilinen saha tipleri — harita glifi bu anahtara bakar; yeni tip eklemek kodsuz. */
const FIELD_TYPES = ["wind", "solar", "hydro", "battery", "general"] as const;

/** Backend site-field.ts ile aynı UUID kontratı (küçük harf üretilir — normalize edilir). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * FieldFormModal — saha ekle/düzenle formu (Sahalar sayfası haritası üzerinden).
 * AssetsPage'in eski formunun modal taşıması; `?edit=<id>` ile açılır.
 *
 * 2026-09-14: uplink kayıt alanları eklendi (konteyner kayıt formu deseni):
 * - "Saha Kimliği (UUID)": field tier'daki FIELD_ID — uplink register'ındaki
 *   peerId ile birebir eşleşme için. Opsiyonel; boşsa boss kendi UUID üretir.
 * - "Uplink Token": FIELD_UPLINK_TOKEN (>=32) — boss yalnızca SHA-256 hash
 *   saklar. Opsiyonel; edit modunda rotasyon için düzenlenebilir.
 */
export const FieldFormModal: React.FC<FieldFormModalProps> = ({
  open,
  editing,
  onClose,
}) => {
  const { t } = useTranslation();
  const createField = useCreateField();
  const updateField = useUpdateField();

  const [name, setName] = React.useState("");
  const [fieldId, setFieldId] = React.useState("");
  const [uplinkToken, setUplinkToken] = React.useState("");
  const [apiUrl, setApiUrl] = React.useState("");
  const [fieldType, setFieldType] = React.useState("general");
  const [lat, setLat] = React.useState("0");
  const [lng, setLng] = React.useState("0");
  const [error, setError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setFieldId(editing.id);
      setUplinkToken("");
      setApiUrl(editing.api_url ?? "");
      setFieldType(editing.field_type ?? "general");
      setLat(String(editing.location?.lat ?? 0));
      setLng(String(editing.location?.lng ?? 0));
    } else {
      setName("");
      setFieldId("");
      setUplinkToken("");
      setApiUrl("");
      setFieldType("general");
      setLat("0");
      setLng("0");
    }
    setError(undefined);
    setSubmitting(false);
  }, [open, editing]);

  if (!open) return null;

  const submit = async () => {
    setError(undefined);

    const trimmedId = fieldId.trim().toLowerCase();
    const trimmedToken = uplinkToken.trim();

    // Saha Kimliği yalnızca YENİ kayıtta girilebilir (edit'te disabled — PUT
    // path anahtarıdır); doluysa geçerli UUID olmalı.
    if (!editing && trimmedId.length > 0 && !UUID_PATTERN.test(trimmedId)) {
      setError(t("boss.invalidFieldId"));
      return;
    }
    if (trimmedToken.length > 0 && trimmedToken.length < 32) {
      setError(t("boss.invalidUplinkToken"));
      return;
    }

    const location =
      lat.trim() === "" && lng.trim() === ""
        ? undefined
        : { lat: Number(lat) || 0, lng: Number(lng) || 0 };
    const input: AdminFieldInput = {
      name,
      location,
      apiUrl: apiUrl.trim() === "" ? undefined : apiUrl.trim(),
      fieldType,
      ...(!editing && trimmedId.length > 0 ? { id: trimmedId } : {}),
      ...(trimmedToken.length > 0 ? { uplinkToken: trimmedToken } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateField.mutateAsync({ id: editing.id, input });
      } else {
        await createField.mutateAsync(input);
      }
      onClose();
    } catch {
      setError(t("boss.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <S.Overlay onClick={onClose}>
      <S.Panel onClick={(event) => event.stopPropagation()} aria-label="field-form">
        <S.Title>
          <span>{editing ? t("boss.editField") : t("boss.newField")}</span>
          <S.CloseButton onClick={onClose} aria-label={t("boss.cancel")}>
            <CloseIcon size={16} />
          </S.CloseButton>
        </S.Title>
        <S.Input
          placeholder={t("boss.fieldName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t("boss.fieldName")}
        />
        <div>
          <S.Input
            placeholder={t("boss.fieldId")}
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            aria-label={t("boss.fieldId")}
            disabled={editing !== undefined}
          />
          <S.Hint>{t("boss.fieldIdHint")}</S.Hint>
        </div>
        <div>
          <S.Input
            placeholder={t("boss.uplinkToken")}
            type="password"
            value={uplinkToken}
            onChange={(e) => setUplinkToken(e.target.value)}
            aria-label={t("boss.uplinkToken")}
          />
          <S.Hint>{t("boss.uplinkTokenHint")}</S.Hint>
        </div>
        <S.Input
          placeholder={t("boss.apiUrl")}
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          aria-label={t("boss.apiUrl")}
        />
        <S.Select
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value)}
          aria-label={t("boss.fieldType")}
        >
          {FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`boss.fieldType.${type}`)}
            </option>
          ))}
        </S.Select>
        <S.Row>
          <S.Input
            placeholder={t("boss.latitude")}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            aria-label={t("boss.latitude")}
          />
          <S.Input
            placeholder={t("boss.longitude")}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            aria-label={t("boss.longitude")}
          />
        </S.Row>
        {error && <S.ErrorText>{error}</S.ErrorText>}
        <S.Actions>
          <S.CancelButton onClick={onClose}>{t("boss.cancel")}</S.CancelButton>
          <S.SaveButton
            $disabled={name.trim().length === 0 || submitting}
            disabled={name.trim().length === 0 || submitting}
            onClick={() => void submit()}
          >
            {t("boss.save")}
          </S.SaveButton>
        </S.Actions>
      </S.Panel>
    </S.Overlay>
  );
};
