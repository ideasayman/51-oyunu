import React, { useState } from 'react';
import { PlusIcon, UserIcon, XMarkIcon } from './Icons';
import { ThemeClasses, LayoutClasses } from '../types';

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
  theme: ThemeClasses;
  layout: LayoutClasses;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame, theme, layout }) => {
  const [names, setNames] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
    setError(null);
  };

  const addPlayer = () => {
    if (names.length < 4) {
      setNames([...names, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (names.length > 2) {
      const newNames = names.filter((_, i) => i !== index);
      setNames(newNames);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const validNames = names.map(n => n.trim()).filter(n => n !== '');

    if (validNames.length < 2) {
      setError("En az 2 oyuncu gerekli.");
      return;
    }

    // Check duplicates
    if (new Set(validNames).size !== validNames.length) {
      setError("İsimler farklı olmalı.");
      return;
    }

    onStartGame(validNames);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] px-4 transition-colors duration-300`}>
      <div className={`w-full max-w-md ${layout.containerBg} p-8 rounded-2xl ${layout.shadow} border ${layout.borderColor}`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${theme.text}`}>51 Skor Tablosu</h1>
          <p className={layout.textMuted}>Oyuncuları ekleyin (2-4 Kişi)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {names.map((name, index) => (
            <div key={index} className="relative flex items-center group">
              <div className="absolute left-3 text-slate-500">
                <UserIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={`Oyuncu ${index + 1}`}
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className={`w-full ${layout.inputBg} ${layout.textColor} pl-10 pr-10 py-3 rounded-lg border ${layout.borderColor} focus:${theme.border} focus:ring-1 focus:${theme.ring} outline-none transition-all placeholder:${layout.textMuted}`}
                autoFocus={index === 0}
              />
              {names.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="absolute right-2 text-slate-500 hover:text-red-400 p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          {names.length < 4 && (
            <button
              type="button"
              onClick={addPlayer}
              className={`w-full py-3 border-2 border-dashed ${layout.borderColor} ${layout.textMuted} rounded-lg hover:${theme.border} hover:${theme.text} transition-colors flex items-center justify-center gap-2`}
            >
              <PlusIcon className="w-5 h-5" />
              <span>Oyuncu Ekle</span>
            </button>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className={`w-full ${theme.bg} ${theme.bgHover} text-white font-bold py-4 rounded-lg shadow-lg shadow-black/20 transform transition active:scale-[0.98] mt-6 touch-manipulation`}
          >
            Oyunu Başlat
          </button>
        </form>
      </div>
    </div>
  );
};