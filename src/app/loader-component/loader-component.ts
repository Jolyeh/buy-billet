import { Component, inject } from '@angular/core';
import { LoadingService } from './loader-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader-component',
  imports: [CommonModule],
  templateUrl: './loader-component.html',
  styleUrl: './loader-component.css',
})
export class LoaderComponent {
  public loadingService = inject(LoadingService);
}
