export type ScoreBoardResponse = {
   score: number;
   completedAt: Date;
   rounds: Round[];
};

export type Round = {
   guess: Coordinates;
   distance: number;
   points: number;
};
