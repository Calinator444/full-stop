import { Routes } from '@angular/router';
import { Game } from './game/game';
import { Challenges } from './challenges/challenges';

export const routes: Routes = [
   {
      path: 'game',
      component: Game,
   },
   {
      path: 'challenges',
      component: Challenges,
   },
];
