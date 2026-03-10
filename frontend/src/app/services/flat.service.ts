import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Flat {
    id: number;
    tower_id: number;
    unit_number: string;
    bhk: number;
    price: number;
    security_deposit: number | null;
    status: string;
    image_url: string | null;
    description: string | null;
    tower_name: string;
    tower_image_url?: string;
    amenities?: { name: string, description: string }[];
    available_from?: string;
    floor?: number | null;
    wing?: string | null;
    location?: string | null;
    images?: string[];
    tower_status?: string;
    tower_inactive_reason?: string;
}

export interface Tower {
    id: number;
    name: string;
    floors: number;
    image_url?: string;
    description?: string;
    state?: string;
    city?: string;
    area?: string;
    street?: string;
    units_per_floor?: number;
}

export interface Review {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user_name: string;
}

export interface PaginatedFlats {
    flats: Flat[];
    total: number;
    pages: number;
    current_page: number;
}

@Injectable({
    providedIn: 'root'
})
export class FlatService {
    private apiUrl = `${environment.apiUrl}/flats/`;

    constructor(private http: HttpClient) { }

    getFlats(page: number = 1, limit: number = 10, filters: any = {}): Observable<PaginatedFlats> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (filters.bhk) {
            params = params.set('bhk', filters.bhk);
        }
        if (filters.tower_id) {
            params = params.set('tower_id', filters.tower_id.toString());
        }
        if (filters.min_price) {
            params = params.set('price_min', filters.min_price);
        }
        if (filters.max_price) {
            params = params.set('price_max', filters.max_price);
        }
        if (filters.status) {
            params = params.set('status', filters.status);
        }
        if (filters.location) {
            params = params.set('location', filters.location);
        }
        if (filters.floor) {
            params = params.set('floor', filters.floor.toString());
        }
        if (filters.wing) {
            params = params.set('wing', filters.wing);
        }

        return this.http.get<PaginatedFlats>(this.apiUrl, { params });
    }

    getFlat(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}${id}`);
    }

    getTowers(): Observable<Tower[]> {
        return this.http.get<Tower[]>(`${this.apiUrl}towers`);
    }

    getFlatImages(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}${id}/images`);
    }

    getReviews(unitId: number): Observable<{ reviews: Review[] }> {
        return this.http.get<{ reviews: Review[] }>(`${environment.apiUrl}/reviews/${unitId}`);
    }

    postReview(unitId: number, rating: number, comment: string): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.post(`${environment.apiUrl}/reviews/`, {
            unit_id: unitId,
            rating: rating,
            comment: comment
        }, { headers });
    }

    // Recommendations
    getRecommendations(): Observable<any> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(`${environment.apiUrl}/recommendations/`, { headers });
    }
}
