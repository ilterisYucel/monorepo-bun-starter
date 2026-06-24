/**
 * Olay/arıza anotasyonları için arayüz.
 * TelemetryChart bu provider üzerinden dikey dashed çizgileri gösterir.
 * UI paketi tamamen API'den bağımsızdır — bu kontratı implemente eden
 * herhangi bir veri kaynağı kullanılabilir.
 */

export interface EventAnnotation {
  /** ISO 8601 timestamp — çizginin x ekseninde nereye konacağı */
  timestamp: string;
  /** Label olarak gösterilecek mesaj */
  message: string;
  /** Log seviyesi — çizgi rengini belirler */
  type: "error" | "warning" | "success" | "info";
  /** Kategori — checkbox filtrelemesi için */
  category: "system" | "user";
}

export interface EventAnnotationsProvider {
  annotations: EventAnnotation[];
  isLoading: boolean;
}
