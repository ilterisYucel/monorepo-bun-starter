// apps/field/src/features/ui/Modal.tsx
import React, { useEffect } from "react";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import * as S from "./Modal.styles";

const CloseIcon = SCADA_ICONS.close;

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  width?: number;
}

/**
 * Modal — field uygulamasının ortak kapatma sözleşmesi (2026-08-30):
 * Escape tuşu, overlay tıklaması ve kapatma butonu onClose'u tetikler;
 * içerik tıklamaları modala dokunmaz (stopPropagation). `open=false` iken
 * hiçbir şey render edilmez.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  width,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <S.Overlay onClick={onClose}>
      <S.ModalContainer
        width={width}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <S.Header>
          <S.Title>{title}</S.Title>
          <S.CloseButton onClick={onClose} aria-label="close">
            <CloseIcon size={20} />
          </S.CloseButton>
        </S.Header>
        <S.Body>{children}</S.Body>
      </S.ModalContainer>
    </S.Overlay>
  );
};

Modal.displayName = "Modal";
