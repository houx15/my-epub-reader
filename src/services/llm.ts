import type {
  GeminiRequest,
  GeminiResponse,
  GeminiContent,
  LLMServiceConfig,
  ChatOptions,
  SummarizeOptions,
  OrganizeNotesOptions,
  ChatMessage,
} from '../types';

/**
 * Gemini LLM Service
 * Handles all interactions with the Gemini API for chat, summarization, and note organization
 */
export class GeminiLLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: LLMServiceConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-3-pro-preview';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  /**
   * Convert ChatMessage[] to Gemini format
   */
  private convertToGeminiHistory(messages: ChatMessage[]): GeminiContent[] {
    return messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Build system instruction based on chat context
   */
  private buildSystemInstruction(options: ChatOptions): string {
    const { bookTitle, selectedText } = options;

    let instruction = `你是一个阅读助手。用户正在阅读《${bookTitle}》。`;

    if (selectedText) {
      instruction += `\n\n用户选中了以下片段希望讨论：\n"""\n${selectedText}\n"""`;
    }

    instruction += '\n\n请帮助用户理解、分析或延伸讨论这段内容。回答要简洁有深度。请用中文回答。直接输出你的回答，不要任何前言或解释。';

    return instruction;
  }

  /**
   * Make a request to Gemini API
   */
  private async makeRequest(requestBody: GeminiRequest): Promise<GeminiResponse> {
    const endpoint = `${this.baseUrl}/v1beta/models/${this.model}:generateContent`;
    const url = `${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data: GeminiResponse = await response.json();
    return data;
  }

  /**
   * Extract text from Gemini response
   */
  private extractResponseText(response: GeminiResponse): string {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error('No response candidate from Gemini');
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No text in Gemini response');
    }

    return text;
  }

  /**
   * Send a chat message and get response
   */
  async chat(userMessage: string, options: ChatOptions): Promise<string> {
    const { conversationHistory = [], temperature = 0.7, maxTokens = 10000 } = options;

    // Build conversation history
    const contents: GeminiContent[] = [
      ...this.convertToGeminiHistory(conversationHistory),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    // Build request
    const request: GeminiRequest = {
      contents,
      systemInstruction: {
        parts: [{ text: this.buildSystemInstruction(options) }],
      },
      generationConfig: {
        // temperature,
        maxOutputTokens: maxTokens,
        // topP: 0.95,
        // topK: 40,
      },
    };

    const response = await this.makeRequest(request);
    return this.extractResponseText(response);
  }

  /**
   * Summarize a conversation into key points
   */
  async summarizeConversation(options: SummarizeOptions): Promise<string> {
    const { conversationHistory, format = 'bullet-points' } = options;

    const formatInstruction =
      format === 'bullet-points'
        ? '请将以上对话总结为一个主题问题/话题，以及3-6个要点，格式为：\n主题: ...\n讨论总结: ...\n\n只输出问答内容，不要任何前言或解释。请用中文回答。'
        : '请将以上对话总结为一个主题问题/话题，以及2-3个段落总结，格式为：\n主题: ...\n讨论总结: ...\n\n只输出问答内容，不要任何前言或解释。请用中文回答。';

    const contents: GeminiContent[] = [
      ...this.convertToGeminiHistory(conversationHistory),
      {
        role: 'user',
        parts: [{ text: formatInstruction }],
      },
    ];

    const request: GeminiRequest = {
      contents,
      generationConfig: {
        // temperature: 0.3,
        maxOutputTokens: 5000,
      },
    };

    const response = await this.makeRequest(request);
    return this.extractResponseText(response);
  }

  /**
   * Organize and structure reading notes
   */
  async organizeNotes(options: OrganizeNotesOptions): Promise<string> {
    const { bookTitle, noteContent } = options;

    const prompt = `请帮我整理以下《${bookTitle}》的阅读笔记。要求：

1. 保留所有原始引用（> 开头的内容）和定位锚点（<!-- loc:xxx -->）
2. 将我的批注和讨论总结进行归类整理
3. 在开头生成一个"核心要点"摘要（3-5条）
4. 在结尾生成"延伸思考"或"待探索问题"
5. 保持Markdown格式
6. 请用中文整理。直接输出整理后的笔记，不要任何前言或解释。

原始笔记：
"""
${noteContent}
"""`;

    const contents: GeminiContent[] = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const request: GeminiRequest = {
      contents,
      systemInstruction: {
        parts: [
          {
            text: '你是一个笔记整理助手。请帮助整理阅读笔记，同时保留所有原始内容和引用。请用中文回答。',
          },
        ],
      },
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 40000,
      },
    };

    const response = await this.makeRequest(request);
    return this.extractResponseText(response);
  }

  /**
   * Stream chat response (for future implementation)
   * Note: Streaming requires using the streamGenerateContent endpoint
   */
  async *chatStream(
    userMessage: string,
    options: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    // Placeholder for streaming implementation
    // The Gemini API supports streaming via:
    // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent

    const response = await this.chat(userMessage, options);
    yield response;
  }

  /**
   * Update API configuration
   */
  updateConfig(config: Partial<LLMServiceConfig>) {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }
}

// Export a singleton instance creator
let instance: GeminiLLMService | null = null;

export function createLLMService(config: LLMServiceConfig): GeminiLLMService {
  instance = new GeminiLLMService(config);
  return instance;
}

export function getLLMService(): GeminiLLMService {
  if (!instance) {
    throw new Error('LLM service not initialized. Call createLLMService first.');
  }
  return instance;
}
