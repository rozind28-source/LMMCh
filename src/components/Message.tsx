import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight, Brain, Clock, Gauge } from 'lucide-react';
import { Message } from '../types';
import CodeBlock from './CodeBlock';

interface MessageComponentProps {
  message: Message;
}

export default function MessageComponent({ message }: MessageComponentProps) {
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        {/* Thinking block */}
        {message.thinking && (
          <div className="mb-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors mb-1"
            >
              <Brain size={14} />
              <span>Рассуждения модели</span>
              {showThinking ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {showThinking && (
              <div className="border-l-2 border-purple-500/50 pl-3 py-2 text-sm text-slate-400 italic bg-purple-950/20 rounded-r-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.thinking}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-blue-400 prose-strong:text-slate-100 prose-code:text-emerald-400 prose-code:bg-slate-900/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-slate-600 prose-blockquote:text-slate-400 prose-li:text-slate-300 prose-table:text-slate-300 prose-th:text-slate-200 prose-td:text-slate-300">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (match) {
                      return <CodeBlock language={match[1]} code={codeString} />;
                    }
                    
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metrics */}
        {message.metrics && !isUser && (
          <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {message.metrics.duration.toFixed(1)}s
            </span>
            <span className="flex items-center gap-1">
              <Gauge size={11} />
              {message.metrics.tokensPerSecond.toFixed(1)} tok/s
            </span>
            <span>{message.metrics.tokenCount} tokens</span>
          </div>
        )}
      </div>
    </div>
  );
}
