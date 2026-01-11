import { Component, OnInit } from '@angular/core';
import { Challenge } from '../../types/challenge';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Button } from '../button/button';
import { Router } from '@angular/router';

@Component({
   selector: 'app-challenges',
   imports: [Button],
   templateUrl: './challenges.html',
})
export class Challenges implements OnInit {
   challenges: Entity<Challenge>[] = [];

   constructor(
      private http: HttpClient,
      private router: Router
   ) {}

   //  playGame(challengeId: string) {
   //     this.router.navigate(['/challenges', challengeId]);
   //  }

   playGame(challengeId: string) {
      this.http
         .post<GameResponse>(`/api/games/${challengeId}/start`, {})
         .subscribe({
            next: (res) => {
               console.log('res', res);
               if (res.gameId) {
                  this.router.navigateByUrl(`/games/${res.gameId}`);
               }
            },
         });
   }

   // Haversone formula based on the following resource: https://www.movable-type.co.uk/scripts/latlong.html
   computeDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371000; // metres
      const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
         Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
         Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const d = R * c; // in metres

      return d;
   }

   ngOnInit(): void {
      this.http
         .get<Entity<Challenge>[]>('/api/challenges')
         .subscribe((data) => {
            this.challenges = data;
         });
   }
}
