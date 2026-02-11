import React, { useState, useEffect } from 'react';
import { PlayerWithTotal, Suit, FinishType, PlayerStatus, GameRound, RoundPlayerStats, ThemeClasses, ThemeColor, LayoutClasses, LayoutMode, GamePhase } from '../types';
import { PlusIcon, TrophyIcon, SparklesIcon, ChatBubbleLeftRightIcon, PencilSquareIcon, Cog6ToothIcon, ArrowDownTrayIcon, XMarkIcon, SunIcon, MoonIcon } from './Icons';
import { generateGameCommentary } from '../services/geminiService';

interface ScoreTableProps {
  players: PlayerWithTotal[];
  rounds: GameRound[];
  onAddRound: (round: GameRound) => void;
  onUpdateRound: (round: GameRound) => void;
  onReset: () => void;
  onOpenChat: () => void;
  theme: ThemeClasses;
  themes: Record<ThemeColor, ThemeClasses>;
  onThemeChange: (color: ThemeColor) => void;
  onDownloadCSV: () => void;
  onDownloadPDF: () => void;
  layout: LayoutClasses;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  layouts: Record<LayoutMode, LayoutClasses>;
  gamePhase: GamePhase;
  finalistIds: string[];
  onStartFinal: () => void;
}

// Game Constants
const SUIT_MULTIPLIERS: Record<Suit, number> = {
  clubs: 2, spades: 3, diamonds: 4, hearts: 5
};
const SUIT_NAMES: Record<Suit, string> = {
  clubs: 'Sinek (♣)', spades: 'Maça (♠)', diamonds: 'Karo (♦)', hearts: 'Kupa (♥)'
};
const FINISH_MULTIPLIERS: Record<FinishType, number> = {
  normal: 1, okey: 2, double: 2, doubleOkey: 4, threwOkey: 1
};
const GOSTERME_POINTS: Record<Suit, { seri: number, doubleOkey: number }> = {
  clubs: { seri: 20, doubleOkey: 40 },
  spades: { seri: 30, doubleOkey: 60 },
  diamonds: { seri: 40, doubleOkey: 80 },
  hearts: { seri: 50, doubleOkey: 100 },
};

const MAX_ROUNDS = 11;

