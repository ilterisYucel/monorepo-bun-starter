// packages/ui/src/core/TelemetryInput/TelemetryInput.tsx
import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import type { TelemetryInputProps } from "./TelemetryInput.types";
import * as S from "./TelemetryInput.styles";
import { SlArrowDown, SlArrowUp } from "react-icons/sl";
import { COLORS } from "../../colors";

type StatusKey = "nominal" | "warning" | "alarm";

export const TelemetryInput: React.FC<TelemetryInputProps> = ({
  name,
  description,
  value,
  onChange,
  unit,
  deviceId,
  tags,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 2,
  disabled = false,
  placeholder = "Değer girin",
  size = "medium",
  width,
  className = "",
  status,
  warningThreshold,
  alarmThreshold,
  showRangeBar = true,
  type = "number",
  options,
}) => {
  const [inputValue, setInputValue] = useState(() =>
    value.toFixed(decimals),
  );
  const [focused, setFocused] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!focused) {
      setInputValue(value.toFixed(decimals));
    }
  }, [value, decimals, focused]);

  const effectiveStatus = useMemo<StatusKey | undefined>(() => {
    if (status) return status;
    if (alarmThreshold !== undefined && value >= alarmThreshold) return "alarm";
    if (warningThreshold !== undefined && value >= warningThreshold) return "warning";
    return undefined;
  }, [status, alarmThreshold, warningThreshold, value]);

  const finiteMin = Number.isFinite(min);
  const finiteMax = Number.isFinite(max);
  const hasRange = showRangeBar && finiteMin && finiteMax;
  const rangePercentage = useMemo(() => {
    if (!hasRange) return 0;
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  }, [hasRange, value, min, max]);

  const handleIncrease = useCallback(() => {
    if (disabled) return;
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      const formatted = parseFloat(newValue.toFixed(decimals));
      setInputValue(formatted.toFixed(decimals));
      onChange(formatted);
    }
  }, [disabled, value, step, max, decimals, onChange]);

  const handleDecrease = useCallback(() => {
    if (disabled) return;
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      const formatted = parseFloat(newValue.toFixed(decimals));
      setInputValue(formatted.toFixed(decimals));
      onChange(formatted);
    }
  }, [disabled, value, step, min, decimals, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const rawValue = e.target.value;
      setInputValue(rawValue);
      if (rawValue === "" || rawValue === "-") return;
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue)) return;
      const clampedValue = Math.min(max, Math.max(min, numValue));
      if (clampedValue !== value) onChange(clampedValue);
    },
    [disabled, min, max, value, onChange],
  );

  const handleFocus = useCallback(() => setFocused(true), []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (disabled) return;
    let numValue = parseFloat(inputValue);
    if (isNaN(numValue)) numValue = value;
    const clampedValue = Math.min(max, Math.max(min, numValue));
    const formatted = parseFloat(clampedValue.toFixed(decimals));
    setInputValue(formatted.toFixed(decimals));
    if (formatted !== value) onChange(formatted);
  }, [disabled, inputValue, min, max, decimals, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleIncrease();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleDecrease();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleBlur();
      }
    },
    [disabled, handleIncrease, handleDecrease, handleBlur],
  );

  const hasTags = tags && Object.keys(tags).length > 0;

  // Select varyantı
  if (type === "select" && options) {
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (disabled) return;
      const val = Number(e.target.value);
      if (val !== value) onChange(val);
    };

    const handleArrowClick = () => {
      const el = selectRef.current;
      if (!el) return;
      if ((el as any).showPicker) {
        (el as any).showPicker();
      } else {
        el.click();
      }
    };

    return (
      <S.Container
        className={className}
        disabled={disabled}
        size={size}
        $status={effectiveStatus}
        style={{
          width: width
            ? typeof width === "number"
              ? `${width}px`
              : width
            : "100%",
        }}
      >
        <S.Header>
          <S.LabelSection>
            {effectiveStatus && <S.StatusDot $status={effectiveStatus} />}
            <S.Name>{name}</S.Name>
            {deviceId && <S.DeviceId>{deviceId}</S.DeviceId>}
          </S.LabelSection>
        </S.Header>

        <S.InputGroup $status={effectiveStatus}>
          <S.SelectValue
            ref={selectRef}
            $status={effectiveStatus}
            value={String(value)}
            onChange={handleSelectChange}
            disabled={disabled}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </S.SelectValue>
          <S.SelectArrow onClick={handleArrowClick} />
          <S.Unit>{unit}</S.Unit>
        </S.InputGroup>

        {description && (
          <S.Description>{description}</S.Description>
        )}
      </S.Container>
    );
  }

  return (
    <S.Container
      className={className}
      disabled={disabled}
      size={size}
      $status={effectiveStatus}
      style={{
        width: width
          ? typeof width === "number"
            ? `${width}px`
            : width
          : "100%",
      }}
    >
      <S.Header>
        <S.LabelSection>
          {effectiveStatus && <S.StatusDot $status={effectiveStatus} />}
          <S.Name>{name}</S.Name>
          {deviceId && <S.DeviceId>{deviceId}</S.DeviceId>}
          {hasTags && (
            <S.TagsContainer>
              {Object.entries(tags!).map(([key, val]) => (
                <S.Tag key={key}>
                  <S.TagKey>{key}</S.TagKey>
                  <S.TagValue>: {val}</S.TagValue>
                </S.Tag>
              ))}
            </S.TagsContainer>
          )}
        </S.LabelSection>
      </S.Header>

      <S.InputGroup $status={effectiveStatus}>
        <S.ValueInput
          type="text"
          $status={effectiveStatus}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <S.Unit>{unit}</S.Unit>
        {!disabled && (
          <S.Controls>
            <S.ControlBtn onClick={handleIncrease} disabled={value >= max}>
              <SlArrowUp size={16} color={COLORS.textMuted} />
            </S.ControlBtn>
            <S.ControlBtn onClick={handleDecrease} disabled={value <= min}>
              <SlArrowDown size={16} color={COLORS.textMuted} />
            </S.ControlBtn>
          </S.Controls>
        )}
      </S.InputGroup>

      {hasRange && (
        <S.RangeContainer>
          <S.RangeBar>
            <S.RangeBarFill
              $percentage={rangePercentage}
              $status={effectiveStatus}
            />
          </S.RangeBar>
          <S.RangeLabels>
            <span>
              {min}
              {unit}
            </span>
            <span>
              {max}
              {unit}
            </span>
          </S.RangeLabels>
        </S.RangeContainer>
      )}

      <S.Footer>
        {description && <S.Description>{description}</S.Description>}
        {!hasRange && (
          <S.LimitIndicator>
            <span>
              {min}
              {unit} / {max}
              {unit}
            </span>
          </S.LimitIndicator>
        )}
      </S.Footer>
    </S.Container>
  );
};
