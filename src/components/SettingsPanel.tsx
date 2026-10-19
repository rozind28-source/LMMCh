import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  X,
  FileDown,
  FileUp,
  RotateCcw,
} from 'lucide-react';
import { Settings, BACKEND_PRESETS, SYSTEM_PROMPT_TEMPLATES, Conversation } from '../types';
import { checkConnection, fetchModels } from '../utils/api';
import { exportConversations, importConversations } from '../utils/storage';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  conversations: Conversation[];
  onImport: (conversations: Conversation[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  conversations,
  onImport,
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'online' | 'error'>('idle');
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (settings.model && !models.includes(settings.model)) {
      setModels((prev) => [...prev, settings.model]);
    }
  }, []);

  const handleCheckConnection = async () => {
    setConnectionStatus('checking');
    setError('');
    try {
      const result = await checkConnection(settings);
      setConnectionStatus('online');
      setModels(result.models);
      if (result.models.length > 0 && !settings.model) {
        onSettingsChange({ ...settings, model: result.models[0] });
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError(err.message || 'Connection failed');
    }
  };

  const handleBackendChange = (presetId: string) => {
    const preset = BACKEND_PRESETS.find((p) => p.id === presetId)!;
    onSettingsChange({
      ...settings,
      backend: preset,
      model: '',
    });
    setConnectionStatus('idle');
    setModels([]);
  };

  const handleExport = () => {
    exportConversations(conversations);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importConversations(file);
      onImport(imported);
    } catch (err: any) {
      setError('Ошибка импорта: ' + err.message);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon size={20} />
            Настройки
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Backend selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Бэкенд</label>
            <div className="relative">
              <select
                value={settings.backend.id}
                onChange={(e) => handleBackendChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {BACKEND_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* URL */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">URL сервера</label>
            {settings.backend.id === 'custom' ? (
              <input
                type="text"
                value={settings.customUrl}
                onChange={(e) => onSettingsChange({ ...settings, customUrl: e.target.value })}
                placeholder="http://localhost:8080"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <input
                type="text"
                value={settings.backend.baseUrl}
                disabled
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-400 cursor-not-allowed"
              />
            )}
          </div>

          {/* API Key */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">API ключ (опционально)</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => onSettingsChange({ ...settings, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Connection check */}
          <div className="space-y-3">
            <button
              onClick={handleCheckConnection}
              disabled={connectionStatus === 'checking'}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {connectionStatus === 'checking' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : connectionStatus === 'online' ? (
                <Wifi size={16} className="text-green-400" />
              ) : connectionStatus === 'error' ? (
                <WifiOff size={16} className="text-red-400" />
              ) : (
                <Wifi size={16} />
              )}
              Проверить подключение
            </button>

            {connectionStatus === 'online' && (
              <p className="text-sm text-green-400">✓ Сервер доступен. Моделей: {models.length}</p>
            )}
            {connectionStatus === 'error' && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3 whitespace-pre-wrap">
                {error}
              </div>
            )}
          </div>

          {/* Model selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Модель</label>
            {models.length > 0 ? (
              <div className="relative">
                <select
                  value={settings.model}
                  onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  <option value="">Выберите модель</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={settings.model}
                onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })}
                placeholder="Введите имя модели вручную"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          {/* Generation parameters */}
          <div className="space-y-4 pt-2 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Параметры генерации</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Temperature</span>
                <span className="text-white font-mono">{settings.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Top-P</span>
                <span className="text-white font-mono">{settings.topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.topP}
                onChange={(e) => onSettingsChange({ ...settings, topP: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Max Tokens</span>
                <span className="text-white font-mono">{settings.maxTokens}</span>
              </div>
              <input
                type="range"
                min="64"
                max="8192"
                step="64"
                value={settings.maxTokens}
                onChange={(e) => onSettingsChange({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* System prompt */}
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Системный промпт</label>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showTemplates ? 'Скрыть шаблоны' : 'Шаблоны'}
              </button>
            </div>

            {showTemplates && (
              <div className="flex flex-wrap gap-2 mb-2">
                {SYSTEM_PROMPT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => {
                      onSettingsChange({ ...settings, systemPrompt: template.prompt });
                      setShowTemplates(false);
                    }}
                    className="text-xs px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={settings.systemPrompt}
              onChange={(e) => onSettingsChange({ ...settings, systemPrompt: e.target.value })}
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y text-sm font-mono"
            />
          </div>

          {/* Import/Export */}
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Данные</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <FileDown size={14} />
                Экспорт
              </button>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer">
                <FileUp size={14} />
                Импорт
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
