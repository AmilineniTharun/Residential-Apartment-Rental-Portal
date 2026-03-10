import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class BookingService {
    private apiUrl = `${environment.apiUrl}/bookings`;

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    createBooking(unitId: number, startDate?: string, endDate?: string): Observable<any> {
        const body: any = { unit_id: unitId };
        if (startDate) body['start_date'] = startDate;
        if (endDate) body['end_date'] = endDate;
        return this.http.post(`${this.apiUrl}/`, body, { headers: this.getHeaders() });
    }

    getMyBookings(): Observable<any> {
        return this.http.get(`${this.apiUrl}/me`, { headers: this.getHeaders() });
    }

    getMyAmenityStatuses(): Observable<any> {
        return this.http.get(`${this.apiUrl}/my-amenities`, { headers: this.getHeaders() });
    }
}
