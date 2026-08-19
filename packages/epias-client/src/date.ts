/**
 * EPIAS tarih bicimlendirmesi.
 *
 * EPIAS servislerindeki tum tarih alanlari ISO-8601 biciminde ve Turkiye
 * saatine goredir (`+03:00`). Turkiye'de yaz/kis saati uygulanmadigi icin
 * isteklerde sabit +03:00 ofseti kullanilir; eski (DST'li) donem verilerini
 * ayristirirken gelen string'in kendi ofseti dikkate alinir.
 */
export function toEpiasIso(date: Date): string {
  const tr = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${tr.getUTCFullYear()}-${pad(tr.getUTCMonth() + 1)}-${pad(tr.getUTCDate())}` +
    `T${pad(tr.getUTCHours())}:${pad(tr.getUTCMinutes())}:${pad(tr.getUTCSeconds())}+03:00`
  );
}
