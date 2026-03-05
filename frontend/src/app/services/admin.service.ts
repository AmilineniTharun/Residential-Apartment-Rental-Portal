import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:5000/api/admin';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    // Bookings
    getBookings(): Observable<any> {
        return this.http.get(`${this.apiUrl}/bookings`, { headers: this.getHeaders() });
    }

    approveBooking(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/bookings/${id}/approve`, {}, { headers: this.getHeaders() });
    }

    rejectBooking(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/bookings/${id}/reject`, {}, { headers: this.getHeaders() });
    }

    // Reports
    getReports(): Observable<any> {
        return this.http.get(`${this.apiUrl}/reports`, { headers: this.getHeaders() });
    }

    // Amenities
    getAmenities(): Observable<any> {
        return this.http.get(`${this.apiUrl}/amenities`, { headers: this.getHeaders() });
    }

    addAmenity(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/amenities`, data, { headers: this.getHeaders() });
    }

    deleteAmenity(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/amenities/${id}`, { headers: this.getHeaders() });
    }

    // Units
    getUnits(): Observable<any> {
        return this.http.get('http://localhost:5000/api/flats/?status=all', { headers: this.getHeaders() });
    }

    addUnit(data: FormData): Observable<any> {
        // We drop the Content-Type header so the browser sets it automatically to multipart/form-data with boundaries
        const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('token')}`);
        return this.http.post(`${this.apiUrl}/flats`, data, { headers });
    }

    updateUnit(id: number, data: FormData): Observable<any> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('token')}`);
        return this.http.put(`${this.apiUrl}/flats/${id}`, data, { headers });
    }

    updateUnitStatus(id: number, status: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/units/${id}/status`, { status }, { headers: this.getHeaders() });
    }

    vacateUnit(id: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/units/${id}/vacate`, {}, { headers: this.getHeaders() });
    }

    // Towers
    getTowers(): Observable<any> {
        return this.http.get(`${this.apiUrl}/towers`, { headers: this.getHeaders() });
    }

    addTower(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/towers`, data, { headers: this.getHeaders() });
    }

    updateTower(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/towers/${id}`, data, { headers: this.getHeaders() });
    }
    deleteUnit(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/flats/${id}`, { headers: this.getHeaders() });
    }

    deleteTower(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/towers/${id}`, { headers: this.getHeaders() });
    }

    // Leases
    getLeases(): Observable<any> {
        return this.http.get(`${this.apiUrl}/leases`, { headers: this.getHeaders() });
    }

    async downloadLease(bookingId: number): Promise<Blob> {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/lease/${bookingId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch lease PDF');
        return await response.blob();
    }

    // Tower Amenity Status
    getTowerAmenityStatus(towerId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/tower-amenity-status/${towerId}`, { headers: this.getHeaders() });
    }

    updateTowerAmenityStatus(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/tower-amenity-status`, data, { headers: this.getHeaders() });
    }
}

