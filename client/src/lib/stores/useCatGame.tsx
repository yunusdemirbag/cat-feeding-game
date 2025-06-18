import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "ready" | "playing" | "ended";

interface CatGameState {
  phase: GamePhase;
  score: number;
  level: number;
  timeLeft: number;
  gameRunning: boolean;
  
  // Actions
  startGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  incrementScore: () => void;
  decrementTime: () => void;
  levelUp: () => void;
  resetGame: () => void;
}

export const useCatGame = create<CatGameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "ready",
    score: 0,
    level: 1,
    timeLeft: 20,
    gameRunning: false,
    
    startGame: () => {
      set(() => ({
        phase: "playing",
        gameRunning: true,
        score: 0,
        level: 1,
        timeLeft: 20
      }));
    },
    
    restartGame: () => {
      set(() => ({
        phase: "ready",
        gameRunning: false,
        score: 0,
        level: 1,
        timeLeft: 20
      }));
    },
    
    endGame: () => {
      set(() => ({
        phase: "ended",
        gameRunning: false
      }));
    },
    
    incrementScore: () => {
      set((state) => ({
        score: state.score + 1
      }));
    },
    
    decrementTime: () => {
      set((state) => ({
        timeLeft: Math.max(0, state.timeLeft - 1)
      }));
    },
    
    levelUp: () => {
      set((state) => ({
        level: state.level + 1,
        timeLeft: Math.min(30, state.timeLeft + 5) // Add 5 seconds, max 30
      }));
    },
    
    resetGame: () => {
      set(() => ({
        phase: "ready",
        gameRunning: false,
        score: 0,
        level: 1,
        timeLeft: 20
      }));
    }
  }))
);
