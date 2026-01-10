import { Component } from '@angular/core';
import { Currency, LucideAngularModule, XIcon } from 'lucide-angular';
import { log } from 'util';
@Component({
   selector: 'app-game',
   imports: [LucideAngularModule],
   templateUrl: './game.html',
})
export class Game {
   readonly XIcon = XIcon;
   open: boolean = false;
   zoomInterval: number = 0.1;
   zoom: number = 1;
   posX: number = 0;
   posY: number = 0;
   zoomOriginX: number = 0;
   zoomOriginY: number = 0;
   maxZoom: number = 4;
   evCache: PointerEvent[] = [];
   prevDiff: number = -1;
   toggleInspect() {
      this.open = !this.open;
   }

   distanceFormula(x1: number, y1: number, x2: number, y2: number) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
   }

   // pinching behavior based on the mozilla documentation: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures

   handlePointerUp(ev: Event) {
      this.removeEvent(ev);

      // If the number of pointers down is less than two then reset diff tracker
      if (this.evCache.length < 2) {
         this.prevDiff = -1;
      }
   }

   handlePointerDown(ev: PointerEvent) {
      this.evCache.push(ev);
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

   removeEvent(ev: Event) {
      // Remove this event from the target's cache
      const index = this.evCache.findIndex(
         //@ts-ignore
         (cachedEv) => cachedEv.pointerId === ev.pointerId
      );
      this.evCache.splice(index, 1);
   }

   handleWheel(event: WheelEvent) {
      const { deltaY, pageX, pageY } = event;

      // prevent horizontal scrolling from having an effect

      this.zoomOriginX = pageX;
      this.zoomOriginY = pageY;

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
