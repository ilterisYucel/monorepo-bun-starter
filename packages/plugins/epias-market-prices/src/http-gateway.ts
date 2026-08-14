/**
 * HTTP erisim sozlesmesi — testlerde mock uygulamayla degistirilebilir.
 */
export interface HttpGateway {
  /** Sorgu — mutlak URL'den JSON dondurur. Hata durumunda firlatir. */
  getJson<T>(url: string, headers: Record<string, string>): Promise<T>;
}

export class FetchHttpGateway implements HttpGateway {
  async getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `[FetchHttpGateway] HTTP ${response.status} (${response.statusText}): ${url}`,
      );
    }
    return (await response.json()) as T;
  }
}
