function requireEnv(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
  return value;
}

export const GHL_ENV = {
  CLIENT_ID: requireEnv("VITE_GHL_CLIENT_ID"),
  CLIENT_SECRET: requireEnv("VITE_GHL_CLIENT_SECRET"),
  REDIRECT_URI: requireEnv("VITE_GHL_REDIRECT_URI"),
  API_TOKEN: requireEnv("VITE_GHL_API_TOKEN"),
  LOCATION_ID: requireEnv("VITE_GHL_LOCATION_ID"),
};
