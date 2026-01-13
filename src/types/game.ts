import { Challenge } from './challenge';

export type Game = {
   gameId: string;
   challenges: Entity<Challenge>[];
   guesses: Coordinates[];
};
