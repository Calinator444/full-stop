import { Challenge } from './challenge';

export type Game = {
   gameId: string;
   challenges: Entity<Challenge>[];
   stage: GameStage;
   startedAt: Date;
   guesses: { coordinates: Coordinates; score: number; distance: number }[];
};

export type GameStage = 'in-progress' | 'completed';
