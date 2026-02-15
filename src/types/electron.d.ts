interface ElectronAPI {
  readFile: (path: string) => Promise<ArrayBuffer>;
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
  readJSON: <T = unknown>(path: string) => Promise<T>;
  writeJSON: (path: string, data: unknown) => Promise<void>;
  readDir: (path: string) => Promise<string[]>;
  ensureDir: (path: string) => Promise<void>;
  createDir: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  getAppPath: (path: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  loadConfig: () => Promise<import('./index').AppConfig>;
  saveConfig: (config: unknown) => Promise<void>;
  moveNotesStorage: (fromPath: string, toPath: string) => Promise<{ success: boolean; message: string }>;
  openFileDialog: (options?: {
    properties?: string[];
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  openDirectoryDialog: (options?: {
    properties?: string[];
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showOpenDialog: (options?: {
    properties?: string[];
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options?: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePath: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
