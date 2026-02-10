import { Component, inject, signal } from '@angular/core';
import { LoaderComponent } from "./loader-component/loader-component";
import { ToastComponent } from "./toast-component/toast-component";
import { LoadingService } from './loader-component/loader-service';
import { ToastService } from './toast-component/toast-service';
import { LucideAngularModule } from 'lucide-angular';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [LoaderComponent, ToastComponent, LucideAngularModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private toast = inject(ToastService);
  private loader = inject(LoadingService);

  sauvegarder() {
    this.loader.show();

    // Simulation d'appel API
    setTimeout(() => {
      this.loader.hide();
      this.toast.show('Données enregistrées avec succès !', 'alert-success', 3000);
    }, 3000);
  }
}
