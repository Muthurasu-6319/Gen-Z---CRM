/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_API_URL?: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
