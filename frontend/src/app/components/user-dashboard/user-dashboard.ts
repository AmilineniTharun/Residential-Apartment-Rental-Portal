import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { PaymentService } from '../../services/payment.service';
import { LeaseService } from '../../services/lease.service';
import { FlatService } from '../../services/flat.service';
import { MaintenanceService, MaintenanceRequest } from '../../services/maintenance.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit, OnDestroy {
  bookingService = inject(BookingService);
  paymentService = inject(PaymentService);
  leaseService = inject(LeaseService);
  flatService = inject(FlatService);
  maintenanceService = inject(MaintenanceService);

  activeTab: 'bookings' | 'payments' | 'lease' | 'maintenance' | 'amenities' = 'bookings';

  bookings: any[] = [];
  payments: any[] = [];
  paymentPeriod: 'this-month' | 'last-month' | 'all' = 'all';

  get filteredPayments() {
    if (this.paymentPeriod === 'all') return this.payments;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.payments.filter(p => {
      const pDate = new Date(p.payment_date);
      if (this.paymentPeriod === 'this-month') {
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      } else if (this.paymentPeriod === 'last-month') {
        let lastMonth = currentMonth - 1;
        let lastYear = currentYear;
        if (lastMonth < 0) {
          lastMonth = 11;
          lastYear--;
        }
        return pDate.getMonth() === lastMonth && pDate.getFullYear() === lastYear;
      }
      return true;
    });
  }

  bookingFilter: 'active' | 'past' = 'active';

  get filteredBookings() {
    if (this.bookingFilter === 'active') {
      return this.bookings.filter(b => ['pending', 'approved', 'rented'].includes(b.status));
    } else {
      return this.bookings.filter(b => ['rejected', 'vacated'].includes(b.status));
    }
  }

  get towerAlerts() {
    // Return unique inactive towers for active bookings
    const activeBookings = this.bookings.filter(b => ['pending', 'approved', 'rented'].includes(b.status));
    const inactiveTowers = activeBookings.filter(b => b.tower_status === 'inactive');

    // Return unique alerts by tower name
    const uniqueAlerts = Array.from(new Set(inactiveTowers.map(b => b.tower_name)))
      .map(name => {
        const booking = inactiveTowers.find(b => b.tower_name === name);
        return {
          towerName: name,
          reason: booking.inactive_reason
        };
      });
    return uniqueAlerts;
  }

  get daysRemainingInMonth(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }

  get hasUnpaidRent(): boolean {
    // Check if there are any CURRENT or FIRST month dues that are enabled
    return this.outstandingDues.some(due =>
      (due.type === 'Current Month Rent' || due.type === 'First Month Total') && due.is_enabled
    );
  }

  vacateForm: { [bookingId: number]: string } = {};
  vacateReason: { [bookingId: number]: string } = {};
  isSubmittingVacate = false;

  toggleVacateForm(bookingId: number) {
    if (this.vacateForm[bookingId] !== undefined) {
      delete this.vacateForm[bookingId];
      delete this.vacateReason[bookingId];
    } else {
      this.vacateForm[bookingId] = '';
      this.vacateReason[bookingId] = '';
    }
  }

  submitVacateRequest(bookingId: number) {
    if (!this.vacateForm[bookingId]) {
      this.errorMessage = 'Please select a vacate date.';
      return;
    }
    this.isSubmittingVacate = true;
    this.leaseService.submitLeaseRequest(bookingId, 'vacate', undefined, this.vacateForm[bookingId], this.vacateReason[bookingId]).subscribe({
      next: () => {
        this.isSubmittingVacate = false;
        delete this.vacateForm[bookingId];
        delete this.vacateReason[bookingId];
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

  showApprovalPopup = false;
  approvedBookingForPopup: any = null;

  isSidebarCollapsed = false;
  showMakePaymentForm = false;
  showMaintenanceForm = false;
  isProcessingDirectPayment = false;

  // Payment Timer (5-minute deadline after approval)
  paymentTimers: { [bookingId: number]: number } = {};   // seconds remaining
  paymentExpired: { [bookingId: number]: boolean } = {}; // whether expired
  private timerIntervals: { [bookingId: number]: any } = {};

  // Professional Dues
  outstandingDues: any[] = [];
  selectedDuesIndices: Set<number> = new Set();
  totalDuesAmount: number = 0;
  selectedPaymentBookingId: number | 'all' = 'all';

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMakePaymentForm(): void {
    this.showMakePaymentForm = !this.showMakePaymentForm;
    if (this.showMakePaymentForm) {
      this.loadDues();
    }
  }

  toggleMaintenanceForm(): void {
    this.showMaintenanceForm = !this.showMaintenanceForm;
  }

  loadDues(preSelectedBookingId?: number): void {
    console.log('Loading dues for booking:', preSelectedBookingId);
    this.paymentService.getDues().subscribe({
      next: (data) => {
        console.log('Dues data received:', data);
        this.outstandingDues = data;
        this.selectedDuesIndices.clear();

        if (preSelectedBookingId) {
          // If coming from "Pay Now", find default enabled items for this booking
          this.outstandingDues.forEach((due, index) => {
            if (due.booking_id === preSelectedBookingId && due.is_enabled) {
              this.selectedDuesIndices.add(index);
            }
          });
        } else {
          // Default: select all enabled items for convenience
          this.outstandingDues.forEach((due, index) => {
            if (due.is_enabled) {
              this.selectedDuesIndices.add(index);
            }
          });
        }
        this.calculateTotalDues();
      },
      error: (err) => console.error('Failed to load dues', err)
    });
  }

  toggleDueSelection(index: number): void {
    if (!this.isDueSelectable(index)) return;

    const due = this.outstandingDues[index];
    if (!due) return;

    if (this.selectedDuesIndices.has(index)) {
      // Unselecting
      this.selectedDuesIndices.delete(index);

      // Rule: If "Current Month" is unselected, also unselect "Last Month"
      if (due.type === 'Current Month Rent') {
        this.outstandingDues.forEach((d, i) => {
          if (d.booking_id === due.booking_id && d.type === 'Last Month Rent') {
            this.selectedDuesIndices.delete(i);
          }
        });
      }
    } else {
      // Selecting
      this.selectedDuesIndices.add(index);

      // Rule: If "Last Month" is selected, also select "Current Month"
      if (due.type === 'Last Month Rent') {
        this.outstandingDues.forEach((d, i) => {
          if (d.booking_id === due.booking_id && d.type === 'Current Month Rent') {
            this.selectedDuesIndices.add(i);
          }
        });
      }
    }
    this.calculateTotalDues();
  }

  isDueSelectable(index: number): boolean {
    const due = this.outstandingDues[index];
    if (!due) return false;

    // Leverage the backend flag directly for the 3 scenarios
    return !!due.is_enabled;
  }

  getFilteredDuesWithIndex(): any[] {
    const mapped = this.outstandingDues.map((due, index) => ({ ...due, originalIndex: index }));
    if (this.selectedPaymentBookingId === 'all') {
      return mapped;
    }
    return mapped.filter(item => item.booking_id === Number(this.selectedPaymentBookingId));
  }


  calculateTotalDues(): void {
    this.totalDuesAmount = this.outstandingDues.reduce((sum, due, i) => {
      return this.selectedDuesIndices.has(i) ? sum + Number(due.amount) : sum;
    }, 0);
  }

  async processDirectPayment(): Promise<void> {
    console.log('--- START processDirectPayment ---');
    if (!this.showMakePaymentForm) {
      console.error('CRITICAL: processDirectPayment called but showMakePaymentForm is false! Aborting.');
      return;
    }

    const selectedList = this.outstandingDues.filter((_, i) => this.selectedDuesIndices.has(i));
    console.log('Selected dues for payment:', selectedList);

    if (selectedList.length === 0) {
      this.errorMessage = 'Please select at least one item to pay.';
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }

    this.isProcessingDirectPayment = true;
    this.errorMessage = '';
    let successCount = 0;
    let failCount = 0;

    // Process each selected item sequentially
    for (const item of selectedList) {
      try {
        console.log('Processing payment for item:', item);
        // We use await with a Promise wrapper for the observable to ensure sequential processing
        await this.paymentService.processPayment(item.booking_id).toPromise();
        successCount++;
        console.log(`Payment successful for item related to booking ${item.booking_id}`);
      } catch (err: any) {
        console.error(`Payment failed for item related to booking ${item.booking_id}`, err);
        this.errorMessage = err.error?.error || err.error?.message || 'Failed to process payment.';
        failCount++;
      }
    }

    this.isProcessingDirectPayment = false;

    if (successCount > 0) {
      this.actionMessage = `✅ Handled ${successCount} payment(s) successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`;
      this.showMakePaymentForm = false;
      this.selectedDuesIndices.clear();
      this.loadPayments();
      this.loadMyBookings();
      this.calculateTotalDues();
      setTimeout(() => this.actionMessage = '', 6000);
    } else if (failCount > 0) {
      this.errorMessage = this.errorMessage || 'Failed to process payments. Please try again.';
      setTimeout(() => this.errorMessage = '', 5000);
    }

    console.log('--- END processDirectPayment ---');
  }

  // Lease request form state
  leaseRequests: any[] = [];
  showRequestForm: { [bookingId: number]: 'terminate' | 'extend' | null } = {};
  extendForm: { [bookingId: number]: { months: number | null, days: number | null, newEndDate: string } } = {};
  requestReason: { [bookingId: number]: string } = {};
  isSubmittingRequest = false;

  ngOnInit(): void {
    this.loadMyBookings();
    this.loadPayments();
    this.loadRecommendations();
    this.loadMaintenanceRequests();
    this.loadMyLeases();
    this.loadMyLeaseRequests();
    this.loadMyAmenityStatuses();
    this.loadDues();
  }

  ngOnDestroy(): void {
    this.stopAllTimers();
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
        // Start timers for all approved bookings
        this.stopAllTimers();
        const approvedBookings = data.filter((b: any) => b.status === 'approved');

        approvedBookings.forEach((b: any) => {
          this.startPaymentTimer(b.id);
        });

        // Show approval popup if any new approved booking found
        if (approvedBookings.length > 0) {
          this.checkApprovedBookings(approvedBookings);
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load your booking history.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  startPaymentTimer(bookingId: number): void {
    this.paymentService.getPaymentDeadline(bookingId).subscribe({
      next: (data: any) => {
        if (data.expired) {
          this.paymentTimers[bookingId] = 0;
          this.paymentExpired[bookingId] = true;
          // Reload bookings since it was expired server-side
          this.loadMyBookings();
          return;
        }
        this.paymentTimers[bookingId] = data.seconds_remaining;
        this.paymentExpired[bookingId] = false;
        // Clear any existing interval
        if (this.timerIntervals[bookingId]) clearInterval(this.timerIntervals[bookingId]);
        this.timerIntervals[bookingId] = setInterval(() => {
          if (this.paymentTimers[bookingId] > 0) {
            this.paymentTimers[bookingId]--;
          } else {
            clearInterval(this.timerIntervals[bookingId]);
            this.paymentExpired[bookingId] = true;
            // Call API to officially expire the booking
            this.paymentService.expireBooking(bookingId).subscribe({
              next: () => {
                this.actionMessage = '⚠️ Payment window expired. The booking has been cancelled and the unit is available again.';
                setTimeout(() => this.actionMessage = '', 7000);
                this.loadMyBookings();
              },
              error: () => this.loadMyBookings()
            });
          }
        }, 1000);
      },
      error: (err: any) => {
        console.error('Failed to fetch payment deadline', err);
      }
    });
  }

  stopAllTimers(): void {
    Object.values(this.timerIntervals).forEach(interval => clearInterval(interval));
    this.timerIntervals = {};
  }

  formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  checkApprovedBookings(approvedBookings: any[]): void {
    // Only show popup for the first approved booking that hasn't been shown in this session
    for (const booking of approvedBookings) {
      const storageKey = `approval_notified_${booking.id}`;
      if (!sessionStorage.getItem(storageKey)) {
        this.approvedBookingForPopup = booking;
        this.showApprovalPopup = true;
        // Mark as shown in this session immediately
        sessionStorage.setItem(storageKey, 'true');
        break;
      }
    }
  }

  calculateTotalInitialPayment(booking: any): number {
    if (!booking) return 0;
    const rent = Number(booking.price) || 0;
    const deposit = Number(booking.security_deposit) || 0;
    return rent + deposit;
  }

  closeApprovalPopup(): void {
    this.showApprovalPopup = false;
    // Don't nullify approvedBookingForPopup immediately to avoid race conditions with click handlers
    setTimeout(() => {
      if (!this.showApprovalPopup) {
        this.approvedBookingForPopup = null;
      }
    }, 500);
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
      delete this.requestReason[bookingId];
    } else {
      this.showRequestForm[bookingId] = type;
      this.requestReason[bookingId] = '';
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
    this.leaseService.submitLeaseRequest(bookingId, type, extendDays, newEndStr, this.requestReason[bookingId]).subscribe({
      next: () => {
        this.isSubmittingRequest = false;
        this.showRequestForm[bookingId] = null;
        delete this.requestReason[bookingId];
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

  initiatePaymentFlow(bookingId: number): void {
    console.log('--- START initiatePaymentFlow ---');
    console.log('Target BookingId:', bookingId);
    this.setTab('payments');
    this.showMakePaymentForm = true;
    this.selectedPaymentBookingId = bookingId; // Filter the payment form for this booking
    this.loadDues(bookingId);
    console.log('Tab set to payments, showMakePaymentForm=true, loadDues called.');

    // Smooth scroll to payment form
    setTimeout(() => {
      console.log('Scrolling to top...');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    console.log('--- END initiatePaymentFlow ---');
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
        this.showMaintenanceForm = false;
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
