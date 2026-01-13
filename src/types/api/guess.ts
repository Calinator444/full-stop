import { GuessResult } from '../guess';

export type GuessResponse = {
   distance: number;
   result: GuessResult;
   points: number;
};
