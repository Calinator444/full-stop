import { Component } from '@angular/core';
import { Button } from '../button/button';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Game } from '../../types/game';

@Component({
   selector: 'app-home',
   imports: [Button],
   templateUrl: './home.html',
})
export class Home {
   isPending: boolean = false;
   constructor(
      private httpClient: HttpClient,
      private router: Router
   ) {}
   startGame() {
      this.isPending = true;
      this.httpClient.post<Game>('/api/games/start', {}).subscribe({
         next: (res) => {
            this.router.navigate(['/games', res.gameId]);
         },
      });
   }
}
