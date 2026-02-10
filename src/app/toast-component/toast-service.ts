import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'alert-success' | 'alert-error' | 'alert-info' | 'alert-warning';
  id: number;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  /**
   * @param message Le texte à afficher
   * @param type Le type d'alerte daisyUI
   * @param duration Durée en millisecondes (défaut 3000ms)
   */

  show(message: string, type: Toast['type'] = 'alert-info', duration: number = 3000) {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, duration }]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}