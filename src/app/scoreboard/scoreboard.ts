import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScoreBoardResponse } from '../../types/api/scoreboard';
import { Game } from '../game/game';
import { Button } from '../button/button';

@Component({
   selector: 'app-scoreboard',
   imports: [Button],
   templateUrl: './scoreboard.html',
})
export class Scoreboard implements OnInit {
   gameId: string = '';
   isPending: boolean = false;
   scoreboard?: ScoreBoardResponse;
   constructor(
      private route: ActivatedRoute,
      private httpClient: HttpClient,
      private router: Router
   ) {}
   ngOnInit(): void {
      this.gameId = this.route.snapshot.paramMap.get('id') || '';
      this.httpClient
         .get<ScoreBoardResponse>(`/api/games/${this.gameId}/scoreboard`)
         .subscribe((data) => {
            console.log(data);
            this.scoreboard = data;
         });
   }

   startGame() {
      this.isPending = true;
      this.httpClient.post<Game>('/api/games/start', {}).subscribe((res) => {
         this.router.navigate(['/games', res.gameId]);
      });
   }
}
