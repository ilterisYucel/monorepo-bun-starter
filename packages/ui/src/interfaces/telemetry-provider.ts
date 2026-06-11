// packages/ui/src/interfaces/telemetry-provider.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { TimeRange } from "../types";



/**
 * Telemetry verisi tüketen tüm UI bileşenlerinin (Chart, Table, Gauge, Card, vb.)
 * ihtiyaç duyduğu ortak arayüz.
 * 
 * Bu interface, UI katmanının veri kaynağından nasıl beslendiğini soyutlar.
 * Böylece bileşenler, verinin TanStack Query, SWR, Apollo veya native fetch
 * ile mi geldiğini bilmez; sadece bu contract'a uyan bir provider bekler.
 * 
 * @example
 * ```tsx
 * // Bileşen içinde kullanımı
 * const TelemetryChart = ({ provider }: { provider: TelemetryProvider }) => {
 *   const { data, isLoading, range, setRange } = provider;
 *   // ...
 * };
 * ```
 */
export interface TelemetryProvider {
  // ==================== DATA STATES ====================
  
  /**
   * Downsampled telemetry verileri.
   * Zaman aralığı ve nokta sayısına göre filtrelenmiş, backend'den gelen ham veri.
   * 
   * @example `[{ name: "Voltage", value: 48.2, timestamp: "..." }, ...]`
   */
  data: TelemetryData[];
  
  /**
   * Verinin yüklenme durumu.
   * İlk yükleme veya refetch sırasında `true` olur.
   */
  isLoading: boolean;
  
  /**
   * Veri çekme sırasında hata oluşup oluşmadığı.
   * Network hatası, timeout, backend 500 gibi durumlarda `true` olur.
   */
  isError: boolean;
  
  /**
   * Hata oluştuysa hata detayları.
   * `isError` true olduğunda geçerlidir.
   */
  error: Error | null;
  
  
  // ==================== FILTER STATES ====================
  
  /**
   * Seçilen telemetry adı.
   * - `"all"`: Tüm telemetry'leri gösterir
   * - Belirli bir isim: Sadece o telemetry'yi gösterir (örn: "Voltage")
   * 
   * @default "all"
   */
  selectedName: string;
  
  /**
   * Zaman aralığı.
   * 
   * @default "1h"
   */
  range: TimeRange;
  
  /**
   * Dönecek veri noktası sayısı.
   * Backend, bu kadar noktayı eşit aralıklarla özetleyerek döner (downsampling).
   * 
   * @default 120
   */
  points: number;
  
  
  // ==================== ACTIONS ====================
  
  /**
   * Veriyi manuel olarak yeniler.
   * Kullanıcı "Yenile" butonuna tıkladığında çağrılır.
   */
  refetch: () => void;
  
  /**
   * Zaman aralığını değiştirir.
   * Değişiklik sonrası veri otomatik olarak yeniden çekilir.
   * 
   * @param range - Yeni zaman aralığı
   */
  setRange: (range: TimeRange) => void;
  
  /**
   * Nokta sayısını değiştirir.
   * Değişiklik sonrası veri otomatik olarak yeniden çekilir.
   * 
   * @param points - Yeni nokta sayısı (örn: 60, 120, 240, 500)
   */
  setPoints: (points: number) => void;
  
  /**
   * Gösterilecek telemetry adını değiştirir.
   * Değişiklik sonrası veri otomatik olarak yeniden çekilir.
   * 
   * @param name - Telemetry adı veya "all"
   */
  setSelectedName: (name: string | "all") => void;
}


/**
 * `useTelemetry` hook'unun alacağı konfigürasyon parametreleri.
 * 
 * @example
 * ```tsx
 * const provider = useTelemetry({
 *   telemetryNames: ["Voltage", "Current", "Power", "SoC"],
 *   defaultRange: "1h",
 *   defaultPoints: 120,
 * });
 * ```
 */
export interface TelemetryProviderOptions {
  /**
   * Gösterilebilecek telemetry isimleri listesi.
   * UI bileşenleri bu listedeki isimleri kullanarak seçim yapar.
   * 
   * @example `["Voltage", "Current", "Power", "SoC"]`
   */
  telemetryNames: string[];
  
  /**
   * Varsayılan zaman aralığı.
   * 
   * @default "1h"
   */
  defaultRange?: TimeRange;
  
  /**
   * Varsayılan nokta sayısı.
   * 
   * @default 120
   */
  defaultPoints?: number;
  
    /**
   * Filtreleme parametreleri (backend'deki tags ile eşleşir).
   * Örneğin: { rack_id: "1" } veya { device_id: "sensor-1" }
   */
  filters?: Record<string, string>;
}


/**
 * `useTelemetry` hook'unun tip tanımı.
 * 
 * Bu hook, uygulama katmanında (app-web, app-desktop, vb.) implemente edilir.
 * UI paketi bu tipi tüketir, implementasyon detaylarını bilmez.
 * 
 * @param options - Hook konfigürasyonu
 * @returns TelemetryProvider - Bileşenlerin kullanacağı provider nesnesi
 * 
 * @example
 * ```tsx
 * // app-web/src/hooks/useTelemetry.ts
 * export const useTelemetry: UseTelemetryProvider = (options) => {
 *   const [range, setRange] = useState(options.defaultRange || "1h");
 *   const { data, isLoading } = useQuery({
 *     queryKey: ['telemetry', range],
 *     queryFn: () => api.getTelemetry(range)
 *   });
 *   
 *   return {
 *     data,
 *     isLoading,
 *     isError: false,
 *     error: null,
 *     selectedName: "all",
 *     range,
 *     points: options.defaultPoints || 120,
 *     refetch: () => {},
 *     setRange,
 *     setPoints: () => {},
 *     setSelectedName: () => {}
 *   };
 * };
 * ```
 */
export type UseTelemetryProvider = (options: TelemetryProviderOptions) => TelemetryProvider;