import { Component, OnInit } from '@angular/core';
import { Challenge } from '../../types/challenge';
import { HttpClient } from '@angular/common/http';
import { Button } from '../button/button';

@Component({
   selector: 'app-challenges',
   imports: [Button],
   templateUrl: './challenges.html',
})
export class Challenges implements OnInit {
   challenges: Challenge[] = [];

   constructor(private http: HttpClient) {}
   ngOnInit(): void {
      this.http.get<Challenge[]>('/api/challenges').subscribe((data) => {
         this.challenges = data;
      });
   }
}
