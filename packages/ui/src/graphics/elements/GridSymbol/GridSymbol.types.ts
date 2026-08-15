export interface GridSymbolConfig {
  step: number;
}

export interface GridSymbolProps {
  x: number;
  y: number;
  width: number;
  height: number;
  config: GridSymbolConfig;
}
