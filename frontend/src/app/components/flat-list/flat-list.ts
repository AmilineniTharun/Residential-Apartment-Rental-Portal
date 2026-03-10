import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlatService, Flat, Review, Tower } from '../../services/flat.service';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flat-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './flat-list.html',
  styleUrl: './flat-list.css',
})
export class FlatList implements OnInit {
  flatService = inject(FlatService);
  authService = inject(AuthService);
  bookingService = inject(BookingService);

  flats: Flat[] = [];
  selectedFlat: Flat | null = null;
  selectedFlatImages: string[] = [];
  currentImageIndex = 0;
  isBookingConfirmed = false;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  selectedAmenity: { name: string, description: string } | null = null;
  isAdmin = false;

  // Lease form
  showLeaseForm = false;
  leaseForm = {
    startDate: '',
    leaseDurationMonths: 11,
    leaseDurationDays: 0,
    endDate: '',          // auto-calculated, read-only
    leaseTermsAccepted: false
  };
  leaseFormError = '';

  // Towers
  towers: Tower[] = [];
  selectedTower: Tower | null = null;
  isTowerPhotoModalOpen = false;

  // Reviews
  reviews: Review[] = [];
  newReview = { rating: 5, comment: '' };
  isSubmittingReview = false;
  reviewError = '';

  // Pagination
  currentPage = 1;
  totalPages = 1;

  // Filters
  filters = {
    location: '',
    bhk: '',
    min_price: '',
    max_price: '',
    tower_id: '',
    floor: '',
    wing: '',
    status: 'public'
  };

