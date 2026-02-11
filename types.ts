export type Suit = 'clubs' | 'spades' | 'diamonds' | 'hearts';
export type FinishType = 'normal' | 'okey' | 'double' | 'doubleOkey' | 'threwOkey';
export type PlayerStatus = 'normal' | 'double' | 'caught';

export interface Player {
  id: string;
  name: string;
}

// Derived player state for UI consumption
export interface PlayerWithTotal extends Player {
  total: number;
}

export interface RoundPlayerStats {
  handSum: string;
  status: PlayerStatus;
  gostermeSeri: boolean;
  gostermeDoubleOkey: boolean;
}

export interface GameRound {
  id: string;
  indicator: Suit;
  finisherId: string;
  finishType: FinishType;
  playerStats: Record<string, RoundPlayerStats>;
  timestamp: number;
}

export type GamePhase = 'normal' | 'final';

export interface GameState {
  players: Player[];
  rounds: GameRound[];
  themeColor: ThemeColor;
  layoutMode: LayoutMode;
  gamePhase: GamePhase;
  finalistIds: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export enum GameView {
  SETUP = 'SETUP',
  SCOREBOARD = 'SCOREBOARD',
}

// Theme System
export type ThemeColor = 'emerald' | 'indigo' | 'rose' | 'amber';
export type LayoutMode = 'light' | 'dark';

export interface ThemeClasses {
  name: string;
  colorKey: ThemeColor;
  bg: string;
  bgHover: string;
  text: string;
  border: string;
  ring: string;
  lightBg: string;
  badge: string;
  gradientFrom: string;
}

export interface LayoutClasses {
  name: string;
  mainBg: string; // Global background
  containerBg: string; // Cards/Modals/Tables background
  textColor: string; // Main text color
  textSecondary: string; // Secondary text (labels)
  textMuted: string; // Muted text
  borderColor: string;
  inputBg: string; // Input fields background
  inputBorder: string;
  tableHeaderBg: string;
  tableRowHover: string;
  tableStripe: string;
  shadow: string;
}