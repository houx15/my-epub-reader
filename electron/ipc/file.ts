import { ipcMain, dialog, app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { mainWindow } from '../main';

async function copyDir(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length === 0;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

export function registerFileHandlers() {
  // Open file dialog for EPUB files
  ipcMain.handle('file:open-dialog', async () => {
    if (!mainWindow) {
      return { filePath: '', canceled: true };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'EPUB Files', extensions: ['epub'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { filePath: '', canceled: true };
    }

    return { filePath: result.filePaths[0], canceled: false };
  });

  // Open directory dialog
  ipcMain.handle('file:open-directory', async () => {
    if (!mainWindow) {
      return { filePath: '', canceled: true };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { filePath: '', canceled: true };
    }

    return { filePath: result.filePaths[0], canceled: false };
  });

  // Move notes storage directory
  ipcMain.handle('storage:move-notes', async (_event, fromPath: string, toPath: string) => {
    try {
      if (!fromPath || !toPath) {
        throw new Error('Source and destination paths are required');
      }

      const isEmpty = await isDirectoryEmpty(toPath);
      if (!isEmpty) {
        throw new Error('Destination folder is not empty');
      }

      try {
        await fs.rename(fromPath, toPath);
      } catch (error: any) {
        if (error?.code === 'EXDEV') {
          await copyDir(fromPath, toPath);
          await fs.rm(fromPath, { recursive: true, force: true });
        } else {
          throw error;
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to move notes storage:', error);
      return { success: false, message: error?.message || 'Failed to move notes' };
    }
  });

  // Read file as ArrayBuffer
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  // Write file
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  });

  // Show save dialog
  ipcMain.handle('file:save-dialog', async (_event, options) => {
    if (!mainWindow) {
      return { filePath: '', canceled: true };
    }

    const result = await dialog.showSaveDialog(mainWindow, options);

    if (result.canceled || !result.filePath) {
      return { filePath: '', canceled: true };
    }

    return { filePath: result.filePath, canceled: false };
  });

  // Get user data path
  ipcMain.handle('file:get-user-data-path', async () => {
    return app.getPath('userData');
  });

  // Load config.json
  ipcMain.handle('config:load', async () => {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      // Return default config if file doesn't exist
      return {
        llm: {
          provider: 'gemini',
          apiKey: '',
          model: 'gemini-3-pro-preview',
          baseUrl: 'https://generativelanguage.googleapis.com',
        },
        display: {
          theme: 'system',
          fontSize: 16,
          notesFontSize: 14,
        },
        export: {
          defaultPath: path.join(app.getPath('documents'), 'EPUB-Notes'),
        },
        storage: {
          notesPath: '',
        },
      };
    }
  });

  // Save config.json
  ipcMain.handle('config:save', async (_event, config) => {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  });

  // Read JSON file
  ipcMain.handle('storage:read-json', async (_event, filePath: string) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON:', error);
      throw error;
    }
  });

  // Write JSON file
  ipcMain.handle('storage:write-json', async (_event, filePath: string, data: any) => {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing JSON:', error);
      throw error;
    }
  });

  // Ensure directory exists
  ipcMain.handle('storage:ensure-dir', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  });

  // Check if file exists
  ipcMain.handle('storage:file-exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });
}