  ngOnInit(): void {
    this.loadTowers();
    this.loadFlats();

    // Check for admin role
    this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.role === 'admin';
    });
  }

  loadTowers(): void {
    this.flatService.getTowers().subscribe({
      next: (towers) => {
        this.towers = towers;
      },
      error: (err) => console.error('Failed to load towers:', err)
    });
  }

  loadFlats(page: number = 1): void {
    this.isLoading = true;
    this.currentPage = page;

    this.flatService.getFlats(this.currentPage, 12, this.filters).subscribe({
      next: (response: any) => {
        this.flats = response.data;
        this.totalPages = response.pagination.pages;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load flats. Please try again later.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadFlats(this.currentPage);
  }

  clearFilters(): void {
    this.filters = { location: '', bhk: '', min_price: '', max_price: '', tower_id: '', floor: '', wing: '', status: 'available' };
    this.selectedTower = null;
    this.applyFilters();
  }

  onTowerChange(): void {
    if (this.filters.tower_id) {
      this.selectedTower = this.towers.find(t => t.id === Number(this.filters.tower_id)) || null;
    } else {
      this.selectedTower = null;
    }
    this.applyFilters();
  }

  viewTowerPhoto(): void {
    if (this.selectedTower?.image_url) {
      this.isTowerPhotoModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeTowerPhoto(): void {
    this.isTowerPhotoModalOpen = false;
    if (!this.selectedFlat) {
      document.body.style.overflow = 'auto';
    }
  }

  // ---- Lease helpers ----
  recalculateEndDate(): void {
    if (!this.leaseForm.startDate) { this.leaseForm.endDate = ''; return; }
    const start = new Date(this.leaseForm.startDate);
    const months = Number(this.leaseForm.leaseDurationMonths) || 0;
    const days = Number(this.leaseForm.leaseDurationDays) || 0;
    // Add months first
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    // Then add extra days
    end.setDate(end.getDate() + days);
    this.leaseForm.endDate = end.toISOString().split('T')[0];
  }

  get totalPayable(): number {
    if (!this.selectedFlat) return 0;
    const rent = Number(this.selectedFlat.price) || 0;
    const deposit = Number(this.selectedFlat.security_deposit) || 0;
    return rent + deposit;
  }

  get fullLeaseCost(): number {
    if (!this.selectedFlat || !this.leaseForm.startDate || !this.leaseForm.endDate) return 0;
    const start = new Date(this.leaseForm.startDate);
    const end = new Date(this.leaseForm.endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const rent = Number(this.selectedFlat.price) || 0;
    const dailyRate = rent / 30;
    return Math.round(dailyRate * diffDays);
  }

  get todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  isAvailableNow(availableFrom: string | Date | null | undefined): boolean {
    if (!availableFrom) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availDate = new Date(availableFrom);
    availDate.setHours(0, 0, 0, 0);
    return today >= availDate;
  }

  minStartDate: string = '';

  openLeaseForm(flat: Flat): void {
    this.selectedFlat = flat;

    // Immediately show what we have from the list data to prevent empty image flash
    if (flat.images && (flat.images as string[]).length > 0) {
      this.selectedFlatImages = flat.images as string[];
    } else if (flat.image_url) {
      this.selectedFlatImages = [flat.image_url];
    } else {
      this.selectedFlatImages = [];
    }
    this.currentImageIndex = 0;
    this.isBookingConfirmed = false;
    this.showLeaseForm = true;

    // Set min start date based on today or available_from
    const todayStr = new Date().toISOString().split('T')[0];
    this.minStartDate = todayStr; // default to today

    if (flat.available_from) {
      const availDate = new Date(flat.available_from);
      const todayDate = new Date();
      if (availDate > todayDate) {
        this.minStartDate = availDate.toISOString().split('T')[0];
      }
    }

    this.leaseForm = { startDate: '', leaseDurationMonths: 11, leaseDurationDays: 0, endDate: '', leaseTermsAccepted: false };
    this.leaseFormError = '';
    this.loadReviews(flat.id);
    this.loadImages(flat.id);
    document.body.style.overflow = 'hidden';
  }

  getPageArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  bookFlat(): void {
    if (!this.selectedFlat) return;

    // Validate lease form
    if (!this.leaseForm.startDate) { this.leaseFormError = 'Please select a start date.'; return; }
    if (!this.leaseForm.leaseTermsAccepted) { this.leaseFormError = 'You must accept the lease terms.'; return; }
    this.leaseFormError = '';

    this.bookingService.createBooking(
      this.selectedFlat.id,
      this.leaseForm.startDate,
      this.leaseForm.endDate
    ).subscribe({
      next: () => {
        this.successMessage = '✅ Booking requested successfully! Go to My Dashboard → My Bookings to track your request. Once approved by the admin, a Pay Now button will appear.';
        this.closeDetails();
        this.loadFlats(this.currentPage);
        setTimeout(() => this.successMessage = '', 8000);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to submit booking request.';
        this.closeDetails();
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  // Quick book from grid card → open the lease modal directly
  requestQuickBooking(flat: Flat): void {
    this.openLeaseForm(flat);
  }

  viewDetails(flat: Flat): void {
    this.selectedFlat = flat;
    this.currentImageIndex = 0;
    this.isBookingConfirmed = false;
    this.showLeaseForm = false;
    this.leaseFormError = '';
    this.loadReviews(flat.id);
    document.body.style.overflow = 'hidden';

    // Immediately show what we have from the list data
    if (flat.images && (flat.images as string[]).length > 0) {
      this.selectedFlatImages = flat.images as string[];
    } else if (flat.image_url) {
      this.selectedFlatImages = [flat.image_url];
    } else {
      this.selectedFlatImages = [];
    }

    // Also fetch full gallery images from the dedicated endpoint (may have more photos)
    this.loadImages(flat.id);

    // Fetch full detail (floor, wing, location etc.)
    this.flatService.getFlat(flat.id).subscribe({
      next: (res: any) => {
        const detail = res.flat || res;
        if (detail) {
          this.selectedFlat = { ...flat, ...detail };
          // If the dedicated /images call hasn't loaded yet, use inline images from getFlat
          if (this.selectedFlatImages.length === 0) {
            if (detail.images && detail.images.length > 0) {
              this.selectedFlatImages = detail.images;
            } else if (detail.image_url) {
              this.selectedFlatImages = [detail.image_url];
            }
          }
        }
      },
      error: () => { } // silently ignore, we already have list data
    });
  }

  loadImages(unitId: number): void {
    this.flatService.getFlatImages(unitId).subscribe({
      next: (res) => {
        if (res.images && res.images.length > 0) {
          // API returned gallery images — always prefer these (full set)
          this.selectedFlatImages = res.images.map((img: any) => img.image_url);
          this.currentImageIndex = 0;
        } else if (this.selectedFlatImages.length === 0 && this.selectedFlat?.image_url) {
          // Fallback: API returned empty, use cover photo if we don't have any yet
          this.selectedFlatImages = [this.selectedFlat.image_url];
        }
      },
      error: (err) => {
        console.error('Failed to load images:', err);
      }
    });
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.selectedFlatImages.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.selectedFlatImages.length;
    }
  }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.selectedFlatImages.length > 1) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.selectedFlatImages.length) % this.selectedFlatImages.length;
    }
  }

  setCurrentImage(index: number, event: Event): void {
    event.stopPropagation();
    this.currentImageIndex = index;
  }

  loadReviews(unitId: number): void {
    this.flatService.getReviews(unitId).subscribe({
      next: (res) => {
        this.reviews = res.reviews;
      },
      error: (err) => {
        console.error('Failed to load reviews:', err);
      }
    });
  }

  toggleAmenityDescription(amenity: any): void {
    if (this.selectedAmenity?.name === amenity.name) {
      this.selectedAmenity = null;
    } else {
      this.selectedAmenity = amenity;
    }
  }

  submitReview(): void {
    if (!this.selectedFlat) return;
    if (this.newReview.rating < 1 || this.newReview.rating > 5) {
      this.reviewError = 'Rating must be between 1 and 5';
      return;
    }

    this.isSubmittingReview = true;
    this.reviewError = '';

    this.flatService.postReview(this.selectedFlat.id, this.newReview.rating, this.newReview.comment).subscribe({
      next: (res) => {
        this.isSubmittingReview = false;
        this.newReview = { rating: 5, comment: '' };
        // Reload reviews to show the new one
        this.loadReviews(this.selectedFlat!.id);
      },
      error: (err) => {
        this.isSubmittingReview = false;
        this.reviewError = err.error?.error || 'Failed to submit review';
      }
    });
  }

  closeDetails(): void {
    this.selectedFlat = null;
    this.selectedAmenity = null;
    this.isBookingConfirmed = false;
    this.showLeaseForm = false;
    this.leaseFormError = '';
    this.leaseForm = { startDate: '', leaseDurationMonths: 11, leaseDurationDays: 0, endDate: '', leaseTermsAccepted: false };
    this.reviews = [];
    this.reviewError = '';
    document.body.style.overflow = 'auto';
  }
}
