import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoaderCircleIcon, LucideAngularModule, XIcon } from 'lucide-angular';
import { Button } from '../button/button';
import { Game as GameSession } from '../../types/game';
import { ActivatedRoute, Router } from '@angular/router';
import { Challenge } from '../../types/challenge';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GuessResponse } from '../../types/api/guess';
import { InputBox } from '../input/input';
import { GoogleMap, MapMarker, MapPolyline } from '@angular/google-maps';
import { JsonPipe } from '@angular/common';

@Component({
   selector: 'app-game',
   imports: [
      Button,
      FormsModule,
      LucideAngularModule,
      MapPolyline,
      InputBox,
      GoogleMap,
      JsonPipe,
      MapMarker,
   ],
   templateUrl: './game.html',
})
export class Game implements OnInit {
   constructor(
      private cdr: ChangeDetectorRef,
      private route: ActivatedRoute,
      private http: HttpClient,
      private router: Router
   ) {}

   zoom = 1;
   readonly XIcon = XIcon;
   readonly LoaderCircleIcon = LoaderCircleIcon;

   gameStage: 'loading' | 'playing' | 'scoring' | 'gameover' = 'loading';

   guessPosition: google.maps.LatLngLiteral = {
      lat: 0,
      lng: 0,
   };
   actualPosition: google.maps.LatLngLiteral = {
      lat: 0,
      lng: 0,
   };
   gameId: string = '';
   open: boolean = false;
   zoomInterval: number = 0.1;
   posX: number = 0;
   stages: Entity<Challenge>[] = [];
   options: google.maps.MapOptions = {
      mapTypeId: 'satellite',
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      rotateControl: false,
      scaleControl: false,
      cameraControl: false,
      zoom: 17,
   };
   markeropts: google.maps.MarkerLabel = {
      text: 'Your Guess',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
   };
   image: string = '';
   labl = 'this is a marker label';
   level: number = -1;
   posY: number = 0;
   latitude: number = 0;
   longitude: number = 0;
   zoomOriginX: number = 0;
   zoomOriginY: number = 0;
   gameOver: boolean = false;
   maxZoom: number = 4;
   evCache: PointerEvent[] = [];
   prevDiff: number = -1;
   showScore = false;
   vertices: google.maps.LatLngLiteral[] = [];
   scoreResult?: GuessResponse;

   ngOnInit() {
      this.gameId = this.route.snapshot.paramMap.get('id') || '';
      this.http
         .post<GameSession>(`/api/games/${this.gameId}/play`, {})
         .subscribe((data) => {
            this.stages = data.challenges;

            this.level = Math.min(
               data.challenges.length,
               data.guesses.length + 1
            );
            this.gameStage = 'playing';
            this.cdr.detectChanges();
         });
   }

   toggleInspect() {
      this.open = !this.open;
   }

   distanceFormula(x1: number, y1: number, x2: number, y2: number) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
   }
   get activeChallenge() {
      return this.stages[this.level - 1];
   }

   endGame() {
      this.router.navigate(['games', this.gameId, 'score']);
   }

   handleGuess() {
      this.http
         .post<GuessResponse>(`/api/games/${this.gameId}/guess`, {
            _latitude: this.latitude,
            _longitude: this.longitude,
            level: this.level,
         })
         .subscribe((data) => {
            if (this.activeChallenge) {
               this.actualPosition = {
                  lat: this.activeChallenge.coordinates._latitude,
                  lng: this.activeChallenge.coordinates._longitude,
               };
               this.guessPosition = {
                  lat: this.latitude,
                  lng: this.longitude,
               };
               this.vertices = [this.guessPosition, this.actualPosition];
            }
            this.scoreResult = data;
            if (this.level === this.stages.length) {
               this.gameStage = 'gameover';
            } else {
               this.gameStage = 'scoring';
            }
            this.cdr.detectChanges();
         });
   }

   // pinching behavior based on the mozilla documentation: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures

   handlePointerUp(ev: PointerEvent) {
      this.removeEvent(ev);

      // If the number of pointers down is less than two then reset diff tracker
      if (this.evCache.length < 2) {
         this.prevDiff = -1;
      }
   }

   handlePointerDown(ev: PointerEvent) {
      this.evCache.push(ev);
   }

   nextLevel() {
      this.level += 1;
      this.latitude = 0;
      this.longitude = 0;
      this.gameStage = 'playing';
   }

   handlePointerMove(ev: PointerEvent) {
      // Find this event in the cache and update its record with this event
      const index = this.evCache.findIndex(
         (cachedEv) => cachedEv.pointerId === ev.pointerId
      );
      this.evCache[index] = ev;
      // If two pointers are down, check for pinch gestures

      if (this.evCache.length === 2) {
         // Calculate the distance between the two pointers
         const { clientX: x1, clientY: y1 } = this.evCache[0];

         const { clientX: x2, clientY: y2 } = this.evCache[1];
         const curDiff = this.distanceFormula(x1, y1, x2, y2);

         Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

         // Cache the distance for the next move event
         if (this.prevDiff > 0) {
            // The distance between the two pointers has increased
            if (curDiff > this.prevDiff) {
               this.zoom = Math.min(
                  this.maxZoom,
                  this.zoom + 0.00005 * curDiff
               );
            }
            // The distance between the two pointers has decreased
            if (curDiff < this.prevDiff) {
               this.zoom = Math.max(1, this.zoom - 0.00005 * curDiff);
            }
            this.zoomOriginX = (x1 + x2) / 2;
            this.zoomOriginY = (y1 + y2) / 2;
         }

         // Cache the distance for the next move event
         this.prevDiff = curDiff;
      }
   }

   removeEvent(ev: PointerEvent) {
      // Remove this event from the target's cache
      const index = this.evCache.findIndex(
         (cachedEv) => cachedEv.pointerId === ev.pointerId
      );
      this.evCache.splice(index, 1);
   }

   handleWheel(event: WheelEvent) {
      const { deltaY, pageX, pageY } = event;
      this.zoomOriginX = pageX;
      this.zoomOriginY = pageY;

      // prevent horizontal scrolling from having an effect
      if (deltaY === 0) return;

      const zoomDirection: 'in' | 'out' = event.deltaY > 0 ? 'out' : 'in';

      const scaleFactor = zoomDirection === 'in' ? 1 : -1;

      if (zoomDirection === 'in' && this.zoom >= this.maxZoom) {
         this.zoom = this.maxZoom;
         return;
      }
      if (zoomDirection === 'out' && this.zoom <= 1) {
         this.zoom = 1;
         return;
      }

      this.zoom += this.zoomInterval * scaleFactor;
   }
}
