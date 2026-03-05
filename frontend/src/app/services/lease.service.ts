import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class LeaseService {
    private apiUrl = 'http://127.0.0.1:5000/api/lease';
    http = inject(HttpClient);
    authService = inject(AuthService);

    constructor() { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    }

    getMyLeases(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/me`, { headers: this.getHeaders() });
    }

    getMyLeaseRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-requests`, { headers: this.getHeaders() });
    }

    submitLeaseRequest(bookingId: number, type: 'terminate' | 'extend' | 'vacate', extendDays?: number, newEndDate?: string): Observable<any> {
        const body: any = { booking_id: bookingId, request_type: type };
        if (extendDays) body.extend_days = extendDays;
        if (newEndDate) body.new_end_date = newEndDate;
        return this.http.post(`${this.apiUrl}/request`, body, { headers: this.getHeaders() });
    }

    // Admin methods
    getLeaseRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/requests`, { headers: this.getHeaders() });
    }

    approveLeaseRequest(reqId: number, newEndDate?: string, note?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/requests/${reqId}/approve`,
            { new_end_date: newEndDate, admin_note: note }, { headers: this.getHeaders() });
    }

    rejectLeaseRequest(reqId: number, note?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/requests/${reqId}/reject`,
            { admin_note: note }, { headers: this.getHeaders() });
    }

    adminTerminateLease(bookingId: number, endDate: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/${bookingId}/terminate`,
            { end_date: endDate }, { headers: this.getHeaders() });
    }

    adminExtendLease(bookingId: number, newEndDate: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/${bookingId}/extend`,
            { new_end_date: newEndDate }, { headers: this.getHeaders() });
    }

    async downloadLease(bookingId: number): Promise<Blob> {
        const response = await fetch(`${this.apiUrl}/${bookingId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.authService.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch lease PDF');
        return await response.blob();
    }
}
