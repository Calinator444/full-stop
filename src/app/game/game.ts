import { Component } from '@angular/core';

@Component({
   selector: 'app-game',
   imports: [],
   templateUrl: './game.html',
})
export class Game {
   open: boolean = false;
   zoomInterval: number = 0.1;
   zoom: number = 1;
   posX: number = 0;
   posY: number = 0;
   zoomOriginX: number = 0;
   zoomOriginY: number = 0;
   maxZoom: number = 4;

   toggleInspect() {
      this.open = !this.open;
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
