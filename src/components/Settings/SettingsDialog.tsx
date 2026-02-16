import { useState, useEffect } from 'react';
import { X, Check, Sun, Moon, Monitor, Lightbulb } from '../Icons';
import { useAppStore } from '../../stores/appStore';
import { createLLMService } from '../../services/llm';
import './SettingsDialog.css';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'llm' | 'appearance';

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    config,
    setConfig,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    notesFontSize,
    setNotesFontSize,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [apiKey, setApiKey] = useState('');
  const [notesPath, setNotesPath] = useState('');
  const [isMovingNotes, setIsMovingNotes] = useState(false);
  const [moveResult, setMoveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load current config when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    if (config?.llm?.apiKey) {
      setApiKey(config.llm.apiKey);
    }

    setNotesPath(config?.storage?.notesPath || '');
    setMoveResult(null);
  }, [isOpen, config]);

  if (!isOpen) return null;

  /**
   * Test API key connection
   */
  const handleTestAPIKey = async () => {
    if (!apiKey.trim()) {
      setApiTestResult({
        success: false,
        message: 'Please enter an API key',
      });
      return;
    }

    setIsTestingAPI(true);
    setApiTestResult(null);

    try {
      const testService = createLLMService({
        apiKey: apiKey.trim(),
        model: 'gemini-3-pro-preview',
        baseUrl: 'https://generativelanguage.googleapis.com',
      });

      await testService.chat('test', {
        bookTitle: 'test',
        maxTokens: 10,
      });

      setApiTestResult({
        success: true,
        message: 'API key is valid!',
      });
    } catch (error: any) {
      setApiTestResult({
        success: false,
        message: error.message || 'Failed to connect to API',
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  /**
   * Save settings
   */
  const handleSave = async () => {
    // Update config with new API key
    const updatedConfig = {
      ...config,
      llm: {
        provider: 'gemini' as const,
        apiKey: apiKey.trim(),
        model: 'gemini-3-pro-preview',
        baseUrl: 'https://generativelanguage.googleapis.com',
      },
      display: {
        theme,
        fontSize,
        notesFontSize,
      },
      storage: {
        notesPath: notesPath.trim(),
      },
    };

    setConfig(updatedConfig);

    // Config is auto-saved by the store
    onClose();
  };

  const joinPath = (...parts: string[]) =>
    parts
      .map((part, index) => {
        if (index === 0) {
          return part.replace(/\/+$/, '');
        }
        return part.replace(/^\/+|\/+$/g, '');
      })
      .filter(Boolean)
      .join('/');

  const handleMoveNotes = async () => {
    if (!notesPath.trim()) {
      setMoveResult({ success: false, message: 'Please choose a destination folder first.' });
      return;
    }

    if (!config) {
      setMoveResult({ success: false, message: 'Config not loaded yet.' });
      return;
    }

    setIsMovingNotes(true);
    setMoveResult(null);

    try {
      const userDataPath = await window.electron.getUserDataPath();
      const currentPath = config.storage?.notesPath?.trim();
      const fromPath = currentPath || joinPath(userDataPath, 'books');
      const toPath = notesPath.trim();

      if (fromPath === toPath) {
        setMoveResult({ success: false, message: 'Source and destination are the same.' });
        return;
      }

      if (window.electron.moveNotesStorage) {
        const result = await window.electron.moveNotesStorage(fromPath, toPath);
        if (!result.success) {
          setMoveResult({ success: false, message: result.message || 'Failed to move notes.' });
          return;
        }
      }

      const updatedConfig = {
        ...config,
        storage: {
          notesPath: toPath,
        },
      };

      setConfig(updatedConfig);
      if (window.electron.saveConfig) {
        await window.electron.saveConfig(updatedConfig);
      }
      setMoveResult({ success: true, message: 'Notes moved successfully.' });
    } catch (error: any) {
      setMoveResult({ success: false, message: error?.message || 'Failed to move notes.' });
    } finally {
      setIsMovingNotes(false);
    }
  };

  /**
   * Render General tab
   */
  const renderGeneralTab = () => (
    <div className="settings-tab-content">
      <h3>General Settings</h3>
      <div className="setting-group">
        <label>Auto-save Interval</label>
        <p className="setting-description">Notes are auto-saved 2 seconds after you stop typing</p>
        <div className="setting-value">2 seconds (fixed)</div>
      </div>
      <div className="setting-group">
        <label>Notes Folder</label>
        <p className="setting-description">Choose where notes and metadata are stored</p>
        <div className="setting-value">
          {notesPath ? notesPath : '(Default app data folder)'}
        </div>
        <button
          className="btn-secondary"
          onClick={async () => {
            if (window.electron.openDirectoryDialog) {
              const result = await window.electron.openDirectoryDialog();
              if (!result.canceled && result.filePath) {
                setNotesPath(result.filePath);
              }
            }
          }}
        >
          Choose Folder
        </button>
        <button
          className="btn-secondary"
          onClick={handleMoveNotes}
          disabled={isMovingNotes}
        >
          {isMovingNotes ? 'Moving...' : 'Move Existing Notes Here'}
        </button>
        {moveResult && (
          <div className={`api-test-result ${moveResult.success ? 'success' : 'error'}`}>
            {moveResult.success ? <Check size={16} /> : <X size={16} />} {moveResult.message}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render LLM tab
   */
  const renderLLMTab = () => (
    <div className="settings-tab-content">
      <h3>LLM Settings</h3>

      <div className="setting-group">
        <label htmlFor="api-key">Gemini API Key</label>
        <p className="setting-description">
          Get your API key from{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AI Studio
          </a>
        </p>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Gemini API key"
          className="api-key-input"
        />
        <button
          className="btn-secondary test-button"
          onClick={handleTestAPIKey}
          disabled={isTestingAPI || !apiKey.trim()}
        >
          {isTestingAPI ? 'Testing...' : 'Test Connection'}
        </button>

        {apiTestResult && (
          <div
            className={`api-test-result ${
              apiTestResult.success ? 'success' : 'error'
            }`}
          >
            {apiTestResult.success ? <Check size={16} /> : <X size={16} />} {apiTestResult.message}
          </div>
        )}
      </div>

      <div className="setting-group">
        <label>Model</label>
        <div className="setting-value">gemini-3-pro-preview</div>
        <p className="setting-description">Fast and efficient model for chat</p>
      </div>
    </div>
  );

  /**
   * Render Appearance tab
   */
  const renderAppearanceTab = () => (
    <div className="settings-tab-content">
      <h3>Appearance</h3>

      <div className="setting-group">
        <label>Theme</label>
        <div className="theme-selector">
          <button
            className={`theme-button ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={16} />
            <span>Light</span>
          </button>
          <button
            className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={16} />
            <span>Dark</span>
          </button>
          <button
            className={`theme-button ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
          >
            <Monitor size={16} />
            <span>System</span>
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label htmlFor="font-size">EPUB Font Size: {fontSize}px</label>
        <input
          id="font-size"
          type="range"
          min="12"
          max="24"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="setting-group">
        <label htmlFor="notes-font-size">Notes Font Size: {notesFontSize}px</label>
        <input
          id="notes-font-size"
          type="range"
          min="10"
          max="20"
          value={notesFontSize}
          onChange={(e) => setNotesFontSize(Number(e.target.value))}
          className="slider"
        />
      </div>
    </div>
  );

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`tab-button ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
          >
            LLM
          </button>
          <button
            className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'llm' && renderLLMTab()}
          {activeTab === 'appearance' && renderAppearanceTab()}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="keyboard-hint">
            <Lightbulb size={14} />
            <span>Press ⌘, to open settings</span>
          </div>
          <div className="settings-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
