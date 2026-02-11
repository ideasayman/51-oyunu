import React, { useState, useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { createGameChat } from '../services/geminiService';
import { PlayerWithTotal, ChatMessage, ThemeClasses, LayoutClasses } from '../types';
import { ChatBubbleLeftRightIcon, XMarkIcon } from './Icons';
import { GenerateContentResponse } from '@google/genai';

interface GameAssistantProps {
  players: PlayerWithTotal[];
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeClasses;
  layout: LayoutClasses;
}

export const GameAssistant: React.FC<GameAssistantProps> = ({ players, isOpen, onClose, theme, layout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !chatSessionRef.current) {
      chatSessionRef.current = createGameChat(players);
      // Initial greeting
      setMessages([{
        role: 'model',
        text: 'Selam! Ben 51 hakemiyim. Skorlar, kurallar veya strateji hakkında bana sorabilirsin.'
      }]);
    }
  }, [isOpen, players]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const contextPrefix = `[Current Scores: ${players.map(p => `${p.name}: ${p.total}`).join(', ')}] `;

      const responseStream = await chatSessionRef.current.sendMessageStream({ message: contextPrefix + userMsg });

      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', text: "" }]);

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].text = fullResponse;
            return newMsgs;
          });
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Bir hata oluştu. Lütfen tekrar deneyin.', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg ${layout.containerBg} ${layout.shadow} rounded-2xl border ${layout.borderColor} flex flex-col h-[600px] max-h-[90vh] animate-in fade-in zoom-in duration-200`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${layout.borderColor}`}>
          <div className={`flex items-center gap-2 ${theme.text}`}>
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
            <h3 className="font-bold text-lg">AI Hakem</h3>
          </div>
          <button onClick={onClose} className={`${layout.textMuted} hover:${layout.textColor} transition-colors`}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                    ? `${theme.bg} text-white rounded-br-none`
                    : `${layout.inputBg} ${layout.textColor} rounded-bl-none border ${layout.borderColor}`
                  } ${msg.isError ? 'bg-red-900/50 text-red-200 border-red-900' : ''}`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`${layout.inputBg} ${layout.textMuted} p-3 rounded-2xl rounded-bl-none text-xs border ${layout.borderColor} flex gap-1`}>
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t ${layout.borderColor} ${layout.inputBg} rounded-b-2xl`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Bir soru sor..."
              className={`flex-1 ${layout.mainBg} ${layout.textColor} px-4 py-3 rounded-xl border ${layout.borderColor} focus:${theme.border} focus:outline-none placeholder:${layout.textMuted}`}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={`${theme.bg} ${theme.bgHover} disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium transition-colors`}
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};