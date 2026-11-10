import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal";

/**
 * Modal sözleşmesi (2026-08-30):
 * - open=false → hiçbir şey render edilmez (null).
 * - open=true → başlık + içerik görünür; aria-modal dialog'dur.
 * - Escape → onClose.
 * - Overlay tıklaması → onClose; içerik tıklaması → onClose ÇAĞRILMAZ.
 */

describe("Modal", () => {
  it("open=false iken null render eder", () => {
    const { container } = render(
      <Modal open={false} title="Test" onClose={vi.fn()}>
        <span>içerik</span>
      </Modal>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("open=true iken başlık ve içerik render eder", () => {
    render(
      <Modal open title="Test Başlık" onClose={vi.fn()}>
        <span>içerik</span>
      </Modal>,
    );
    expect(screen.getByText("Test Başlık")).toBeTruthy();
    expect(screen.getByText("içerik")).toBeTruthy();
  });

  it("Escape tuşu onClose çağırır", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <span>içerik</span>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("overlay tıklaması onClose çağırır", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open title="Test" onClose={onClose}>
        <span>içerik</span>
      </Modal>,
    );
    const overlay = container.querySelector("div");
    fireEvent.click(overlay as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("içerik tıklaması onClose çağırmaz", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <span>içerik</span>
      </Modal>,
    );
    fireEvent.click(screen.getByText("içerik"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("kapatma butonu onClose çağırır", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <span>içerik</span>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
