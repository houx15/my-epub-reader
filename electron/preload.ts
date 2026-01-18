import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  openDirectoryDialog: () => ipcRenderer.invoke('file:open-directory'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  showSaveDialog: (options: any) => ipcRenderer.invoke('file:save-dialog', options),
  getUserDataPath: () => ipcRenderer.invoke('file:get-user-data-path'),

  // Config operations
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config: any) => ipcRenderer.invoke('config:save', config),

  // Storage operations
  readJSON: (filePath: string) => ipcRenderer.invoke('storage:read-json', filePath),
  writeJSON: (filePath: string, data: any) => ipcRenderer.invoke('storage:write-json', filePath, data),
  ensureDir: (dirPath: string) => ipcRenderer.invoke('storage:ensure-dir', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('storage:file-exists', filePath),
  moveNotesStorage: (fromPath: string, toPath: string) => ipcRenderer.invoke('storage:move-notes', fromPath, toPath),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: {
      openFileDialog: () => Promise<{ filePath: string; canceled: boolean }>;
      openDirectoryDialog: () => Promise<{ filePath: string; canceled: boolean }>;
      readFile: (filePath: string) => Promise<ArrayBuffer>;
      writeFile: (filePath: string, content: string) => Promise<void>;
      showSaveDialog: (options: any) => Promise<{ filePath: string; canceled: boolean }>;
      getUserDataPath: () => Promise<string>;
      loadConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<void>;
      readJSON: (filePath: string) => Promise<any>;
      writeJSON: (filePath: string, data: any) => Promise<void>;
      ensureDir: (dirPath: string) => Promise<void>;
      fileExists: (filePath: string) => Promise<boolean>;
      moveNotesStorage: (fromPath: string, toPath: string) => Promise<{ success: boolean; message?: string }>;
    };
  }
}