export const ScoreTable: React.FC<ScoreTableProps> = ({
  players,
  rounds,
  onAddRound,
  onUpdateRound,
  onReset,
  onOpenChat,
  theme,
  themes,
  onThemeChange,
  onDownloadCSV,
  onDownloadPDF,
  layout,
  layoutMode,
  onLayoutModeChange,
  layouts,
  gamePhase,
  finalistIds,
  onStartFinal,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Round Form State
  const [indicator, setIndicator] = useState<Suit | null>(null);
  const [finisherId, setFinisherId] = useState<string>('');
  const [finishType, setFinishType] = useState<FinishType>('normal');
  const [roundData, setRoundData] = useState<Record<string, RoundPlayerStats>>({});

  // Reset form when modal opens (new or edit)
  useEffect(() => {
    if (showAddModal) {
      if (editingRoundId) {
        // Load existing round data
        const roundToEdit = rounds.find(r => r.id === editingRoundId);
        if (roundToEdit) {
          setIndicator(roundToEdit.indicator);
          setFinisherId(roundToEdit.finisherId);
          setFinishType(roundToEdit.finishType);
          setRoundData(JSON.parse(JSON.stringify(roundToEdit.playerStats)));
        }
      } else {
        // Reset for new round
        const initialData: Record<string, RoundPlayerStats> = {};
        players.forEach(p => {
          initialData[p.id] = {
            handSum: '',
            status: 'normal',
            gostermeSeri: false,
            gostermeDoubleOkey: false,
          };
        });
        setRoundData(initialData);
        setFinisherId('');
        setFinishType('normal');
        setIndicator(null);
      }
    }
  }, [showAddModal, editingRoundId, players, rounds]);

  // Commentary logic
  useEffect(() => {
    if (rounds.length > 0 && !showAddModal) {
      generateGameCommentary(players).then(setCommentary);
    }
  }, [rounds.length, showAddModal, players]);

  // Reset confirmation state when settings modal closes
  useEffect(() => {
    if (!showSettingsModal) {
      setConfirmReset(false);
    }
  }, [showSettingsModal]);

  const isGameFinished = rounds.length >= MAX_ROUNDS && gamePhase === 'normal';
  const isFinalRound = (rounds.length === MAX_ROUNDS - 1) && gamePhase === 'normal';

  // Find min score to highlight leader(s)
  const minScore = Math.min(...players.map(p => p.total));

  // Filter players based on game phase
  const displayPlayers = gamePhase === 'final'
    ? players.filter(p => finalistIds.includes(p.id))
    : players;

  // --- Game Status Logic ---
  const winners = players.filter(p => p.total === minScore);
  const isTieForFirst = winners.length > 1;
  const currentRoundCount = rounds.length;

  // Helper Calculation for Display vs Total
  const calculateScoreDetails = (playerId: string, currentIndicator: Suit | null, currentData: RoundPlayerStats, finisher: string, fType: FinishType) => {
    if (!currentData || !currentIndicator) return { gross: 0, deduction: 0, net: 0 };

    const suitMult = SUIT_MULTIPLIERS[currentIndicator];
    const finishMult = FINISH_MULTIPLIERS[fType];

    // Calculate Deduction
    let deduction = 0;
    if (currentData.gostermeSeri) deduction += GOSTERME_POINTS[currentIndicator].seri;
    if (currentData.gostermeDoubleOkey) deduction += GOSTERME_POINTS[currentIndicator].doubleOkey;

    let gross = 0;

    if (playerId === finisher) {
      // Finisher Logic
      if (fType === 'threwOkey') {
        gross = 100 * suitMult; // Penalty
      } else if (fType === 'normal') {
        gross = -100;
      } else if (fType === 'doubleOkey') {
        gross = -100 * suitMult * 2;
      } else {
        gross = -100 * suitMult; // Okey or Double
      }
    } else {
      // Loser Logic
      if (fType === 'threwOkey') {
        gross = 0; // Game cancelled for others
      } else if (currentData.status === 'caught') {
        gross = 100 * suitMult * finishMult;
      } else {
        const handSum = parseInt(currentData.handSum) || 0;
        let handMult = 1;
        if (currentData.status === 'double') handMult = 2;
        gross = handSum * suitMult * finishMult * handMult;
      }
    }

    return { gross, deduction, net: gross - deduction };
  };

  const handleSaveRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finisherId || !indicator) return;

    const roundPayload: GameRound = {
      id: editingRoundId || crypto.randomUUID(),
      indicator,
      finisherId,
      finishType,
      playerStats: roundData,
      timestamp: Date.now()
    };

    if (editingRoundId) {
      onUpdateRound(roundPayload);
    } else {
      onAddRound(roundPayload);
    }
    setShowAddModal(false);
    setEditingRoundId(null);
  };

  const handleEditClick = (roundId: string) => {
    setEditingRoundId(roundId);
    setShowAddModal(true);
  };

  const handleAddClick = () => {
    if (isGameFinished) return;
    setEditingRoundId(null);
    setShowAddModal(true);
  };

  const updatePlayerRoundData = (id: string, updates: Partial<RoundPlayerStats>) => {
    setRoundData(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const isBonusTakenByOther = (currentPlayerId: string, type: 'gostermeSeri' | 'gostermeDoubleOkey') => {
    return Object.entries(roundData).some(([id, data]) => id !== currentPlayerId && data[type]);
  };

  const getSuitIcon = (suit: Suit) => {
    switch (suit) {
      case 'clubs': return '♣';
      case 'spades': return '♠';
      case 'diamonds': return '♦';
      case 'hearts': return '♥';
      default: return '';
    }
  };

  const getSuitColorClass = (suit: Suit) => {
    if (suit === 'hearts' || suit === 'diamonds') return 'text-red-500';
    return 'text-slate-200';
  };

  return (
    <div className={`flex flex-col h-screen max-h-screen ${layout.mainBg} overflow-hidden relative transition-colors duration-300`}>
      {/* Top Bar */}
      <div className={`${layout.containerBg} ${layout.borderColor} border-b p-4 flex items-center justify-between ${layout.shadow} z-10 shrink-0 transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <div className={`${theme.lightBg} p-2 rounded-lg`}>
            <TrophyIcon className={`w-6 h-6 ${theme.text}`} />
          </div>
          <div className="flex flex-col">
            <h2 className={`text-xl font-bold ${layout.textColor} tracking-tight leading-none`}>51 Skor</h2>
            <span className={`text-[10px] font-bold mt-1 ${isFinalRound ? 'text-red-500 animate-pulse' : layout.textMuted}`}>
              {gamePhase === 'final' ? 'FİNAL SERİSİ' : (isFinalRound ? 'FİNAL TURU' : isGameFinished ? 'OYUN BİTTİ' : `Tur: ${rounds.length} / ${MAX_ROUNDS}`)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenChat}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-lg transition-colors"
            title="AI Hakeme Danış"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`p-2.5 rounded-lg transition-colors ${theme.lightBg} hover:opacity-80 ${theme.text}`}
            title="Ayarlar"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Commentary Banner */}
      {commentary && (
        <div className={`bg-gradient-to-r ${theme.gradientFrom} ${layout.mainBg === 'bg-slate-900' ? 'to-slate-900' : 'to-white'} ${layout.borderColor} border-b px-4 py-2 flex items-center gap-2 ${layout.textSecondary} text-xs sm:text-sm animate-fade-in shrink-0`}>
          <SparklesIcon className={`w-4 h-4 ${theme.text} shrink-0`} />
          <p className="truncate">{commentary}</p>
        </div>
      )}

      {/* Scrollable Table Area */}
      <div className={`flex-1 overflow-auto ${layout.mainBg} p-2 sm:p-4 pb-24 transition-colors duration-300`}>
        <div className="min-w-full inline-block align-middle">
          <div className={`rounded-xl overflow-hidden ${layout.borderColor} border ${layout.shadow} ${layout.containerBg}`}>
            <table className={`min-w-full divide-y ${layout.borderColor}`}>
              <thead className={layout.tableHeaderBg}>
                <tr>
                  <th scope="col" className={`px-2 py-4 text-left text-xs font-semibold ${layout.textMuted} uppercase tracking-wider w-14 sticky left-0 ${layout.tableHeaderBg} z-10 border-r ${layout.borderColor}`}>
                    #
                  </th>
                  {displayPlayers.map(player => (
                    <th key={player.id} scope="col" className={`px-3 py-4 text-center text-sm font-bold ${layout.textColor} min-w-[90px]`}>
                      <div className="flex flex-col items-center">
                        <span className={player.total === minScore && rounds.length > 0 ? theme.text : ""}>{player.name}</span>
                        {player.total === minScore && rounds.length > 0 && <div className={`h-1 w-8 ${theme.bg} mt-1 rounded-full`}></div>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${layout.borderColor} ${layout.containerBg}`}>
                {rounds.map((round, idx) => (
                  <tr key={round.id} className={`${layout.tableRowHover} transition-colors group`}>
                    <td className={`px-2 py-2 text-sm ${layout.textSecondary} font-mono sticky left-0 ${layout.containerBg} border-r ${layout.borderColor} group-hover:${layout.containerBg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center w-full">
                          <span className="text-[10px] leading-tight opacity-60">
                            {idx === MAX_ROUNDS ? 'FİNAL' : idx + 1}
                          </span>
                          <span className={`text-xl leading-none ${getSuitColorClass(round.indicator)}`} title={SUIT_NAMES[round.indicator]}>
                            {getSuitIcon(round.indicator)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleEditClick(round.id)}
                          className={`${layout.textMuted} hover:${theme.text} opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 bottom-0 px-1 bg-inherit backdrop-blur-sm`}
                          title="Düzenle"
                        >
                          <PencilSquareIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    {players.map(player => {
                      const stats = round.playerStats[player.id];
                      if (!stats) return <td key={player.id} className="text-center">-</td>;
                      const isDoubleOkeyTaken = round.playerStats[player.id]?.gostermeDoubleOkey;
                      const isFinisher = round.finisherId === player.id;

                      // If we are in final phase, but this round is from normal phase, show checkmark/x logic for non-finalists? 
                      // Simplified: If player is NOT in displayPlayers (eliminated), don't render their column (handled by table structure)
                      // But rounds map iterates over all rounds. 
                      // Wait, if we filter columns, we must filter cells too.
                      if (!displayPlayers.find(p => p.id === player.id)) return null;

                      const { gross, deduction } = calculateScoreDetails(player.id, round.indicator, stats, round.finisherId, round.finishType);
                      let bonusSymbols = '';
                      const suitIcon = getSuitIcon(round.indicator).charAt(0); // Take only emoji
                      if (stats.gostermeSeri) bonusSymbols += suitIcon;
                      if (stats.gostermeDoubleOkey) bonusSymbols += suitIcon + suitIcon;

                      return (
                        <td key={`${player.id}-${round.id}`} className={`px-2 py-2 text-sm text-center ${layout.textSecondary} font-mono relative`}>
                          <div className="flex items-center justify-center gap-1">
                            {isFinisher ? (
                              round.finishType === 'normal' ? (
                                <span className={`${theme.text} font-bold`}>—</span>
                              ) : round.finishType === 'threwOkey' ? (
                                <span className="text-red-400 font-bold">{gross}</span>
                              ) : (
                                <div className={`w-7 h-7 rounded-full ${theme.badge} ring-1 ${theme.ring} font-bold flex items-center justify-center text-sm`}>
                                  {Math.abs(gross) / 100}
                                </div>
                              )
                            ) : (
                              <span className="">{gross}</span>
                            )}

                            {bonusSymbols && (
                              <span className={`text-xs leading-none tracking-tighter font-normal ${getSuitColorClass(round.indicator)}`} title="Gösterme">
                                {bonusSymbols}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className={`${layout.mainBg} border-t-2 ${layout.borderColor} sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]`}>
                  <td className={`px-2 py-4 text-xs font-bold ${theme.text} sticky left-0 ${layout.mainBg} border-r ${layout.borderColor}`}>
                    TOP
                  </td>
                  {displayPlayers.map(player => (
                    <td key={player.id} className="px-3 py-4 text-center">
                      <div className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-bold font-mono text-base sm:text-lg ${player.total === minScore && rounds.length > 0
                          ? `${theme.badge} ring-1 ${theme.ring} bg-opacity-20`
                          : layout.textColor
                        }`}>
                        {player.total}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-6 z-30">
        {!isGameFinished ? (
          <button
            onClick={handleAddClick}
            className={`group flex items-center justify-center w-14 h-14 ${theme.bg} ${theme.bgHover} text-white rounded-full shadow-lg shadow-black/40 hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-4 focus:${theme.ring} focus:ring-opacity-50 ${isFinalRound ? 'animate-bounce ring-4 ring-red-500/50' : ''}`}
            title={gamePhase === 'final' ? "Final Turu Ekle" : (isFinalRound ? "Final Turunu Başlat" : "Yeni Tur Ekle")}
          >
            <PlusIcon className="w-8 h-8" />
          </button>
        ) : (
          gamePhase === 'normal' ? (
            <button
              onClick={onStartFinal}
              className={`flex items-center justify-center w-16 h-16 ${theme.bg} text-white rounded-full shadow-lg shadow-black/40 animate-pulse hover:scale-110 transition-transform`}
              title="Final Serisini Başlat"
            >
              <TrophyIcon className="w-8 h-8" />
            </button>
          ) : (
            <div className={`flex items-center justify-center w-16 h-16 bg-yellow-500 text-white rounded-full shadow-lg shadow-yellow-500/40 animate-bounce`}>
              <TrophyIcon className="w-8 h-8" />
            </div>
          )
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm ${layout.containerBg} rounded-xl shadow-2xl border ${layout.borderColor} p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-bold ${layout.textColor} flex items-center gap-2`}>
                <Cog6ToothIcon className={`w-5 h-5 ${layout.textMuted}`} />
                Ayarlar
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className={`${layout.textMuted} hover:${layout.textColor}`}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Theme Selector */}
            <div className="mb-6">
              <label className={`block text-sm font-medium ${layout.textSecondary} mb-3`}>Renk Teması</label>
              <div className="flex gap-4 justify-center">
                {(Object.keys(themes) as ThemeColor[]).map((colorKey) => (
                  <button
                    key={colorKey}
                    onClick={() => onThemeChange(colorKey)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${theme.colorKey === colorKey ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      } ${themes[colorKey].bg}`}
                    title={themes[colorKey].name}
                  />
                ))}
              </div>
            </div>

            {/* Layout Mode Selector */}
            <div className="mb-6">
              <label className={`block text-sm font-medium ${layout.textSecondary} mb-3`}>Yerleşim Modu</label>
              <div className="flex gap-4 justify-center">
                {(Object.keys(layouts) as LayoutMode[]).map((modeKey) => (
                  <button
                    key={modeKey}
                    onClick={() => onLayoutModeChange(modeKey)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center text-xl ${layoutMode === modeKey ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      } ${layouts[modeKey].mainBg}`}
                    title={layouts[modeKey].name}
                  >
                    {modeKey === 'dark' ? '🌙' : '☀️'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onDownloadCSV}
                  className={`py-3 ${layout.inputBg} hover:${layout.tableHeaderBg} ${layout.textColor} rounded-lg flex flex-col items-center justify-center gap-1 font-medium transition-colors border ${layout.borderColor} text-xs sm:text-sm`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Excel/CSV
                </button>
                <button
                  onClick={onDownloadPDF}
                  className={`py-3 ${layout.inputBg} hover:${layout.tableHeaderBg} ${layout.textColor} rounded-lg flex flex-col items-center justify-center gap-1 font-medium transition-colors border ${layout.borderColor} text-xs sm:text-sm`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  PDF
                </button>
              </div>

              {confirmReset ? (
                <div className="flex gap-2 animate-in slide-in-from-right fade-in duration-200">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className={`flex-1 py-3 ${layout.inputBg} hover:${layout.tableHeaderBg} ${layout.textSecondary} rounded-lg font-medium transition-colors border ${layout.borderColor}`}
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      onReset();
                      setShowSettingsModal(false);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20"
                  >
                    Eminim, Sil
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg font-medium transition-colors border border-red-900/30"
                >
                  Oyunu Sıfırla
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Round Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg ${layout.containerBg} rounded-xl shadow-2xl border ${layout.borderColor} flex flex-col max-h-[95vh]`}>

            {/* Modal Header - Compact */}
            <div className={`p-3 border-b ${layout.borderColor} flex justify-between items-center ${layout.containerBg} rounded-t-xl z-10 shrink-0`}>
              <h3 className={`text-lg font-bold ${layout.textColor}`}>
                {editingRoundId ? 'Düzenle' : (gamePhase === 'final' ? 'FİNAL TURU' : (isFinalRound ? 'FİNAL TURU - NORMAL' : 'Yeni Tur'))}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] uppercase font-semibold hidden sm:inline ${!indicator ? `${theme.text} animate-pulse` : layout.textMuted}`}>
                  {indicator ? 'Yer:' : 'Seç ->'}
                </span>
                <div className="flex gap-1.5">
                  {(['clubs', 'spades', 'diamonds', 'hearts'] as Suit[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setIndicator(s)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all border ${indicator === s
                        ? `${theme.bg} text-white ${theme.border} scale-110 shadow-lg`
                        : `${layout.inputBg} ${layout.textMuted} border-transparent hover:opacity-80 hover:border-current`
                        }`}
                    >
                      {getSuitIcon(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto p-3 space-y-3 scrollbar-hide">

              {/* Round Result Selection - Compact */}
              <div className={`${layout.inputBg} p-2.5 rounded-lg border ${layout.borderColor} transition-opacity duration-300 ${!indicator ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={`block text-[10px] font-semibold ${layout.textMuted} uppercase mb-1`}>Bitiren</label>
                    <select
                      value={finisherId}
                      onChange={(e) => setFinisherId(e.target.value)}
                      disabled={!indicator}
                      className={`w-full ${layout.mainBg} border ${layout.textColor} text-sm rounded-md p-1.5 ${!finisherId ? `${theme.border} ring-1 ${theme.ring}` : layout.borderColor}`}
                    >
                      <option value="" disabled>Seçiniz...</option>
                      {displayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={`block text-[10px] font-semibold ${layout.textMuted} uppercase mb-1`}>Şekil</label>
                    <select
                      value={finishType}
                      onChange={(e) => setFinishType(e.target.value as FinishType)}
                      disabled={!indicator}
                      className={`w-full ${layout.mainBg} border ${layout.borderColor} ${layout.textColor} text-sm rounded-md p-1.5`}
                    >
                      <option value="normal">Normal (x1)</option>
                      <option value="okey">Okey (x2)</option>
                      <option value="double">Çift (x2)</option>
                      <option value="doubleOkey">Çift Okey (x4)</option>
                      <option value="threwOkey" className="text-red-400">Yere Okey (Ceza)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Players List - Very Compact */}
              <div className={`space-y-2 transition-opacity duration-300 ${!indicator ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {players.map(player => {
                  const isFinisher = player.id === finisherId;
                  const data = roundData[player.id];
                  if (!data) return null;

                  const isSeriTaken = isBonusTakenByOther(player.id, 'gostermeSeri');
                  const isDoubleOkeyTaken = isBonusTakenByOther(player.id, 'gostermeDoubleOkey');

                  const { gross, deduction } = calculateScoreDetails(player.id, indicator, data, finisherId, finishType);

                  return (
                    <div key={player.id} className={`p-2.5 rounded-lg border transition-all ${isFinisher ? `bg-opacity-10 ${theme.lightBg} ${theme.border}` : `${layout.mainBg} ${layout.borderColor}`}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate max-w-[100px] ${isFinisher ? theme.text : layout.textSecondary}`}>
                            {player.name}
                          </span>
                          {isFinisher && (
                            finishType === 'threwOkey'
                              ? <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded font-bold">CEZA</span>
                              : <span className={`text-[10px] ${theme.bg} text-black px-1.5 py-0.5 rounded font-bold`}>BİTTİ</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {deduction > 0 && (
                            <span className={`text-[10px] bg-slate-500/20 text-slate-500 px-1 py-0.5 rounded`}>
                              -{deduction} Bonus
                            </span>
                          )}
                          <span className={`text-lg font-mono font-bold ${layout.textColor} min-w-[3ch] text-right`}>
                            {indicator ? (isFinisher && finishType !== 'threwOkey' ? '—' : gross) : 0}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Inputs Column */}
                        <div className="space-y-1.5">
                          {!isFinisher ? (
                            <>
                              <div className={`flex ${layout.tableHeaderBg} p-0.5 rounded-md`}>
                                {(['normal', 'double', 'caught'] as PlayerStatus[]).map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={!indicator || finishType === 'threwOkey'}
                                    onClick={() => updatePlayerRoundData(player.id, { status })}
                                    className={`flex-1 py-1 text-[9px] font-medium rounded transition-colors ${data.status === status
                                      ? 'bg-white shadow-sm text-slate-900'
                                      : `${layout.textMuted} hover:${layout.textSecondary}`
                                      } ${finishType === 'threwOkey' ? 'opacity-30' : ''}`}
                                  >
                                    {status === 'normal' && 'Norm'}
                                    {status === 'double' && 'Çift'}
                                    {status === 'caught' && 'Yaka'}
                                  </button>
                                ))}
                              </div>
                              {data.status !== 'caught' && (
                                <input
                                  type="number"
                                  placeholder={finishType === 'threwOkey' ? "İptal" : "El Sayısı"}
                                  value={data.handSum}
                                  disabled={!indicator || finishType === 'threwOkey'}
                                  onChange={(e) => updatePlayerRoundData(player.id, { handSum: e.target.value })}
                                  className={`w-full ${layout.inputBg} ${layout.textColor} text-sm px-2 py-1 rounded border ${layout.inputBorder} focus:${theme.border} outline-none font-mono placeholder:${layout.textMuted} disabled:opacity-30 disabled:cursor-not-allowed`}
                                />
                              )}
                            </>
                          ) : (
                            <div className={`text-[10px] text-slate-500 italic flex items-center h-full ${finishType === 'threwOkey' ? 'text-red-400 not-italic' : ''}`}>
                              {finishType === 'threwOkey' ? 'Hatalı hamle cezası.' : 'Kazanan ödül puanı alır.'}
                            </div>
                          )}
                        </div>

                        {/* Bonus Column */}
                        <div className="flex gap-1.5">
                          <label className={`flex-1 select-none border rounded-md p-1 flex flex-col items-center justify-center transition-all cursor-pointer ${isSeriTaken
                            ? `opacity-40 cursor-not-allowed ${layout.borderColor} ${layout.tableHeaderBg}`
                            : data.gostermeSeri
                              ? `bg-opacity-20 ${theme.lightBg} ${theme.border} ${theme.text}`
                              : `${layout.borderColor} ${layout.textSecondary} hover:${layout.textColor}`
                            } ${!indicator ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={data.gostermeSeri}
                              disabled={isSeriTaken || !indicator}
                              onChange={(e) => updatePlayerRoundData(player.id, { gostermeSeri: e.target.checked })}
                            />
                            <span className="text-[10px] font-bold">Seri</span>
                          </label>

                          <label className={`flex-1 select-none border rounded-md p-1 flex flex-col items-center justify-center transition-all cursor-pointer ${isDoubleOkeyTaken
                            ? `opacity-40 cursor-not-allowed ${layout.borderColor} ${layout.tableHeaderBg}`
                            : data.gostermeDoubleOkey
                              ? `bg-opacity-20 ${theme.lightBg} ${theme.border} ${theme.text}`
                              : `${layout.borderColor} ${layout.textSecondary} hover:${layout.textColor}`
                            } ${!indicator ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={data.gostermeDoubleOkey}
                              disabled={isDoubleOkeyTaken || !indicator}
                              onChange={(e) => updatePlayerRoundData(player.id, { gostermeDoubleOkey: e.target.checked })}
                            />
                            <span className="text-[10px] font-bold">Çift</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t ${layout.borderColor} ${layout.containerBg} rounded-b-xl flex gap-2 shrink-0`}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRoundId(null);
                }}
                className={`flex-1 py-2.5 ${layout.inputBg} hover:${layout.tableHeaderBg} ${layout.textSecondary} text-sm rounded-lg font-medium transition-colors`}
              >
                İptal
              </button>
              <button
                onClick={handleSaveRound}
                disabled={!finisherId || !indicator}
                className={`flex-1 py-2.5 ${theme.bg} ${theme.bgHover} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-bold shadow-lg shadow-black/20 transition-colors`}
              >
                {editingRoundId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};