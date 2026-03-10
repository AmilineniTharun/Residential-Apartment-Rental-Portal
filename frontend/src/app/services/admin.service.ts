import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiUrl}/admin`;

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
        return this.http.get(`${environment.apiUrl}/flats/?status=all&limit=1000`, { headers: this.getHeaders() });
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

    toggleTowerStatus(id: number, status: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/towers/${id}/toggle-status`, { status }, { headers: this.getHeaders() });
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
        const response = await fetch(`${environment.apiUrl}/lease/${bookingId}`, {
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

    // Users
    getUsers(): Observable<any> {
        return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders() });
    }

    deleteUser(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
    }

    updateUserRole(id: number, role: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/users/${id}/role`, { role }, { headers: this.getHeaders() });
    }

    // Payments
    getPayments(): Observable<any> {
        return this.http.get(`${this.apiUrl}/payments`, { headers: this.getHeaders() });
    }

    getBookingDetails(bookingId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/bookings/${bookingId}/details`, { headers: this.getHeaders() });
    }

    getUserHistory(userId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/users/${userId}/history`, { headers: this.getHeaders() });
    }

    getUnitOccupant(unitId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/units/${unitId}/occupant`, { headers: this.getHeaders() });
    }
}

