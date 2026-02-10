import { Component, inject } from '@angular/core';
import { ToastService } from './toast-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast-component',
  imports: [CommonModule],
  templateUrl: './toast-component.html',
  styleUrl: './toast-component.css',
})
export class ToastComponent {
  public toastService = inject(ToastService);

  getBorderClass(type: string): string {
    const map: Record<string, string> = {
      'alert-success': 'bg-success',
      'alert-error': 'bg-error',
      'alert-info': 'bg-info',
      'alert-warning': 'bg-warning'
    };
    return map[type] || 'bg-primary';
  }

  getTitle(type: string): string {
    const map: Record<string, string> = {
      'alert-success': 'Succès',
      'alert-error': 'Erreur',
      'alert-info': 'Information',
      'alert-warning': 'Attention'
    };
    return map[type] || 'Notification';
  }
}
