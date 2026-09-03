// packages/core/src/modbus/utils.ts

/** [0,1) aralığında kriptografik uniform rasgele sayı — reconnect jitter'ı için. */
export const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};
