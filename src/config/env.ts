function requireEnv(key: string): string {
  // On frontend builds, use import.meta.env
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (!value) throw new Error(`❌ Missing env var (frontend): ${key}`);
    return value;
  }

  // On Netlify/Vercel functions, use process.env
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    if (!value) throw new Error(`❌ Missing env var (server): ${key}`);
    return value;
  }

  throw new Error(`❌ Env lookup failed for ${key}`);
}

export const GHL_ENV = {
  CLIENT_ID: requireEnv("VITE_GHL_CLIENT_ID"),
  CLIENT_SECRET: requireEnv("VITE_GHL_CLIENT_SECRET"),
  REDIRECT_URI: requireEnv("VITE_GHL_REDIRECT_URI"),
  API_TOKEN: requireEnv("VITE_GHL_API_TOKEN"),
  LOCATION_ID: requireEnv("VITE_GHL_LOCATION_ID"),
};
