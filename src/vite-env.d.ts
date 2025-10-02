/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GHL_CLIENT_ID: string;
  readonly VITE_GHL_CLIENT_SECRET: string;
  readonly VITE_GHL_REDIRECT_URI: string;
  readonly VITE_GHL_API_TOKEN: string;
  readonly VITE_GHL_LOCATION_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
