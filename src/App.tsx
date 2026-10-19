import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Settings } from './types';
import {
  getConversations,
  saveConversations,
  getSettings,
  saveSettings,
  getActiveConversationId,
  setActiveConversationId,
} from './utils/storage';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsPanel from './components/SettingsPanel';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    const convs = getConversations();
    setConversations(convs);
    const savedActiveId = getActiveConversationId();
    if (savedActiveId && convs.find((c) => c.id === savedActiveId)) {
      setActiveId(savedActiveId);
    }
  }, []);

  // Save conversations when they change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: settings.model,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setActiveConversationId(newConv.id);
  }, [settings.model]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameConversation = (id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  };

  const handleMessagesUpdate = (messages: Message[]) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        
        // Auto-title from first message
        let title = c.title;
        if (c.messages.length === 0 && messages.length > 0 && messages[0].role === 'user') {
          title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '');
        }
        
        return {
          ...c,
          messages,
          title,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleImport = (imported: Conversation[]) => {
    setConversations((prev) => [...imported, ...prev]);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block absolute lg:relative z-40 h-full`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNew={createNewConversation}
          onDelete={handleDeleteConversation}
          onRename={handleRenameConversation}
          onOpenSettings={() => setShowSettings(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat area */}
      <ChatArea
        conversation={activeConversation}
        settings={settings}
        onMessagesUpdate={handleMessagesUpdate}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Settings modal */}
      <SettingsPanel
        settings={settings}
        onSettingsChange={setSettings}
        conversations={conversations}
        onImport={handleImport}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
