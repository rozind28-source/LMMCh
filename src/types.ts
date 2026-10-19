export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  timestamp: number;
  metrics?: {
    duration: number;
    tokensPerSecond: number;
    tokenCount: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

export interface BackendPreset {
  id: string;
  name: string;
  baseUrl: string;
  type: 'ollama' | 'openai';
  chatEndpoint: string;
  modelsEndpoint: string;
}

export interface Settings {
  backend: BackendPreset;
  customUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434',
    type: 'ollama',
    chatEndpoint: '/api/chat',
    modelsEndpoint: '/api/tags',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234',
    type: 'openai',
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
  },
  {
    id: 'vllm',
    name: 'vLLM',
    baseUrl: 'http://127.0.0.1:8000',
    type: 'openai',
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
  },
  {
    id: 'localai',
    name: 'LocalAI',
    baseUrl: 'http://127.0.0.1:8080',
    type: 'openai',
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    type: 'openai',
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
  },
];

export const SYSTEM_PROMPT_TEMPLATES = [
  { name: 'По умолчанию', prompt: 'You are a helpful assistant.' },
  { name: 'Программист', prompt: 'You are an expert software developer. Write clean, efficient code with comments. Explain your reasoning when asked.' },
  { name: 'Переводчик', prompt: 'You are a professional translator. Translate text between languages accurately while preserving context, tone, and nuance. Always specify the source and target languages.' },
  { name: 'Краткий ответ', prompt: 'You are a concise assistant. Answer questions briefly and directly. Avoid unnecessary explanations. Use bullet points when possible.' },
  { name: 'Креативный писатель', prompt: 'You are a creative writer with a flair for vivid descriptions and engaging narratives. Help with storytelling, poetry, and creative content.' },
];
