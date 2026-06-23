let cachedResult: boolean | null = null;

export function supportsWebGL(): boolean {
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement("canvas");
    cachedResult = !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    cachedResult = false;
  }

  return cachedResult;
}
