import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private apiUrl = `${environment.apiUrl}/payments`;
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

    getActiveUnits(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/user/active-units`, { headers: this.getHeaders() });
    }

    getDues(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/user/dues`, { headers: this.getHeaders() });
    }

    getPaymentDeadline(bookingId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/deadline/${bookingId}`, { headers: this.getHeaders() });
    }

    expireBooking(bookingId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/expire/${bookingId}`, {}, { headers: this.getHeaders() });
    }
}
