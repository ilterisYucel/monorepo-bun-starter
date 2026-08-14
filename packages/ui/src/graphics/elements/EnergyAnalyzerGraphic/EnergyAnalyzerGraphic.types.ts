export interface EnergyAnalyzerData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
}

export interface EnergyAnalyzerGraphicConfig {
  step: number;
}

export interface EnergyAnalyzerGraphicProps {
  data: EnergyAnalyzerData;
  x: number;
  y: number;
  width: number;
  height: number;
  config: EnergyAnalyzerGraphicConfig;
  label?: string;
}
