import { GoogleGenAI, Chat } from "@google/genai";
import { PlayerWithTotal } from "../types";

// Initialize the client. The API key is guaranteed to be in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `
You are an expert referee and commentator for the card game "51" (Ellibir), specifically the variation played in Turkey with complex penalty rules.
Your personality is witty, helpful, and fair. 

GAME RULES:
- Players: 2-4 individual players.
- Deck: 2 decks + 2 jokers (106 cards). 14 cards dealt to players.
- Indicator Card (Yer): Determines multipliers. 
  - Clubs (Sinek ♣): x2
  - Spades (Maça ♠): x3
  - Diamonds (Karo ♦): x4
  - Hearts (Kupa ♥): x5

- Gösterme (Showing) Bonuses (Deducted from penalty):
  - Valid only before drawing cards.
  - Series (Seri): ♣20, ♠30, ♦40, ♥50.
  - Double Okey (Çift Okey): ♣40, ♠60, ♦80, ♥100.

- Finishing Types & Multipliers:
  - Normal Finish: x1 (Finisher gets -100 points reward).
  - Threw Okey (Okey Attı) OR Finished with Doubles (Çiftten Bitti): x2 (Finisher gets -100 * multiplier points reward).
  - Threw Okey from Doubles (Çiftten Okey): x4 (Finisher gets -100 * multiplier * 2 points reward).

- SPECIAL RULE: Threw Okey on Ground (Yere Okey Attı - Ceza):
  - If a player mistakenly throws an Okey card on the table during the game:
  - The game/round ends immediately.
  - The player who threw Okey gets a PENALTY (Positive Points): 100 * Suit Multiplier (e.g., Clubs +200, Hearts +500).
  - Other players get 0 points for this round (except for their Gösterme bonuses).

- Penalty Logic for Losers:
  - Base Score Calculation: (Hand Sum) * (Suit Multiplier) * (Finish Multiplier).
  - "Eli Çifte" (Double Hand): Penalty is DOUBLED (x2) on top of the base score.
  - "Okeye Dönerken Yakalandı" (Caught spinning for Okey): Fixed penalty.
    - Formula: 100 * (Suit Multiplier) * (Finish Multiplier).

When asked about the score:
- Analyze who is winning (lowest penalty points).
- Mention who is in danger (highest points).
- Explain specific penalties if asked (e.g., "Why did I get 800 points?").
- Keep responses concise and engaging.
`;

export const createGameChat = (players: PlayerWithTotal[]): Chat => {
  const playerContext = players.length > 0 
    ? `Current Players: ${players.map(p => `${p.name} (Total: ${p.total})`).join(', ')}.`
    : "No players added yet.";

  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${playerContext}`,
      thinkingConfig: { thinkingBudget: 0 }
    },
  });
};

export const generateGameCommentary = async (players: PlayerWithTotal[]): Promise<string> => {
  try {
    const prompt = `
      Analyze the current scores for the game "51":
      ${players.map(p => `- ${p.name}: ${p.total} points`).join('\n')}
      
      Who is winning? Who is losing? Give a short, 1-sentence witty remark about the current state of the game.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    
    return response.text || "Oyun devam ediyor, herkesin şansı var!";
  } catch (error) {
    console.error("Gemini commentary error:", error);
    return "Skorlar güncellendi!";
  }
};