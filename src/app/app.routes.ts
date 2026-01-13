import { Routes } from '@angular/router';
import { Game } from './game/game';
import { Challenges } from './challenges/challenges';
import { Home } from './home/home';

export const routes: Routes = [
   {
      path: 'games/:id',
      component: Game,
   },
   {
      path: 'challenges',
      component: Challenges,
   },
   {
      path: '',
      component: Home,
   },
];
