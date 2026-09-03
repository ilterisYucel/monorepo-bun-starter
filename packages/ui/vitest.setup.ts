import "@testing-library/jest-dom/vitest";

// jsdom ResizeObserver taşımaz — chart bileşenleri (uPlot) boyut takibi için
// gerçek tarayıcıda kullanır; testlerde no-op stub yeterlidir.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
