import { Routes } from '@angular/router';
import { Game } from './game/game';
// import { Challenges } from './challenges/challenges';
import { Home } from './home/home';
import { Scoreboard } from './scoreboard/scoreboard';

export const routes: Routes = [
   {
      path: '',
      component: Home,
   },
   {
      path: 'games/:id',
      component: Game,
   },
   {
      path: 'games/:id/score',
      component: Scoreboard,
   },
];
