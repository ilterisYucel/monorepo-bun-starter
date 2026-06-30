import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { SCADA_ICONS, COLORS, formatValue } from "@gd-monorepo/ui";
import type { RackDetailModalProps } from "./RackDetailModal.types";
import * as S from "./RackDetailModal.styles";

type TabId = "nameplate" | "telemetry" | "diagnostics";

const TABS: { id: TabId; label: string }[] = [
  { id: "nameplate", label: "Genel Bilgiler" },
  { id: "telemetry", label: "Telemetri" },
  { id: "diagnostics", label: "Teşhis" },
];

const CloseIcon = SCADA_ICONS.close;

const statusBadgeStyle = (status: string) =>
  status === "online"
    ? { color: COLORS.success, bg: COLORS.successAlpha12 }
    : { color: COLORS.error, bg: COLORS.errorAlpha12 };

const Ge = (val: number | null | undefined, unit: string, dec = 1) => {
  if (val === null || val === undefined) return "N/A";
  return `${val.toFixed(dec)} ${unit}`;
};

export const RackDetailModal: React.FC<RackDetailModalProps> = ({
  data,
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<TabId>("nameplate");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hasResetTab = useRef(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onCloseRef.current();
  }, []);

  useEffect(() => {
    if (open) {
      if (!hasResetTab.current) {
        setTab("nameplate");
        hasResetTab.current = true;
      }
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      hasResetTab.current = false;
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open || !data) return null;

  const badge = statusBadgeStyle(data.status);
  const np = data.nameplate;
  const et = data.extendedTelemetry;
  const diag = data.diagnostics;

  return createPortal(
    <S.Overlay onClick={onClose}>
      <S.Modal onClick={(e) => e.stopPropagation()}>
        <S.Header>
          <S.HeaderInfo>
            <S.HeaderName>{data.name}</S.HeaderName>
            <S.HeaderBadge $color={badge.color} $bg={badge.bg}>
              {data.status === "online" ? "Çevrimiçi" : "Çevrimdışı"}
            </S.HeaderBadge>
          </S.HeaderInfo>
          <S.CloseButton onClick={onClose}>
            <CloseIcon size={18} />
          </S.CloseButton>
        </S.Header>

        <S.Tabs>
          {TABS.map((t) => (
            <S.Tab
              key={t.id}
              $active={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </S.Tab>
          ))}
        </S.Tabs>

        <S.Body>
          {tab === "nameplate" && (
            <>
              <S.Section>
                <S.SectionTitle>Cihaz Bilgileri</S.SectionTitle>
                <S.Grid>
                  <S.Field>
                    <S.FieldLabel>Üretici</S.FieldLabel>
                    <S.FieldValue>{np?.manufacturer ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Model</S.FieldLabel>
                    <S.FieldValue>{np?.model ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Seri No</S.FieldLabel>
                    <S.FieldValue>{np?.serialNumber ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Yazılım Sürümü</S.FieldLabel>
                    <S.FieldValue>{np?.firmwareVersion ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Yazılım Adı</S.FieldLabel>
                    <S.FieldValue>{np?.bmsSwName ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Donanım Sürümü</S.FieldLabel>
                    <S.FieldValue>{np?.hardwareVersion ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Akım Sensörü Tipi</S.FieldLabel>
                    <S.FieldValue>{np?.currentSensorType ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Röle Kapama Akımı</S.FieldLabel>
                    <S.FieldValue>{np?.relayCloseCurrent !== null && np?.relayCloseCurrent !== undefined ? `${np.relayCloseCurrent} A` : "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Paket Tipi</S.FieldLabel>
                    <S.FieldValue>{np?.packType ?? "N/A"}</S.FieldValue>
                  </S.Field>
                </S.Grid>
              </S.Section>

              <S.Section>
                <S.SectionTitle>Sensör Sayıları</S.SectionTitle>
                <S.Grid>
                  <S.Field>
                    <S.FieldLabel>Paket Sayısı</S.FieldLabel>
                    <S.FieldValue>{np?.packCount ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>BMIC Sayısı</S.FieldLabel>
                    <S.FieldValue>{np?.bmicCount ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Sıcaklık Sensörü</S.FieldLabel>
                    <S.FieldValue>{np?.tempSensorCount ?? "N/A"}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Voltaj Sensörü</S.FieldLabel>
                    <S.FieldValue>{np?.voltageSensorCount ?? "N/A"}</S.FieldValue>
                  </S.Field>
                </S.Grid>
              </S.Section>

              {!np && (
                <S.Empty>Detaylı cihaz bilgisi henüz yüklenmedi.</S.Empty>
              )}
            </>
          )}

          {tab === "telemetry" && (
            <>
              <S.SoCGauge>
                <S.GaugeValue>{data.soc !== null && data.soc !== undefined ? `${data.soc.toFixed(1)}%` : "N/A"}</S.GaugeValue>
                <S.GaugeLabel>Şarj Durumu (SoC)</S.GaugeLabel>
                <S.GaugeBar>
                  <S.GaugeFill $pct={Math.min(100, Math.max(0, data.soc || 0))} />
                </S.GaugeBar>
              </S.SoCGauge>

              <S.Section>
                <S.SectionTitle>Temel Ölçümler</S.SectionTitle>
                <S.Grid>
                  <S.Field>
                    <S.FieldLabel>Voltaj</S.FieldLabel>
                    <S.FieldValue>{formatValue(data.voltage, "V")}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Akım</S.FieldLabel>
                    <S.FieldValue>{formatValue(data.current, "A")}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Güç</S.FieldLabel>
                    <S.FieldValue>{formatValue(data.power_kw, "kW")}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Sıcaklık</S.FieldLabel>
                    <S.FieldValue>{formatValue(data.temperature, "°C")}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Sağlık (SoH)</S.FieldLabel>
                    <S.FieldValue>{formatValue(data.soh, "%")}</S.FieldValue>
                  </S.Field>
                  <S.Field>
                    <S.FieldLabel>Şarj Durumu</S.FieldLabel>
                    <S.FieldValue>{data.charge_status}</S.FieldValue>
                  </S.Field>
                </S.Grid>
              </S.Section>

              {et && (
                <S.Section>
                  <S.SectionTitle>Gelişmiş Telemetri</S.SectionTitle>
                  <S.Grid>
                    <S.Field>
                      <S.FieldLabel>Şarj Güç Limiti</S.FieldLabel>
                      <S.FieldValue>{Ge(et.chargePowerLimit, "kW")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Deşarj Güç Limiti</S.FieldLabel>
                      <S.FieldValue>{Ge(et.dischargePowerLimit, "kW")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Maks Hücre Voltajı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.maxCellVoltage, "V", 4)}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Min Hücre Voltajı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.minCellVoltage, "V", 4)}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Ort Hücre Voltajı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.avgCellVoltage, "V", 4)}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Maks Paket Sıcaklığı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.maxPackTemperature, "°C")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Min Paket Sıcaklığı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.minPackTemperature, "°C")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Ort Paket Sıcaklığı</S.FieldLabel>
                      <S.FieldValue>{Ge(et.avgPackTemperature, "°C")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Maks Sıcaklık Farkı (Raf)</S.FieldLabel>
                      <S.FieldValue>{Ge(et.maxDiffTempRack, "°C")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Maks Sıcaklık Farkı (Paket)</S.FieldLabel>
                      <S.FieldValue>{Ge(et.maxDiffTempPack, "°C")}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Dengeleme Süresi</S.FieldLabel>
                      <S.FieldValue>{Ge(et.balancingTime, "s", 0)}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>MC Açma Sayısı</S.FieldLabel>
                      <S.FieldValue>{et.mcOpenCount ?? "N/A"}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Dengelemesiz Dönem</S.FieldLabel>
                      <S.FieldValue>
                        {et.nonBalancingPeriod !== null && et.nonBalancingPeriod !== undefined
                          ? `${et.nonBalancingPeriod} gün`
                          : "N/A"}
                      </S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Aktif Birim Sayısı</S.FieldLabel>
                      <S.FieldValue>{et.liveUnitCount ?? "N/A"}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Durum Kodu</S.FieldLabel>
                      <S.FieldValue>{et.state ?? "N/A"}</S.FieldValue>
                    </S.Field>
                    <S.Field>
                      <S.FieldLabel>Heartbeat</S.FieldLabel>
                      <S.FieldValue>{et.heartbeat ?? "N/A"}</S.FieldValue>
                    </S.Field>
                  </S.Grid>
                </S.Section>
              )}

              {!et && (
                <S.Empty>Gelişmiş telemetri verisi henüz yüklenmedi.</S.Empty>
              )}
            </>
          )}

          {tab === "diagnostics" && (
            <>
              {diag && diag.length > 0 ? (
                <S.DiagnosticList>
                  {diag.map((group) => (
                    <S.DiagGroup key={group.register}>
                      <S.DiagGroupHeader>{group.register}</S.DiagGroupHeader>
                      {group.flags.map((flag) => (
                        <S.DiagFlag key={flag.name}>
                          <S.DiagDot $active={flag.active} />
                          {flag.name}
                        </S.DiagFlag>
                      ))}
                    </S.DiagGroup>
                  ))}
                </S.DiagnosticList>
              ) : (
                <S.Empty>Teşhis verisi henüz yüklenmedi.</S.Empty>
              )}
            </>
          )}
        </S.Body>
      </S.Modal>
    </S.Overlay>,
    document.body,
  );
};
