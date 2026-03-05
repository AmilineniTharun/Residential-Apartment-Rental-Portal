import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private apiUrl = 'http://127.0.0.1:5000/api/payments';
    http = inject(HttpClient);
    authService = inject(AuthService);

    constructor() { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.authService.getToken()}`
        });
    }

    processPayment(bookingId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/`, { booking_id: bookingId }, { headers: this.getHeaders() });
    }

    getUserPayments(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/user`, { headers: this.getHeaders() });
    }
}
