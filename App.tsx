import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Player, GameView, GameRound, PlayerWithTotal, Suit, FinishType, ThemeColor, ThemeClasses, LayoutMode, LayoutClasses, GamePhase } from './types';
import { PlayerSetup } from './components/PlayerSetup';
import { ScoreTable } from './components/ScoreTable';
import { GameAssistant } from './components/GameAssistant';

const STORAGE_KEY = '51_game_state_v2';

// Theme Configurations
const THEMES: Record<ThemeColor, ThemeClasses> = {
  emerald: {
    name: 'Zümrüt',
    colorKey: 'emerald',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500',
    lightBg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/20 text-emerald-400',
    gradientFrom: 'from-emerald-900/40',
  },
  indigo: {
    name: 'Safir',
    colorKey: 'indigo',
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-500',
    text: 'text-indigo-400',
    border: 'border-indigo-500',
    ring: 'ring-indigo-500',
    lightBg: 'bg-indigo-500/10',
    badge: 'bg-indigo-500/20 text-indigo-400',
    gradientFrom: 'from-indigo-900/40',
  },
  rose: {
    name: 'Yakut',
    colorKey: 'rose',
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500',
    ring: 'ring-rose-500',
    lightBg: 'bg-rose-500/10',
    badge: 'bg-rose-500/20 text-rose-400',
    gradientFrom: 'from-rose-900/40',
  },
  amber: {
    name: 'Kehribar',
    colorKey: 'amber',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    lightBg: 'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-400',
    gradientFrom: 'from-amber-900/40',
  }
};

const LAYOUT_THEMES: Record<LayoutMode, LayoutClasses> = {
  light: {
    name: 'Aydınlık',
    mainBg: 'bg-slate-50',
    containerBg: 'bg-white',
    textColor: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    borderColor: 'border-slate-200',
    inputBg: 'bg-white',
    inputBorder: 'border-slate-300',
    tableHeaderBg: 'bg-slate-100',
    tableRowHover: 'hover:bg-slate-50',
    tableStripe: 'bg-slate-50/50',
    shadow: 'shadow-xl shadow-slate-200/50'
  },
  dark: {
    name: 'Karanlık',
    mainBg: 'bg-slate-900',
    containerBg: 'bg-slate-800',
    textColor: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    borderColor: 'border-slate-700',
    inputBg: 'bg-slate-900',
    inputBorder: 'border-slate-600',
    tableHeaderBg: 'bg-slate-800',
    tableRowHover: 'hover:bg-slate-700/30',
    tableStripe: 'bg-slate-800/50',
    shadow: 'shadow-xl shadow-black/40'
  }
};

const SUIT_NAMES_TR: Record<Suit, string> = {
  clubs: 'Sinek', spades: 'Maça', diamonds: 'Karo', hearts: 'Kupa'
};

const FINISH_NAMES_TR: Record<FinishType, string> = {
  normal: 'Normal', okey: 'Okey', double: 'Çift', doubleOkey: 'Çift Okey', threwOkey: 'Yere Okey (Ceza)'
};

