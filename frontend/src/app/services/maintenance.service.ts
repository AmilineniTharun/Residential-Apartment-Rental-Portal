import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaintenanceRequest {
    id: number;
    user_id?: number;
    booking_id?: number;
    issue_type?: string;
    issue: string;
    status: 'pending' | 'resolved';
    created_at: string;
    user_email?: string;
    first_name?: string;
    last_name?: string;
    unit_number?: string;
    tower_name?: string;
    admin_note?: string;
    service_date?: string;
    rating?: number;
    user_feedback?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MaintenanceService {
    private apiUrl = 'http://localhost:5000/api';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    // User Endpoints
    submitRequest(bookingId: number, issueType: string, issue: string): Observable<{ message: string; request: MaintenanceRequest }> {
        return this.http.post<{ message: string; request: MaintenanceRequest }>(`${this.apiUrl}/maintenance/`, { booking_id: bookingId, issue_type: issueType, issue }, { headers: this.getHeaders() });
    }

    getMyRequests(): Observable<{ requests: MaintenanceRequest[] }> {
        return this.http.get<{ requests: MaintenanceRequest[] }>(`${this.apiUrl}/maintenance/`, { headers: this.getHeaders() });
    }

    // Admin Endpoints
    getAllRequests(): Observable<{ requests: MaintenanceRequest[] }> {
        return this.http.get<{ requests: MaintenanceRequest[] }>(`${this.apiUrl}/admin/maintenance`, { headers: this.getHeaders() });
    }

    updateRequestStatus(id: number, status?: 'pending' | 'resolved', service_date?: string, admin_note?: string): Observable<{ message: string }> {
        const body: any = {};
        if (status) body.status = status;
        if (service_date !== undefined) body.service_date = service_date;
        if (admin_note !== undefined) body.admin_note = admin_note;
        return this.http.put<{ message: string }>(`${this.apiUrl}/admin/maintenance/${id}`, body, { headers: this.getHeaders() });
    }

    submitFeedback(id: number, rating: number, user_feedback: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/maintenance/${id}/feedback`, { rating, user_feedback }, { headers: this.getHeaders() });
    }
}
