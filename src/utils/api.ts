import { Settings, BACKEND_PRESETS } from '../types';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function getBaseUrl(settings: Settings): string {
  if (settings.backend.id === 'custom') {
    return settings.customUrl.replace(/\/$/, '');
  }
  return settings.backend.baseUrl;
}

export function getChatUrl(settings: Settings): string {
  return getBaseUrl(settings) + settings.backend.chatEndpoint;
}

export function getModelsUrl(settings: Settings): string {
  return getBaseUrl(settings) + settings.backend.modelsEndpoint;
}

export async function fetchModels(settings: Settings): Promise<string[]> {
  const url = getModelsUrl(settings);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (settings.backend.type === 'ollama') {
    return (data.models || []).map((m: any) => m.name);
  } else {
    return (data.data || []).map((m: any) => m.id);
  }
}

export async function checkConnection(settings: Settings): Promise<{ ok: boolean; models: string[] }> {
  const models = await fetchModels(settings);
  return { ok: true, models };
}

export async function streamChat(
  settings: Settings,
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  abortSignal: AbortSignal
): Promise<void> {
  const url = getChatUrl(settings);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  let body: any;

  if (settings.backend.type === 'ollama') {
    body = {
      model: settings.model,
      messages,
      stream: true,
      options: {
        temperature: settings.temperature,
        top_p: settings.topP,
        num_predict: settings.maxTokens,
      },
    };
  } else {
    body = {
      model: settings.model,
      messages,
      stream: true,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxTokens,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let inThinking = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      if (settings.backend.type === 'ollama') {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const content = json.message?.content || '';
            if (content) {
              // Check for thinking tags
              const thinkOpen = content.includes('<think>');
              const thinkClose = content.includes('</think>');

              if (thinkOpen && !inThinking) {
                inThinking = true;
                const beforeThink = content.split('<think>')[0];
                const afterOpen = content.split('<think>')[1] || '';
                if (beforeThink) callbacks.onToken(beforeThink);
                if (afterOpen && !thinkClose) {
                  callbacks.onThinking(afterOpen);
                } else if (thinkClose) {
                  const thinkContent = afterOpen.split('</think>')[0] || '';
                  callbacks.onThinking(thinkContent);
                  inThinking = false;
                  const afterClose = content.split('</think>')[1] || '';
                  if (afterClose) callbacks.onToken(afterClose);
                }
              } else if (inThinking && thinkClose) {
                const beforeClose = content.split('</think>')[0] || '';
                callbacks.onThinking(beforeClose);
                inThinking = false;
                const afterClose = content.split('</think>')[1] || '';
                if (afterClose) callbacks.onToken(afterClose);
              } else if (inThinking) {
                callbacks.onThinking(content);
              } else {
                callbacks.onToken(content);
              }
            }
            if (json.done) {
              callbacks.onDone();
              return;
            }
          } catch {
            // skip invalid JSON lines
          }
        }
      } else {
        // OpenAI-compatible SSE format
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              callbacks.onDone();
              return;
            }
            continue;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                const thinkOpen = content.includes('<think>');
                const thinkClose = content.includes('</think>');

                if (thinkOpen && !inThinking) {
                  inThinking = true;
                  const beforeThink = content.split('<think>')[0];
                  const afterOpen = content.split('<think>')[1] || '';
                  if (beforeThink) callbacks.onToken(beforeThink);
                  if (afterOpen && !thinkClose) {
                    callbacks.onThinking(afterOpen);
                  } else if (thinkClose) {
                    const thinkContent = afterOpen.split('</think>')[0] || '';
                    callbacks.onThinking(thinkContent);
                    inThinking = false;
                    const afterClose = content.split('</think>')[1] || '';
                    if (afterClose) callbacks.onToken(afterClose);
                  }
                } else if (inThinking && thinkClose) {
                  const beforeClose = content.split('</think>')[0] || '';
                  callbacks.onThinking(beforeClose);
                  inThinking = false;
                  const afterClose = content.split('</think>')[1] || '';
                  if (afterClose) callbacks.onToken(afterClose);
                } else if (inThinking) {
                  callbacks.onThinking(content);
                } else {
                  callbacks.onToken(content);
                }
              }
              if (json.choices?.[0]?.finish_reason) {
                callbacks.onDone();
                return;
              }
            } catch {
              // skip
            }
          }
        }
      }
    }
    callbacks.onDone();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      callbacks.onDone();
      return;
    }
    
    let errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      errorMessage = getCorsHint(settings);
    }
    
    callbacks.onError(errorMessage);
  }
}

function getCorsHint(settings: Settings): string {
  const baseUrl = getBaseUrl(settings);
  
  if (baseUrl.includes('11434')) {
    return `Не удалось подключиться к Ollama. Возможные причины:\n\n1. Ollama не запущен. Запустите: ollama serve\n2. CORS ошибка. Запустите с переменной окружения:\n   • Linux/Mac: OLLAMA_ORIGINS="*" ollama serve\n   • Windows: set OLLAMA_ORIGINS=* && ollama serve\n3. Сервер недоступен по адресу ${baseUrl}`;
  }
  
  if (baseUrl.includes('1234')) {
    return `Не удалось подключиться к LM Studio. Возможные причины:\n\n1. LM Studio не запущен или сервер не активирован\n2. В настройках LM Studio включите CORS (Enable CORS)\n3. Убедитесь что сервер слушает порт 1234\n4. Сервер недоступен по адресу ${baseUrl}`;
  }
  
  return `Не удалось подключиться к серверу. Возможные причины:\n\n1. Сервер не запущен\n2. CORS не настроен на сервере\n3. Неправильный URL: ${baseUrl}\n4. Mixed Content (HTTPS страница → HTTP сервер)`;
}
