import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home-component/home-component';
import { PaymentComponent } from './pages/payment-component/payment-component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'payment', component: PaymentComponent },
];