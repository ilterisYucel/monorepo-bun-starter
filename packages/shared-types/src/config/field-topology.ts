/**
 * Saha topolojisi (EMS domain) — istasyon/fider/ünite mantıksal modeli.
 *
 * Hub/peer katmanı konteyner kimliğinden başka bir şey bilmez; istasyon
 * eşlemesi (hangi konteyner hangi istasyonda) EMS domain'ine (web-service)
 * aittir. Demo frontend bu endpoint'ten render eder.
 */

/** İstasyon fideri: MV hücresi + o fiderdeki üniteler. */
export interface FieldTopologyFeeder {
  /** MV hücresi (ör. H04). */
  cell: string;
  units: number[];
}

/** Tek BESS MV istasyonu (mantıksal). */
export interface FieldTopologyStation {
  key: string;
  name: string;
  /** İstasyonun iki fideri (gdems şablonu: A 5 ünite, B 4 ünite). */
  feeders: { A: FieldTopologyFeeder; B: FieldTopologyFeeder };
  /** İstasyonun tüm ünite numaraları (fiderlerin birleşimi). */
  units: number[];
  /** Bu istasyonu temsil eden konteynerler (hub peer id'leri). */
  containers: string[];
  /** İstasyonun gerçek PCS çifti. */
  pcs: string[];
  /** İstasyonun MV simülatörü. */
  mvDeviceId: string;
}

/** Saha topolojisi dosyası/yanıtı. */
export interface FieldTopology {
  stations: FieldTopologyStation[];
}