const App: React.FC = () => {
  const [view, setView] = useState<GameView>(GameView.SETUP);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('emerald');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('light');
  const [gamePhase, setGamePhase] = useState<GamePhase>('normal');
  const [finalistIds, setFinalistIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.length > 0) {
          setPlayers(parsed.players);
          setRounds(parsed.rounds || []);
          if (parsed.themeColor && THEMES[parsed.themeColor as ThemeColor]) {
            setThemeColor(parsed.themeColor);
          }
          if (parsed.layoutMode && LAYOUT_THEMES[parsed.layoutMode as LayoutMode]) {
            setLayoutMode(parsed.layoutMode);
          }
          setGamePhase(parsed.gamePhase || 'normal');
          setFinalistIds(parsed.finalistIds || []);
          setView(GameView.SCOREBOARD);
        } else if (parsed.themeColor) {
          if (THEMES[parsed.themeColor as ThemeColor]) {
            setThemeColor(parsed.themeColor);
          }
          if (parsed.layoutMode && LAYOUT_THEMES[parsed.layoutMode as LayoutMode]) {
            setLayoutMode(parsed.layoutMode);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load game state", e);
      // If error, clear storage to prevent persistent crash
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Ensure valid theme and layout even if state is corrupted
  const activeTheme = THEMES[themeColor] || THEMES['emerald'];
  const activeLayout = LAYOUT_THEMES[layoutMode] || LAYOUT_THEMES['light'];

  // Save to local storage on change
  useEffect(() => {
    if (!isLoaded) return;

    const stateToSave = {
      players,
      rounds,
      themeColor,
      layoutMode,
      gamePhase,
      finalistIds
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [players, rounds, themeColor, layoutMode, gamePhase, finalistIds, isLoaded]);

  const calculateNetScore = (round: GameRound, playerId: string): number => {
    const data = round.playerStats[playerId];
    if (!data) return 0;

    const SUIT_MULTIPLIERS: Record<Suit, number> = {
      clubs: 2, spades: 3, diamonds: 4, hearts: 5
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

    const suitMult = SUIT_MULTIPLIERS[round.indicator];
    const finishMult = FINISH_MULTIPLIERS[round.finishType];

    // Calculate Deduction (Kazanç)
    let deduction = 0;
    if (data.gostermeSeri) deduction += GOSTERME_POINTS[round.indicator].seri;
    if (data.gostermeDoubleOkey) deduction += GOSTERME_POINTS[round.indicator].doubleOkey;

    // If Finisher
    if (playerId === round.finisherId) {
      let baseReward = 0;
      if (round.finishType === 'threwOkey') {
        // Penalty for throwing Okey on ground: 100 * Suit Multiplier (Positive Score)
        baseReward = 100 * suitMult;
      } else if (round.finishType === 'normal') {
        baseReward = -100;
      } else if (round.finishType === 'okey' || round.finishType === 'double') {
        baseReward = -100 * suitMult;
      } else if (round.finishType === 'doubleOkey') {
        baseReward = -100 * suitMult * 2;
      }
      return baseReward - deduction;
    }

    // If Loser
    let baseScore = 0;
    if (round.finishType === 'threwOkey') {
      // If someone threw okey, game ends, others get 0 penalty (hand not counted)
      baseScore = 0;
    } else if (data.status === 'caught') {
      baseScore = 100 * suitMult * finishMult;
    } else {
      const handSum = parseInt(data.handSum) || 0;
      let handMult = 1;
      if (data.status === 'double') handMult = 2;
      baseScore = handSum * suitMult * finishMult * handMult;
    }

    return baseScore - deduction;
  };

  const playersWithTotal: PlayerWithTotal[] = useMemo(() => {
    return players.map(p => {
      let total = 0;
      rounds.forEach(r => {
        // If we are in final phase, calculate score if player is finalist OR if round was before final phase
        // Actually, just sum all rounds. Non-finalists won't have entries in new rounds or will have 0/empty.
        // We will handle data integrity in adding round.
        total += calculateNetScore(r, p.id);
      });
      return { ...p, total };
    });
  }, [players, rounds]);

  const startFinalSeries = () => {
    // Determine finalists (Highest scores = Candidates for elimination)
    // Sort descending: Highest score first
    const sortedPlayers = [...playersWithTotal].sort((a, b) => b.total - a.total);

    // Take Top 2 (Worst 2 players)
    let finalists = [sortedPlayers[0].id, sortedPlayers[1].id];

    // Check if 3rd worst has same score as 2nd worst
    if (players.length > 2 && sortedPlayers[2].total === sortedPlayers[1].total) {
      finalists.push(sortedPlayers[2].id);
    }

    setFinalistIds(finalists);
    setGamePhase('final');
  };

  const startGame = (names: string[]) => {
    const newPlayers: Player[] = names.map(name => ({
      id: crypto.randomUUID(),
      name,
    }));
    setPlayers(newPlayers);
    setRounds([]);
    setView(GameView.SCOREBOARD);
  };

  const addRound = (round: GameRound) => {
    setRounds(prev => [...prev, round]);
  };

  const updateRound = (updatedRound: GameRound) => {
    setRounds(prev => prev.map(r => r.id === updatedRound.id ? updatedRound : r));
  };

  const resetGame = () => {
    setPlayers([]);
    setRounds([]);
    setGamePhase('normal');
    setFinalistIds([]);
    localStorage.removeItem(STORAGE_KEY);
    setView(GameView.SETUP);
    setIsChatOpen(false);
  };

  const downloadCSV = () => {
    const headers = ['Tur', 'Yer', 'Biten', 'Biçim', ...players.map(p => p.name)];

    const rows = rounds.map((r, i) => {
      const finisherName = players.find(p => p.id === r.finisherId)?.name || 'Bilinmiyor';
      const playerScores = players.map(p => calculateNetScore(r, p.id));

      return [
        i + 1,
        SUIT_NAMES_TR[r.indicator],
        finisherName,
        FINISH_NAMES_TR[r.finishType],
        ...playerScores
      ];
    });

    // Add Total Row
    const totalRow = ['TOPLAM', '', '', '', ...playersWithTotal.map(p => p.total)];

    // Combine with semicolon delimiter for Excel compatibility in TR locale
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
      totalRow.join(';')
    ].join('\n');

    // Add BOM for UTF-8 compatibility in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `51_skor_excel_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("51 Skor Tablosu", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

    const tableHeaders = [['Tur', 'Yer', ...players.map(p => p.name), 'Biten', 'Biçim']];
    const tableBody = rounds.map((r, i) => {
      return [
        i + 1,
        SUIT_NAMES_TR[r.indicator],
        ...players.map(p => calculateNetScore(r, p.id)),
        players.find(p => p.id === r.finisherId)?.name || '',
        FINISH_NAMES_TR[r.finishType]
      ];
    });

    // Add Totals
    tableBody.push([
      'TOP',
      '',
      ...playersWithTotal.map(p => p.total),
      '',
      ''
    ]);

    // @ts-ignore
    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 35,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [75, 85, 99] }, // slate-600
      footStyles: { fillColor: [30, 41, 59] }, // slate-800
      theme: 'grid'
    });

    doc.save(`51_skor_pdf_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isLoaded) return <div className="min-h-screen"></div>;

  return (
    <>
      {view === GameView.SETUP && (
        <PlayerSetup
          onStartGame={startGame}
          theme={activeTheme}
          layout={activeLayout}
        />
      )}

      {view === GameView.SCOREBOARD && (
        <>
          <ScoreTable
            players={playersWithTotal}
            rounds={rounds}
            onAddRound={addRound}
            onUpdateRound={updateRound}
            onReset={resetGame}
            onOpenChat={() => setIsChatOpen(true)}
            theme={activeTheme}
            layout={activeLayout}
            layouts={LAYOUT_THEMES}
            themes={THEMES}
            layoutMode={layoutMode}
            onThemeChange={setThemeColor}
            onLayoutModeChange={setLayoutMode}
            onDownloadCSV={downloadCSV}
            onDownloadPDF={downloadPDF}
            gamePhase={gamePhase}
            finalistIds={finalistIds}
            onStartFinal={startFinalSeries}
          />

          <GameAssistant
            players={playersWithTotal}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            theme={activeTheme}
            layout={activeLayout}
          />
        </>
      )}
    </>
  );
};

export default App;