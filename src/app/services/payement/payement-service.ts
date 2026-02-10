import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../utils/api_url';
import { Payment } from '../../models/payment';
import { CallbackResponse, TransactionResponse } from '../../models/api_response.model';

@Injectable({
  providedIn: 'root',
})
export class PayementService {
  private http = inject(HttpClient);

  createTransaction(data: Payment): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(`${apiUrl}payment/${data.ticketId}`, data);
  }

  callback(id: string): Observable<CallbackResponse> {
    return this.http.get<CallbackResponse>(`${apiUrl}payment/callback/${id}`);
  }
}