// Type declarations for Electron API exposed to renderer process

export interface ElectronAPI {
  openFileDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  openDirectoryDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  showSaveDialog: (options: { 
    defaultPath: string; 
    filters: Array<{ name: string; extensions: string[] }> 
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  ensureDir: (dirPath: string) => Promise<void>;
  pathJoin: (...paths: string[]) => Promise<string>;
  pathDirname: (filePath: string) => Promise<string>;
  pathBasename: (filePath: string, ext?: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  loadConfig: () => Promise<{
    llm: {
      apiKey: string;
      model: string;
      baseUrl?: string;
    };
    display: {
      theme: 'light' | 'dark' | 'system';
      fontSize: number;
      notesFontSize: number;
    };
    storage?: {
      notesPath?: string;
    };
  }>;
  saveConfig: (config: unknown) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  writeJSON: (filePath: string, data: unknown) => Promise<void>;
  readJSON: (filePath: string) => Promise<unknown>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
