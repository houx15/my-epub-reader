/**
 * Example: How to initialize the LLM service in your application
 *
 * This file demonstrates the recommended way to set up the Gemini LLM service
 * at application startup.
 */

import { createLLMService } from './llm';
import type { AppConfig } from '../types';

/**
 * Initialize LLM service with configuration
 * Call this at app startup, before rendering React components
 */
export async function initializeLLMService(config: AppConfig) {
  try {
    // Validate API key
    if (!config.llm.apiKey || config.llm.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('⚠️ Gemini API key not configured. LLM features will be disabled.');
      return null;
    }

    // Create the LLM service instance
    const llmService = createLLMService({
      apiKey: config.llm.apiKey,
      model: config.llm.model || 'gemini-3-pro-preview',
      baseUrl: config.llm.baseUrl,
    });

    console.log('✅ LLM service initialized successfully');
    console.log(`   Model: ${config.llm.model}`);

    // Optional: Test the connection with a simple ping
    try {
      await llmService.chat('Hello', {
        bookTitle: 'Test',
        temperature: 0.5,
        maxTokens: 50,
      });
      console.log('✅ LLM service connection test successful');
    } catch (error) {
      console.error('⚠️ LLM service connection test failed:', error);
      throw error;
    }

    return llmService;
  } catch (error) {
    console.error('❌ Failed to initialize LLM service:', error);
    throw error;
  }
}

/**
 * Example usage in your main application file (e.g., App.tsx or main.tsx)
 */
export async function exampleAppInitialization() {
  // 1. Load configuration (from file, environment variables, etc.)
  const config: AppConfig = await loadConfig();

  // 2. Initialize LLM service
  try {
    await initializeLLMService(config);
  } catch (error) {
    // Handle initialization failure
    console.error('Failed to initialize LLM:', error);

    // You might want to:
    // - Show an error message to the user
    // - Disable LLM-related UI elements
    // - Prompt user to configure API key
    showConfigurationPrompt();
  }

  // 3. Continue with the rest of your app initialization
  // ...
}

/**
 * Example: Load configuration from file
 * In Electron, use app.getPath('userData')
 */
async function loadConfig(): Promise<AppConfig> {
  // This is a simplified example
  // In a real app, you'd load this from a config file or database

  const defaultConfig: AppConfig = {
    llm: {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-3-pro-preview',
      baseUrl: 'https://generativelanguage.googleapis.com',
    },
    display: {
      theme: 'system',
      fontSize: 16,
      notesFontSize: 14,
    },
    export: {
      defaultPath: '~/Documents/EPUB-Notes',
    },
  };

  return defaultConfig;
}

/**
 * Example: Show configuration prompt to user
 */
function showConfigurationPrompt() {
  // In a real app, this would open a settings dialog
  console.log('Please configure your Gemini API key in settings.');
}

/**
 * Example: Using the LLM service in a React component
 */
export function ExampleReactComponent() {
  /**
   * Usage example - see the actual LLMPanel component for a full implementation
   *
   * import { useLLM } from '../hooks/useLLM';
   *
   * const { messages, sendMessage, isLoading } = useLLM({
   *   bookTitle: 'My Book',
   *   onError: (error) => {
   *     console.error('LLM error:', error);
   *   },
   * });
   *
   * const handleSend = async () => {
   *   await sendMessage('What is this book about?');
   * };
   */
}

/**
 * Example: Handling API key updates
 */
export async function updateAPIKey(newApiKey: string) {
  try {
    // 1. Validate the new API key
    const testService = createLLMService({
      apiKey: newApiKey,
      model: 'gemini-3-pro-preview',
    });

    // Test the connection
    await testService.chat('test', {
      bookTitle: 'test',
      maxTokens: 10,
    });

    // 2. If successful, update the configuration
    await saveConfig({
      llm: {
        provider: 'gemini',
        apiKey: newApiKey,
        model: 'gemini-3-pro-preview',
      },
    } as any);

    // 3. Reinitialize the service
    const config = await loadConfig();
    await initializeLLMService(config);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid API key',
    };
  }
}

/**
 * Example: Save configuration (simplified)
 */
async function saveConfig(config: Partial<AppConfig>) {
  // In Electron, you would:
  // 1. Get the userData path
  // 2. Write to config.json
  // 3. Handle errors appropriately

  console.log('Saving config:', config);
}
