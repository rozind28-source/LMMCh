import { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2, Menu, Bot } from 'lucide-react';
import { Message, Conversation, Settings } from '../types';
import { streamChat } from '../utils/api';
import MessageComponent from './Message';

interface ChatAreaProps {
  conversation: Conversation | null;
  settings: Settings;
  onMessagesUpdate: (messages: Message[]) => void;
  onToggleSidebar: () => void;
}

export default function ChatArea({ conversation, settings, onMessagesUpdate, onToggleSidebar }: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    if (!settings.model) {
      alert('Выберите модель в настройках');
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const messages = [...(conversation?.messages || []), userMessage];
    onMessagesUpdate(messages);
    setInput('');
    setIsGenerating(true);
    setStreamingContent('');
    setStreamingThinking('');

    const startTime = Date.now();
    let tokenCount = 0;
    let thinkingText = '';
    let contentText = '';

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Prepare messages for API (with system prompt)
    const apiMessages: { role: string; content: string }[] = [];
    if (settings.systemPrompt) {
      apiMessages.push({ role: 'system', content: settings.systemPrompt });
    }
    messages.forEach((m) => {
      apiMessages.push({ role: m.role, content: m.content });
    });

    await streamChat(
      settings,
      apiMessages,
      {
        onToken: (token) => {
          contentText += token;
          tokenCount++;
          setStreamingContent(contentText);
        },
        onThinking: (token) => {
          thinkingText += token;
          tokenCount++;
          setStreamingThinking(thinkingText);
        },
        onDone: () => {
          const duration = (Date.now() - startTime) / 1000;
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: contentText,
            thinking: thinkingText || undefined,
            timestamp: Date.now(),
            metrics: {
              duration,
              tokensPerSecond: duration > 0 ? tokenCount / duration : 0,
              tokenCount,
            },
          };
          onMessagesUpdate([...messages, assistantMessage]);
          setIsGenerating(false);
          setStreamingContent('');
          setStreamingThinking('');
        },
        onError: (error) => {
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Ошибка: ${error}`,
            timestamp: Date.now(),
          };
          onMessagesUpdate([...messages, errorMessage]);
          setIsGenerating(false);
          setStreamingContent('');
          setStreamingThinking('');
        },
      },
      abortController.signal
    );
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="text-6xl">🤖</div>
          <h2 className="text-2xl font-bold text-white">AI Chat Client</h2>
          <p className="text-slate-400 max-w-md">
            Выберите диалог или создайте новый, чтобы начать общение с локальным ИИ
          </p>
          <button
            onClick={onToggleSidebar}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors lg:hidden"
          >
            <Menu size={16} />
            Открыть панель
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <button
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-white transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-white truncate">{conversation.title}</h2>
          <p className="text-xs text-slate-500">
            {settings.model || 'Модель не выбрана'} • {settings.backend.name}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {conversation.messages.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Bot size={48} className="mx-auto text-slate-600" />
              <p className="text-slate-500">Начните диалог, отправив сообщение</p>
            </div>
          )}

          {conversation.messages.map((msg) => (
            <MessageComponent key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
          {isGenerating && (streamingContent || streamingThinking) && (
            <MessageComponent
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent,
                thinking: streamingThinking || undefined,
                timestamp: Date.now(),
              }}
            />
          )}

          {/* Loading indicator */}
          {isGenerating && !streamingContent && !streamingThinking && (
            <div className="flex justify-start mb-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Генерация...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 bg-slate-900/50 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={settings.model ? "Введите сообщение... (Shift+Enter для переноса)" : "Сначала выберите модель в настройках"}
                disabled={isGenerating}
                rows={1}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none text-sm"
              />
            </div>

            {isGenerating ? (
              <button
                onClick={handleStop}
                className="flex items-center justify-center w-11 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex-shrink-0"
                title="Остановить генерацию"
              >
                <Square size={18} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !settings.model}
                className="flex items-center justify-center w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
                title="Отправить"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
