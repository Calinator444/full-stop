import { Component } from '@angular/core';
import { Button } from '../button/button';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GameResponse } from '../../types/api/game';

@Component({
   selector: 'app-home',
   imports: [Button],
   templateUrl: './home.html',
})
export class Home {
   constructor(
      private httpClient: HttpClient,
      private router: Router
   ) {}
   startGame() {
      this.httpClient.post<GameResponse>('/api/games/start', {}).subscribe({
         next: (res) => {
            this.router.navigate(['/games', res.gameId]);
         },
      });
   }
}
