import { Component, EventEmitter, input, Input, Output } from '@angular/core';

@Component({
   selector: 'app-button',
   imports: [],
   templateUrl: './button.html',
   styleUrl: './button.css',
})
export class Button {
   @Input() variant: ButtonVariant = 'primary';
   @Input() size: ButtonSize = 'medium';
   @Input() label: string = '';
   @Input() class: string = '';
   @Input() disabled: boolean = false;
   @Output() onClick = new EventEmitter<void>();

   handleClick() {
      this.onClick.emit();
   }
}
