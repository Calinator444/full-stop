import { Component, Input, input, model, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventEmitter } from 'stream';

@Component({
   selector: 'app-input',
   imports: [FormsModule],
   templateUrl: './input.html',
})
export class InputBox {
   @Input() label: string = '';
   value = model<number>(0);
}
