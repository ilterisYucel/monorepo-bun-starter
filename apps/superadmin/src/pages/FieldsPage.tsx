import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FieldMap, FieldCard, COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import {
  useFieldList,
  useField,
} from "../features/fields/hooks/useAdminFields";
import { toFieldMarker } from "../features/fields/mappers";
import { FieldFormModal } from "../features/fields/components/FieldFormModal";
import * as S from "./FieldsPage.styles";

const AddIcon = SCADA_ICONS.add;

type StatusFilter = "all" | "online" | "warning" | "offline";

const STATUS_DOT: Record<Exclude<StatusFilter, "all">, string> = {
  online: COLORS.success,
  warning: COLORS.warning,
  offline: COLORS.error,
};

const STATUS_LABEL_KEY: Record<Exclude<StatusFilter, "all">, string> = {
  online: "common.online",
  warning: "status.warning",
  offline: "common.offline",
};

const FILTER_KEYS: Array<Exclude<StatusFilter, "all">> = ["online", "warning", "offline"];

/**
 * Sahalar — bütünleşik sayfa (Harita + konsol paneli).
 * Üstte çerçevesiz harita; altta gradient panel: durum filtre çipleri
 * (Tümü/Online/Uyarı/Çevrimdışı — sayaçlı, grid'i filtreler) ve kart
 * grid'inin son hücresi olarak "Saha Ekle" kesikli karosu.
 */
export const FieldsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { data: fields, isLoading, isError, refetch } = useFieldList();
  const { data: editing } = useField(editId ?? undefined);

  const [formOpen, setFormOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const markers = (fields ?? []).map(toFieldMarker);

  const countFor = (status: Exclude<StatusFilter, "all">): number =>
    markers.filter((marker) => marker.status === status).length;

  const visibleMarkers =
    statusFilter === "all"
      ? markers
      : markers.filter((marker) => marker.status === statusFilter);

  React.useEffect(() => {
    if (editId !== null && editId !== "") setFormOpen(true);
  }, [editId]);

  const closeForm = () => {
    setFormOpen(false);
    if (editId !== null) setSearchParams({}, { replace: true });
  };

  const openCreateForm = () => {
    closeForm();
    setFormOpen(true);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, minHeight: "260px", padding: "12px 16px 0" }}>
        <FieldMap
          fields={markers}
          height="100%"
          frameless
          detailLabel={t("boss.goField")}
          onOpenDetail={(fieldId: string) => navigate(`/fields/${fieldId}`)}
        />
      </div>

      <S.Panel data-testid="fields-panel">
        <S.ChipsRow>
          <S.Chip $active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            {t("boss.notifications.filterAll")} ({markers.length})
          </S.Chip>
          {FILTER_KEYS.map((status) => (
            <S.Chip
              key={status}
              $active={statusFilter === status}
              $color={STATUS_DOT[status]}
              onClick={() =>
                setStatusFilter((prev) => (prev === status ? "all" : status))
              }
            >
              <S.ChipDot $color={STATUS_DOT[status]} />
              {t(STATUS_LABEL_KEY[status])} ({countFor(status)})
            </S.Chip>
          ))}
        </S.ChipsRow>

        <S.CardsGrid>
          {visibleMarkers.map((marker) => (
            <FieldCard
              key={marker.id}
              field={marker}
              size="small"
              onClick={() => navigate(`/fields/${marker.id}`)}
            />
          ))}

          {isLoading && <S.PanelNote>...</S.PanelNote>}
          {isError && (
            <S.PanelNote>
              {t("boss.noFields")}{" "}
              <S.RetryButton onClick={() => void refetch()}>
                {t("boss.retry")}
              </S.RetryButton>
            </S.PanelNote>
          )}
          {!isLoading && !isError && (
            <S.AddTile onClick={openCreateForm} aria-label={t("boss.newField")}>
              <S.AddTileIcon>
                <AddIcon size={18} />
              </S.AddTileIcon>
              {t("boss.newField")}
            </S.AddTile>
          )}
        </S.CardsGrid>
      </S.Panel>

      <FieldFormModal
        open={formOpen}
        editing={editing}
        onClose={closeForm}
      />
    </div>
  );
};
