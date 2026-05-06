/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMENT_SEARCH_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
