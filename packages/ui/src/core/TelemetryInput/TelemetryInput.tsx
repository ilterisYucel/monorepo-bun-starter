// packages/ui/src/core/TelemetryInput/TelemetryInput.tsx
import React, { useCallback, useState, useEffect } from "react";
import type { TelemetryInputProps } from "./TelemetryInput.types";
import * as S from "./TelemetryInput.styles";

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
}) => {
  const [inputValue, setInputValue] = useState(value.toFixed(decimals));

  useEffect(() => {
    setInputValue(value.toFixed(decimals));
  }, [value, decimals]);

  const handleIncrease = useCallback(() => {
    if (disabled) return;
    const newValue = Math.min(max, value + step);
    if (newValue !== value) onChange(parseFloat(newValue.toFixed(decimals)));
  }, [disabled, value, step, max, decimals, onChange]);

  const handleDecrease = useCallback(() => {
    if (disabled) return;
    const newValue = Math.max(min, value - step);
    if (newValue !== value) onChange(parseFloat(newValue.toFixed(decimals)));
  }, [disabled, value, step, min, decimals, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const rawValue = e.target.value;
      setInputValue(rawValue);
      if (rawValue === "" || rawValue === "-") return;
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue)) return;
      let clampedValue = Math.min(max, Math.max(min, numValue));
      if (step !== 1) {
        const steppedValue = Math.round(clampedValue / step) * step;
        clampedValue = parseFloat(steppedValue.toFixed(decimals));
      }
      clampedValue = parseFloat(clampedValue.toFixed(decimals));
      if (clampedValue !== value) onChange(clampedValue);
    },
    [disabled, min, max, step, decimals, value, onChange],
  );

  const handleBlur = useCallback(() => {
    if (disabled) return;
    let numValue = parseFloat(inputValue);
    if (isNaN(numValue)) numValue = value;
    let clampedValue = Math.min(max, Math.max(min, numValue));
    clampedValue = parseFloat(clampedValue.toFixed(decimals));
    setInputValue(clampedValue.toFixed(decimals));
    if (clampedValue !== value) onChange(clampedValue);
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

  return (
    <S.Container
      className={className}
      disabled={disabled}
      size={size}
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
          <S.Name>{name}</S.Name>
          {deviceId && <S.DeviceId>{deviceId}</S.DeviceId>}
          {hasTags && (
            <S.TagsContainer>
              {Object.entries(tags!).map(([key, val]) => (
                <S.Tag key={key}>
                  {key}: {val}
                </S.Tag>
              ))}
            </S.TagsContainer>
          )}
        </S.LabelSection>
      </S.Header>

      <S.InputGroup>
        <S.ValueInput
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <S.Unit>{unit}</S.Unit>
        {!disabled && (
          <S.Controls>
            <S.ControlBtn onClick={handleIncrease} disabled={value >= max}>
              ▲
            </S.ControlBtn>
            <S.ControlBtn onClick={handleDecrease} disabled={value <= min}>
              ▼
            </S.ControlBtn>
          </S.Controls>
        )}
      </S.InputGroup>

      {description && <S.Description>{description}</S.Description>}
      {min !== -Infinity && max !== Infinity && (
        <S.LimitIndicator>
          <span>Min: {min}</span>
          <span>Max: {max}</span>
        </S.LimitIndicator>
      )}
    </S.Container>
  );
};
