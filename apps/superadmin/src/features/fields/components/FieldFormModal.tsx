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

/**
 * FieldFormModal — saha ekle/düzenle formu (Sahalar sayfası haritası üzerinden).
 * AssetsPage'in eski formunun modal taşıması; `?edit=<id>` ile açılır.
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
  const [apiUrl, setApiUrl] = React.useState("");
  const [fieldType, setFieldType] = React.useState("general");
  const [lat, setLat] = React.useState("0");
  const [lng, setLng] = React.useState("0");

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setApiUrl(editing.api_url ?? "");
      setFieldType(editing.field_type ?? "general");
      setLat(String(editing.location?.lat ?? 0));
      setLng(String(editing.location?.lng ?? 0));
    } else {
      setName("");
      setApiUrl("");
      setFieldType("general");
      setLat("0");
      setLng("0");
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async () => {
    const location =
      lat.trim() === "" && lng.trim() === ""
        ? undefined
        : { lat: Number(lat) || 0, lng: Number(lng) || 0 };
    const input: AdminFieldInput = {
      name,
      location,
      apiUrl: apiUrl.trim() === "" ? undefined : apiUrl.trim(),
      fieldType,
    };
    if (editing) {
      await updateField.mutateAsync({ id: editing.id, input });
    } else {
      await createField.mutateAsync(input);
    }
    onClose();
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
        <S.Actions>
          <S.CancelButton onClick={onClose}>{t("boss.cancel")}</S.CancelButton>
          <S.SaveButton
            $disabled={name.trim().length === 0}
            disabled={name.trim().length === 0}
            onClick={() => void submit()}
          >
            {t("boss.save")}
          </S.SaveButton>
        </S.Actions>
      </S.Panel>
    </S.Overlay>
  );
};
