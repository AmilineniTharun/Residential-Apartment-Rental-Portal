import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { LeaseService } from '../../services/lease.service';
import { FlatService } from '../../services/flat.service';
import { MaintenanceService, MaintenanceRequest } from '../../services/maintenance.service';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit {
  bookingService = inject(BookingService);
  paymentService = inject(PaymentService);
  leaseService = inject(LeaseService);
  flatService = inject(FlatService);
  maintenanceService = inject(MaintenanceService);

  activeTab: 'bookings' | 'payments' | 'lease' | 'maintenance' | 'amenities' = 'bookings';

  bookings: any[] = [];
  payments: any[] = [];

  bookingFilter: 'active' | 'past' = 'active';

  get filteredBookings() {
    if (this.bookingFilter === 'active') {
      return this.bookings.filter(b => ['pending', 'approved', 'rented'].includes(b.status));
    } else {
      return this.bookings.filter(b => ['rejected', 'vacated'].includes(b.status));
    }
  }

  vacateForm: { [bookingId: number]: string } = {};
  isSubmittingVacate = false;

  toggleVacateForm(bookingId: number) {
    if (this.vacateForm[bookingId] !== undefined) {
      delete this.vacateForm[bookingId];
    } else {
      this.vacateForm[bookingId] = '';
    }
  }

  submitVacateRequest(bookingId: number) {
    if (!this.vacateForm[bookingId]) {
      this.errorMessage = 'Please select a vacate date.';
      return;
    }
    this.isSubmittingVacate = true;
    this.leaseService.submitLeaseRequest(bookingId, 'vacate', undefined, this.vacateForm[bookingId]).subscribe({
      next: () => {
        this.isSubmittingVacate = false;
        delete this.vacateForm[bookingId];
        this.actionMessage = '✅ Vacate request submitted successfully.';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadMyBookings();
        this.loadMyLeaseRequests();
      },
      error: (err) => {
        this.isSubmittingVacate = false;
        this.errorMessage = err.error?.error || 'Failed to submit vacate request.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }
  leases: any[] = [];
  recommendations: any[] = [];
  recommendationReason = '';
  towerAmenityStatuses: any[] = [];

  maintenanceRequests: MaintenanceRequest[] = [];
  newMaintenanceIssue = '';
  newMaintenanceIssueType = '';
  selectedMaintenanceBookingId: number | null = null;
  isSubmittingMaintenance = false;

  // Feedback form state
  feedbackForm: { [id: number]: { rating: number, comment: string } } = {};
  isSubmittingFeedback = false;

  isLoading = true;
  errorMessage = '';
  actionMessage = '';

  // Lease request form state
  leaseRequests: any[] = [];
  showRequestForm: { [bookingId: number]: 'terminate' | 'extend' | null } = {};
  extendForm: { [bookingId: number]: { months: number | null, days: number | null, newEndDate: string } } = {};
  isSubmittingRequest = false;

  ngOnInit(): void {
    this.loadMyBookings();
    this.loadPayments();
    this.loadRecommendations();
    this.loadMaintenanceRequests();
    this.loadMyLeases();
    this.loadMyLeaseRequests();
    this.loadMyAmenityStatuses();
  }

  setTab(tab: 'bookings' | 'payments' | 'lease' | 'maintenance' | 'amenities'): void {
    this.activeTab = tab;
  }

  loadMyBookings(): void {
    this.isLoading = true;
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load your booking history.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadMyAmenityStatuses(): void {
    this.bookingService.getMyAmenityStatuses().subscribe({
      next: (data) => this.towerAmenityStatuses = data,
      error: (err) => console.error('Failed to load tower amenity statuses', err)
    });
  }

  loadMyLeases(): void {
    this.leaseService.getMyLeases().subscribe({
      next: (data) => this.leases = data,
      error: (err) => console.error('Failed to load leases', err)
    });
  }

  loadMyLeaseRequests(): void {
    this.leaseService.getMyLeaseRequests().subscribe({
      next: (data) => this.leaseRequests = data,
      error: (err) => console.error('Failed to load lease requests', err)
    });
  }

  toggleRequestForm(bookingId: number, type: 'terminate' | 'extend'): void {
    if (this.showRequestForm[bookingId] === type) {
      this.showRequestForm[bookingId] = null;
    } else {
      this.showRequestForm[bookingId] = type;
      if (type === 'extend') {
        const lease = this.leases.find(l => l.booking_id === bookingId);
        let currentEnd = '';
        if (lease && lease.end_date) {
          currentEnd = new Date(lease.end_date).toISOString().split('T')[0];
        }
        this.extendForm[bookingId] = {
          months: null,
          days: null,
          newEndDate: currentEnd
        };
      }
    }
  }

  recalculateExtension(bookingId: number): void {
    const lease = this.leases.find(l => l.booking_id === bookingId);
    if (!lease || !lease.end_date) return;

    // Parse the original end date
    const start = new Date(lease.end_date);

    // Add Months
    const months = Number(this.extendForm[bookingId]?.months) || 0;
    const days = Number(this.extendForm[bookingId]?.days) || 0;

    const newEnd = new Date(start);
    newEnd.setMonth(newEnd.getMonth() + months);
    newEnd.setDate(newEnd.getDate() + days);

    this.extendForm[bookingId].newEndDate = newEnd.toISOString().split('T')[0];
  }

  submitLeaseRequest(bookingId: number, type: 'terminate' | 'extend'): void {
    let extendDays: number | undefined;
    let newEndStr: string | undefined;

    if (type === 'extend') {
      const lease = this.leases.find(l => l.booking_id === bookingId);
      if (!lease || !lease.end_date) {
        this.errorMessage = 'Cannot extend lease with no current end date.';
        return;
      }

      const form = this.extendForm[bookingId];
      if (!form || !form.newEndDate) {
        this.errorMessage = 'Please provide a valid new end date for the extension.';
        return;
      }

      newEndStr = form.newEndDate;

      // Calculate Days difference for backward compatibility
      const sd = new Date(lease.end_date);
      const ed = new Date(newEndStr);
      extendDays = Math.round((ed.getTime() - sd.getTime()) / (1000 * 3600 * 24));

      if (extendDays <= 0) {
        this.errorMessage = 'New End Date must be after the current lease End Date.';
        return;
      }
    }

    this.isSubmittingRequest = true;
    this.leaseService.submitLeaseRequest(bookingId, type, extendDays, newEndStr).subscribe({
      next: () => {
        this.isSubmittingRequest = false;
        this.showRequestForm[bookingId] = null;
        this.actionMessage = type === 'terminate'
          ? '✅ Termination request submitted. Admin will review it shortly.'
          : `✅ Extension request to ${newEndStr} submitted. Admin will review it shortly.`;
        setTimeout(() => this.actionMessage = '', 6000);
        this.loadMyLeaseRequests();
      },
      error: (err) => {
        this.isSubmittingRequest = false;
        this.errorMessage = err.error?.error || 'Failed to submit request.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  hasPendingRequest(bookingId: number, type: string): boolean {
    return this.leaseRequests.some(r => r.booking_id === bookingId && r.request_type === type && r.status === 'pending');
  }

  loadPayments(): void {
    this.paymentService.getUserPayments().subscribe({
      next: (data) => this.payments = data,
      error: (err) => console.error('Failed to load payments', err)
    });
  }

  loadRecommendations(): void {
    this.flatService.getRecommendations().subscribe({
      next: (data) => {
        this.recommendations = data.recommendations || [];
        this.recommendationReason = data.reason || '';
      },
      error: (err) => console.error('Failed to load recommendations', err)
    });
  }

  payNow(bookingId: number): void {
    this.paymentService.processPayment(bookingId).subscribe({
      next: () => {
        this.actionMessage = 'Payment processed successfully!';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadPayments(); // Refresh payment list
        this.loadMyBookings(); // Refresh bookings list to update status
        this.setTab('payments'); // Switch to payments tab
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Payment failed';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  async downloadLease(bookingId: number): Promise<void> {
    try {
      const blob = await this.leaseService.downloadLease(bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Lease_Agreement_${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Download error:', err);
      this.errorMessage = 'Failed to download lease. Please try again.';
      setTimeout(() => this.errorMessage = '', 4000);
    }
  }

  loadMaintenanceRequests(): void {
    this.maintenanceService.getMyRequests().subscribe({
      next: (data) => this.maintenanceRequests = data.requests,
      error: (err) => console.error('Failed to load maintenance requests', err)
    });
  }

  submitMaintenance(): void {
    if (!this.newMaintenanceIssue.trim() || !this.selectedMaintenanceBookingId || !this.newMaintenanceIssueType) {
      this.errorMessage = 'Please select a unit, specify an issue type, and describe the issue.';
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }
    this.isSubmittingMaintenance = true;

    this.maintenanceService.submitRequest(this.selectedMaintenanceBookingId, this.newMaintenanceIssueType, this.newMaintenanceIssue).subscribe({
      next: (data) => {
        this.actionMessage = 'Maintenance request submitted successfully!';
        this.newMaintenanceIssue = '';
        this.newMaintenanceIssueType = '';
        this.selectedMaintenanceBookingId = null;
        this.loadMaintenanceRequests();
        this.isSubmittingMaintenance = false;
        setTimeout(() => this.actionMessage = '', 4000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to submit maintenance request.';
        this.isSubmittingMaintenance = false;
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  toggleFeedbackForm(id: number): void {
    if (this.feedbackForm[id]) {
      delete this.feedbackForm[id];
    } else {
      this.feedbackForm[id] = { rating: 5, comment: '' };
    }
  }

  submitMaintenanceFeedback(id: number): void {
    const form = this.feedbackForm[id];
    if (!form || !form.comment.trim()) {
      this.errorMessage = 'Please provide a comment for your feedback.';
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }

    this.isSubmittingFeedback = true;
    this.maintenanceService.submitFeedback(id, form.rating, form.comment).subscribe({
      next: () => {
        this.actionMessage = '✅ Thank you for your feedback!';
        delete this.feedbackForm[id];
        this.loadMaintenanceRequests();
        this.isSubmittingFeedback = false;
        setTimeout(() => this.actionMessage = '', 4000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to submit feedback.';
        this.isSubmittingFeedback = false;
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }
}
