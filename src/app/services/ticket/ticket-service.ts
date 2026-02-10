import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TicketResponse } from '../../models/api_response.model';
import { apiUrl } from '../../utils/api_url';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);

  allTicket(): Observable<TicketResponse> {
    return this.http.get<TicketResponse>(apiUrl + `ticket`);
  }

  sendTicketEmail(data: { email: string, name: string, eventName: string, pdfBase64: string }): Observable<any> {
    return this.http.post(`${apiUrl}ticket/send`, data);
  }
}
