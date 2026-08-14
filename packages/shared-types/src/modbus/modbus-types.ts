/**
 * Byte Order (Endianness) tipleri
 * - BIG_ENDIAN: Motorola sırası, en anlamlı byte ilk (ABCD)
 * - LITTLE_ENDIAN: Intel sırası, en az anlamlı byte ilk (DCBA)
 * - BIG_ENDIAN_SWAP: Word'ler swap edilmiş (BADC)
 * - LITTLE_ENDIAN_SWAP: Word'ler swap edilmiş little endian (CDAB)
 */
export type ByteOrder =
  | "BIG_ENDIAN"
  | "LITTLE_ENDIAN"
  | "BIG_ENDIAN_SWAP"
  | "LITTLE_ENDIAN_SWAP";
