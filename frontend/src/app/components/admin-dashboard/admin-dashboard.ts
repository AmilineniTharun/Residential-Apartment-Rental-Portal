import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { MaintenanceService, MaintenanceRequest } from '../../services/maintenance.service';
import { LeaseService } from '../../services/lease.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  adminService = inject(AdminService);
  maintenanceService = inject(MaintenanceService);
  leaseService = inject(LeaseService);

  activeTab: 'overview' | 'units' | 'amenities' | 'towers' | 'leases' | 'bookings' | 'maintenance' | 'audit' | 'payments' = 'overview';

  reports: any = null;
  stats: any = {
    totalUnits: 0,
    availableUnits: 0,
    pendingBookings: 0,
    totalTenants: 0,
    totalTowers: 0,
    revenue: 0
  };
  amenities: any[] = [];
  towers: any[] = [];
  units: any[] = [];
  bookings: any[] = [];
  leases: any[] = [];
  maintenanceRequests: MaintenanceRequest[] = [];
  users: any[] = [];
  payments: any[] = [];
  selectedTowerFilter: string | null = null;
  bookingStatusFilter: 'all' | 'approved' | 'pending' | 'rejected' | 'vacated' | 'rented' | 'options' = 'all';

  // Refined Filters
  leaseStatusFilter: 'all' | 'active' | 'past' = 'all';
  leaseTowerFilter: string = '';
  leaseFloorFilter: number | null = null;
  bookingTowerFilter: string = '';
  bookingFloorFilter: number | null = null;

  // Stats Toggles
  showLeaseStats: boolean = false;
  showBookingStats: boolean = false;
  showUnitFilters: boolean = false;

  // Unit Filters
  unitTowerFilter: string = '';
  unitFloorFilter: number | null = null;
  unitStatusFilter: string = 'all';

  // Sidebar & Visuals
  isSidebarCollapsed = false;
  towerFilterTab: 'active' | 'inactive' = 'active';
  showVisualization = false;
  analyticsPeriod: 'day' | 'week' | 'month' | 'year' = 'month';
  analyticsTab: 'income' | 'bookings' = 'income';
  selectedAnalyticsYear: number = 0;
  selectedAnalyticsMonth: number = 0;
  availableYears: number[] = [];
  selectedUserHistory: any = null;
  showHistoryModal = false;
  isHistoryLoading = false;
  showDetailModal = false;
  detailModalTitle = '';
  detailModalContent = '';
  activeActionUnitId: number | null = null;
  showResidentModal = false;
  isResidentLoading = false;
  selectedResidentData: any = null;

  viewResidentDetails(unitId: number): void {
    this.isResidentLoading = true;
    this.showResidentModal = true;
    this.selectedResidentData = null;
    this.adminService.getUnitOccupant(unitId).subscribe({
      next: (data) => {
        this.selectedResidentData = data;
        this.isResidentLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load resident details.';
        this.isResidentLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  // Booking Detail Modal
  showBookingDetailModal = false;
  isBookingDetailsLoading = false;
  selectedBookingDetails: any = null;

  viewBookingDetails(bookingId: number): void {
    this.isBookingDetailsLoading = true;
    this.showBookingDetailModal = true;
    this.selectedBookingDetails = null;

    this.adminService.getBookingDetails(bookingId).subscribe({
      next: (data) => {
        console.log('Booking details loaded:', data);
        this.selectedBookingDetails = data;
        this.isBookingDetailsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load booking details:', err);
        this.errorMessage = 'Failed to load booking details.';
        this.isBookingDetailsLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  closeBookingDetailModal(): void {
    this.showBookingDetailModal = false;
    this.selectedBookingDetails = null;
  }

  closeResidentModal(): void {
    this.showResidentModal = false;
    this.selectedResidentData = null;
  }

  // Audit Filters
  auditTowerFilter: string = '';
  auditFloorFilter: number | null = null;
  isAddingAmenity = false;

  // Payment Filters
  paymentTowerFilter: string = '';
  paymentFloorFilter: number | null = null;
  months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  Math: any = Math;

  isLoading = true;
  errorMessage = '';
  actionMessage = '';

  // Lease action state
  leaseRequests: any[] = [];
  leaseActionForm: { [bookingId: number]: 'terminate' | 'extend' | null } = {};
  leaseActionDate: { [bookingId: number]: string } = {};
  reqApproveDate: { [reqId: number]: string } = {};
  isLeaseActing = false;
  serviceDateForm: { [reqId: number]: string } = {};
  adminNoteForm: { [reqId: number]: string } = {};
  selectedAmenityTowerId: number | null = null;
  selectedAmenityId: number | null = null;
  amenityStatus: string = 'Open';
  isUpdatingStatus: boolean = false;
  towerAmenityStatuses: any[] = [];

  get pendingLeaseRequests(): number {
    return this.leaseRequests.filter(r => r.status === 'pending').length;
  }

  INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Lakshadweep', 'Puducherry'
  ];

  CITIES_BY_STATE: { [state: string]: string[] } = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Nellore', 'Rajahmundry', 'Kurnool'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'],
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg'],
    'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Hisar'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Navi Mumbai'],
    'Manipur': ['Imphal'],
    'Meghalaya': ['Shillong', 'Tura'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Berhampur', 'Rourkela', 'Sambalpur'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Secunderabad'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Noida', 'Ghaziabad'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
    'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Lajpat Nagar', 'Connaught Place', 'Karol Bagh', 'Janakpuri'],
    'Chandigarh': ['Chandigarh', 'Panchkula', 'Mohali'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Mahe'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun'],
    'Mizoram': ['Aizawl', 'Lunglei'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Sikkim': ['Gangtok', 'Namchi'],
    'Tripura': ['Agartala', 'Udaipur'],
    'Lakshadweep': ['Kavaratti'],
    'Andaman and Nicobar Islands': ['Port Blair'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa']
  };

  get citiesForSelectedState(): string[] {
    return this.CITIES_BY_STATE[this.newTower.state] || [];
  }

  onTowerStateChange(): void {
    this.newTower.city = '';
  }

  formatTowerLocation(tower: any): string {
    const parts = [tower.street, tower.area, tower.city, tower.state].filter(p => !!p);
    return parts.join(', ') || '-';
  }

  newTower = { name: '', floors: '', description: '', state: '', city: '', area: '', street: '', units_per_floor: null as number | null };
  newAmenity = { name: '', description: '' };

  isAddingTower = false;
  isAddingUnit = false;
  isEditingUnit = false;
  editingUnitId: number | null = null;
  isEditingTower = false;
  editingTowerId: number | null = null;

  toggleTowerForm(): void {
    if (this.isAddingTower) {
      this.resetTowerForm();
    } else {
      this.isAddingTower = true;
      this.isEditingTower = false;
    }
  }
  newUnit = {
    tower_id: '',
    unit_number: '',
    floor: null as number | null,
    wing: '',
    bhk: null as number | null,
    price: null as number | null,
    security_deposit: null as number | null,
    description: '',
    location: '',
    amenity_ids: [] as number[]
  };
  selectedFiles: File[] = [];
  defaultImageIndex: number = 0; // The index of the primary image
  isDragging: boolean = false; // To handle UI styling

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.selectedFiles = Array.from(event.dataTransfer.files);
      this.defaultImageIndex = 0; // Reset primary index to the first file
    }
  }

  onFilesSelected(event: any) {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
      this.defaultImageIndex = 0; // Reset primary index to the first file
    }
  }

  setDefaultImage(index: number) {
    this.defaultImageIndex = index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngOnInit(): void {
    this.loadData();
    this.loadLeaseRequests();
  }

  setTab(tab: 'overview' | 'units' | 'amenities' | 'towers' | 'leases' | 'bookings' | 'maintenance' | 'audit' | 'payments') {
    this.activeTab = tab as any;
  }

  loadData(): void {
    this.isLoading = true;
    this.adminService.getReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.stats = {
          totalUnits: data.occupancy?.total_units || 0,
          availableUnits: (data.occupancy?.total_units || 0) - (data.occupancy?.rented_units || 0),
          pendingBookings: data.booking_stats?.find((s: any) => s.status === 'pending')?.count || 0,
          totalTenants: data.tenants?.total_tenants || 0,
          totalTowers: data.towers_count?.total_towers || 0,
          revenue: data.revenue?.expected_monthly_revenue || 0,
          totalDeposit: data.revenue?.total_deposit_amount || 0
        };
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });

    this.adminService.getTowers().subscribe(data => {
      this.towers = (data.towers || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    this.adminService.getAmenities().subscribe(data => this.amenities = data.amenities || []);
    this.adminService.getUnits().subscribe(data => this.units = data.data || []);
    this.adminService.getBookings().subscribe(data => {
      this.bookings = data || [];
      this.updateAvailableYears();
    });
    this.adminService.getLeases().subscribe(data => {
      this.leases = data.leases || [];
      this.updateAvailableYears();
    });

    this.adminService.getUsers().subscribe(data => {
      this.users = data || [];
    });

    this.adminService.getPayments().subscribe(data => {
      this.payments = data || [];
      this.updateAvailableYears();
    });

    this.maintenanceService.getAllRequests().subscribe({
      next: (data) => this.maintenanceRequests = data.requests || [],
      error: (err) => console.error('Failed to load maintenance requests', err)
    });
  }

  setTowerFilterTab(tab: 'active' | 'inactive'): void {
    this.towerFilterTab = tab;
  }

  get filteredTowers(): any[] {
    return this.towers.filter(t => (t.status || 'active') === this.towerFilterTab);
  }

  toggleTowerStatus(towerId: number, currentStatus: string): void {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const confirmMsg = newStatus === 'inactive'
      ? 'Are you sure you want to deactivate this tower? New bookings will be blocked and tenants will be notified.'
      : 'Are you sure you want to activate this tower?';

    if (confirm(confirmMsg)) {
      this.adminService.toggleTowerStatus(towerId, newStatus).subscribe({
        next: () => {
          this.actionMessage = `✅ Tower ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`;
          this.loadData();
          setTimeout(() => this.actionMessage = '', 4000);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Failed to update tower status.';
          setTimeout(() => this.errorMessage = '', 4000);
        }
      });
    }
  }

  viewTowerUnits(towerName: string): void {
    this.selectedTowerFilter = towerName;
    this.activeTab = 'units';
  }

  clearTowerFilter(): void {
    this.selectedTowerFilter = null;
    this.unitTowerFilter = '';
  }

  openDetailModal(title: string, content: string): void {
    this.detailModalTitle = title;
    this.detailModalContent = content;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailModalTitle = '';
    this.detailModalContent = '';
  }

  toggleActions(unitId: number): void {
    this.activeActionUnitId = this.activeActionUnitId === unitId ? null : unitId;
  }

  get filteredUnits(): any[] {
    let filtered = this.units;

    // Tower Filter
    if (this.unitTowerFilter || this.selectedTowerFilter) {
      const tower = this.unitTowerFilter || this.selectedTowerFilter;
      filtered = filtered.filter(u => u.tower_name == tower);
    }

    // Floor Filter
    if (this.unitFloorFilter !== null) {
      filtered = filtered.filter(u => u.floor == this.unitFloorFilter);
    }

    // Status Filter
    if (this.unitStatusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === this.unitStatusFilter);
    }

    return filtered;
  }

  setUnitTowerFilter(tower: string): void {
    this.unitTowerFilter = tower;
  }

  setUnitFloorFilter(floor: any): void {
    this.unitFloorFilter = (floor === 'null' || floor === null || floor === '') ? null : Number(floor);
  }

  setUnitStatusFilter(status: string): void {
    this.unitStatusFilter = status;
  }

  get unitStatusCounts() {
    // First, filter units by Tower and Floor only
    let baseFiltered = this.units;
    if (this.unitTowerFilter || this.selectedTowerFilter) {
      const tower = this.unitTowerFilter || this.selectedTowerFilter;
      baseFiltered = baseFiltered.filter(u => u.tower_name == tower);
    }
    if (this.unitFloorFilter !== null) {
      baseFiltered = baseFiltered.filter(u => u.floor == this.unitFloorFilter);
    }

    // Now count statuses within this base filtered set
    return {
      all: baseFiltered.length,
      available: baseFiltered.filter(u => u.status === 'available').length,
      rented: baseFiltered.filter(u => u.status === 'rented').length,
      booked: baseFiltered.filter(u => u.status === 'booked').length,
      pending: baseFiltered.filter(u => u.status === 'pending').length,
      under_maintenance: baseFiltered.filter(u => u.status === 'under_maintenance').length
    };
  }

  get filteredBookings(): any[] {
    let filtered = this.bookings;

    // Status Filter
    if (this.bookingStatusFilter !== 'all') {
      if (this.bookingStatusFilter === 'options') return [];
      filtered = filtered.filter(b => b.status === this.bookingStatusFilter);
    }

    // Tower Filter
    if (this.bookingTowerFilter) {
      filtered = filtered.filter(b => b.tower_name == this.bookingTowerFilter);
    }

    // Floor Filter
    if (this.bookingFloorFilter !== null) {
      filtered = filtered.filter(b => b.floor == this.bookingFloorFilter);
    }

    return filtered;
  }

  get filteredUsers(): any[] {
    let filtered = this.users;

    // Tower Filter
    if (this.auditTowerFilter) {
      filtered = filtered.filter(u => u.tower_name == this.auditTowerFilter);
    }

    // Floor Filter
    if (this.auditFloorFilter !== null) {
      filtered = filtered.filter(u => u.floor == this.auditFloorFilter);
    }

    return filtered;
  }

  get filteredPayments(): any[] {
    let filtered = this.payments;

    if (this.paymentTowerFilter) {
      filtered = filtered.filter(p => p.tower_name == this.paymentTowerFilter);
    }

    if (this.paymentFloorFilter !== null) {
      filtered = filtered.filter(p => p.floor == this.paymentFloorFilter);
    }

    return filtered;
  }

  get filteredLeases(): any[] {
    let filtered = this.leases;

    // Status Filter
    if (this.leaseStatusFilter === 'active') {
      // Logic for active leases (e.g., end_date > now or no end_date yet)
      const now = new Date();
      filtered = filtered.filter(l => !l.end_date || new Date(l.end_date) >= now);
    } else if (this.leaseStatusFilter === 'past') {
      const now = new Date();
      filtered = filtered.filter(l => l.end_date && new Date(l.end_date) < now);
    }

    // Tower Filter
    if (this.leaseTowerFilter) {
      filtered = filtered.filter(l => l.tower_name == this.leaseTowerFilter);
    }

    // Floor Filter
    if (this.leaseFloorFilter !== null) {
      filtered = filtered.filter(l => l.floor == this.leaseFloorFilter);
    }

    return filtered;
  }

  get leasesWithDates(): number {
    return this.leases.filter(l => l.start_date && l.end_date).length;
  }

  get leasesPendingDates(): number {
    return this.leases.filter(l => !l.start_date || !l.end_date).length;
  }

  setBookingFilter(filter: 'all' | 'approved' | 'pending' | 'rejected' | 'vacated' | 'rented' | 'options'): void {
    this.bookingStatusFilter = filter;
  }

  // Count Getters for Statistics
  get activeLeaseCount(): number {
    const now = new Date();
    return this.leases.filter(l => !l.end_date || new Date(l.end_date) >= now).length;
  }

  get pastLeaseCount(): number {
    const now = new Date();
    return this.leases.filter(l => l.end_date && new Date(l.end_date) < now).length;
  }

  get pendingLeaseCount(): number {
    return this.leaseRequests.filter(r => r.status === 'pending').length;
  }

  get rentedBookingCount(): number {
    return this.bookings.filter(b => b.status === 'rented').length;
  }

  get vacatedBookingCount(): number {
    return this.bookings.filter(b => b.status === 'vacated').length;
  }

  get rejectedBookingCount(): number {
    return this.bookings.filter(b => b.status === 'rejected').length;
  }

  get approvedBookingCount(): number {
    return this.bookings.filter(b => b.status === 'approved').length;
  }

  get pendingBookingCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }

  setLeaseStatusFilter(status: 'all' | 'active' | 'past'): void {
    this.leaseStatusFilter = status;
  }

  setLeaseTowerFilter(tower: string): void {
    this.leaseTowerFilter = tower || '';
  }

  setLeaseFloorFilter(floor: any): void {
    this.leaseFloorFilter = (floor === 'null' || floor === null || floor === '') ? null : Number(floor);
  }

  setBookingTowerFilter(tower: string): void {
    this.bookingTowerFilter = tower || '';
  }

  setBookingFloorFilter(floor: any): void {
    this.bookingFloorFilter = (floor === 'null' || floor === null || floor === '') ? null : Number(floor);
  }

  // Audit Filter Setters

  // Audit Filter Setters
  setAuditTowerFilter(tower: string): void {
    this.auditTowerFilter = tower || '';
  }

  setAuditFloorFilter(floor: any): void {
    this.auditFloorFilter = (floor === 'null' || floor === null || floor === '') ? null : Number(floor);
  }

  toggleUnitFilters(): void {
    this.showUnitFilters = !this.showUnitFilters;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleVisualization(): void {
    this.showVisualization = !this.showVisualization;
  }

  toggleAmenityForm(): void {
    this.isAddingAmenity = !this.isAddingAmenity;
    if (!this.isAddingAmenity) {
      this.newAmenity = { name: '', description: '' };
    }
  }

  setAnalyticsTab(tab: 'income' | 'bookings'): void {
    this.analyticsTab = tab;
  }

  toggleLeaseStats(): void {
    this.showLeaseStats = !this.showLeaseStats;
  }

  toggleBookingStats(): void {
    this.showBookingStats = !this.showBookingStats;
  }

  onAmenityTowerChange(): void {
    if (!this.selectedAmenityTowerId) {
      this.towerAmenityStatuses = [];
      return;
    }
    this.adminService.getTowerAmenityStatus(this.selectedAmenityTowerId).subscribe(data => {
      this.towerAmenityStatuses = data.statuses || [];
    });
  }

  updateAmenityStatus(): void {
    if (!this.selectedAmenityTowerId || !this.selectedAmenityId) return;
    this.isUpdatingStatus = true;
    const data = {
      tower_id: this.selectedAmenityTowerId,
      amenity_id: this.selectedAmenityId,
      status: this.amenityStatus
    };
    this.adminService.updateTowerAmenityStatus(data)
      .subscribe({
        next: () => {
          this.isUpdatingStatus = false;
          this.actionMessage = 'Amenity status updated successfully!';
          this.onAmenityTowerChange();
          setTimeout(() => this.actionMessage = '', 3000);
        },
        error: () => this.isUpdatingStatus = false
      });
  }

  toggleLeaseAction(bookingId: number, action: 'terminate' | 'extend'): void {
    if (this.leaseActionForm[bookingId] === action) {
      this.leaseActionForm[bookingId] = null;
    } else {
      this.leaseActionForm[bookingId] = action;
      this.leaseActionDate[bookingId] = '';
    }
  }

  doAdminExtend(bookingId: number): void {
    const date = this.leaseActionDate[bookingId];
    if (!date) return;
    this.isLeaseActing = true;
    this.leaseService.adminExtendLease(bookingId, date).subscribe({
      next: () => {
        this.isLeaseActing = false;
        this.leaseActionForm[bookingId] = null;
        this.actionMessage = 'Lease extended successfully!';
        this.loadLeaseRequests();
        this.loadData();
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: () => this.isLeaseActing = false
    });
  }

  doAdminTerminate(bookingId: number): void {
    const date = this.leaseActionDate[bookingId];
    if (!date) return;
    this.isLeaseActing = true;
    this.leaseService.adminTerminateLease(bookingId, date).subscribe({
      next: () => {
        this.isLeaseActing = false;
        this.leaseActionForm[bookingId] = null;
        this.actionMessage = 'Lease terminated successfully!';
        this.loadLeaseRequests();
        this.loadData();
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: () => this.isLeaseActing = false
    });
  }

  approveLeaseReq(id: number, date: string): void {
    this.leaseService.approveLeaseRequest(id, date).subscribe({
      next: () => {
        this.actionMessage = 'Request approved!';
        this.loadLeaseRequests();
        this.loadData();
        setTimeout(() => this.actionMessage = '', 3000);
      }
    });
  }

  rejectLeaseReq(id: number): void {
    this.leaseService.rejectLeaseRequest(id).subscribe({
      next: () => {
        this.actionMessage = 'Request rejected!';
        this.loadLeaseRequests();
        setTimeout(() => this.actionMessage = '', 3000);
      }
    });
  }

  assignServiceDate(reqId: number): void {
    const localDate = this.serviceDateForm[reqId];
    const note = this.adminNoteForm[reqId];
    if (!localDate) {
      this.errorMessage = 'Please select a date and time first.';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    console.log('Scheduling service for Request ID:', reqId, 'Local Selection:', localDate);

    // Convert local datetime-local string (YYYY-MM-DDTHH:mm) to UTC ISO string
    // Angular's datetime-local input provides a string in local time format without a timezone.
    // By creating a new Date() and calling toISOString(), we normalize it to UTC.
    const dateObj = new Date(localDate);
    if (isNaN(dateObj.getTime())) {
      this.errorMessage = 'Invalid date selected.';
      return;
    }
    const utcDate = dateObj.toISOString();

    this.maintenanceService.updateRequestStatus(reqId, undefined, utcDate, note).subscribe({
      next: () => {
        this.actionMessage = 'Service scheduled successfully!';
        this.loadData();
        setTimeout(() => this.actionMessage = '', 3000);
        // Clear the form entry
        delete this.serviceDateForm[reqId];
        delete this.adminNoteForm[reqId];
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to schedule service.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  loadLeaseRequests(): void {
    this.leaseService.getLeaseRequests().subscribe(data => {
      this.leaseRequests = data || [];
    });
  }

  updateAvailableYears(): void {
    const years = new Set<number>();
    const now = new Date().getFullYear();
    years.add(now);

    [...this.bookings, ...this.leases].forEach(item => {
      const date = new Date(item.booking_date);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  getWeekOfMonth(date: Date): number {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    return Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);
  }

  abs(n: number): number {
    return Math.abs(n || 0);
  }

  get analyticsData(): {
    income: number[];
    labels: string[];
    bookings: number[];
    vacated: number[];
    trends: { income: number; activity: number };
    maxIncome: number;
    maxCombined: number;
  } {
    const data = {
      income: [] as number[],
      labels: [] as string[],
      bookings: [] as number[],
      vacated: [] as number[],
      trends: { income: 0, activity: 0 },
      maxIncome: 1000,
      maxCombined: 1
    };

    const buckets: any = {};

    if (this.selectedAnalyticsYear !== 0 && this.selectedAnalyticsMonth !== 0) {
      const daysInMonth = new Date(this.selectedAnalyticsYear, this.selectedAnalyticsMonth, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const label = d.toString().padStart(2, '0');
        data.labels.push(label);
        buckets[label] = { income: 0, bookings: 0, vacated: 0 };
      }
      this.processItemsIntoBuckets(buckets, (d) => {
        if (d.getFullYear() == this.selectedAnalyticsYear && (d.getMonth() + 1) == this.selectedAnalyticsMonth) {
          return d.getDate().toString().padStart(2, '0');
        }
        return null;
      });
    } else if (this.selectedAnalyticsYear !== 0) {
      this.months.forEach(m => {
        const label = m.label;
        data.labels.push(label);
        buckets[label] = { income: 0, bookings: 0, vacated: 0 };
      });
      this.processItemsIntoBuckets(buckets, (d) => {
        if (d.getFullYear() == this.selectedAnalyticsYear) {
          return this.months[d.getMonth()].label;
        }
        return null;
      });
    } else {
      this.availableYears.slice().reverse().forEach(y => {
        const label = y.toString();
        data.labels.push(label);
        buckets[label] = { income: 0, bookings: 0, vacated: 0 };
      });
      this.processItemsIntoBuckets(buckets, (d) => d.getFullYear().toString());
    }

    data.labels.forEach((label: string) => {
      data.income.push(Number(buckets[label].income) || 0);
      data.bookings.push(Number(buckets[label].bookings) || 0);
      data.vacated.push(Number(buckets[label].vacated) || 0);
    });

    if (data.income.length >= 2) {
      const currInc = data.income[data.income.length - 1];
      const prevInc = data.income[data.income.length - 2];
      data.trends.income = prevInc === 0 ? (currInc > 0 ? 100 : 0) : Math.round(((currInc - prevInc) / prevInc) * 100);

      const currAct = data.bookings[data.bookings.length - 1] + data.vacated[data.vacated.length - 1];
      const prevAct = data.bookings[data.bookings.length - 2] + data.vacated[data.vacated.length - 2];
      data.trends.activity = prevAct === 0 ? (currAct > 0 ? 100 : 0) : Math.round(((currAct - prevAct) / prevAct) * 100);
    }

    data.maxIncome = Math.max(...data.income, 1000);
    data.maxCombined = Math.max(...data.bookings, ...data.vacated, 1);
    return data;
  }

  private processItemsIntoBuckets(buckets: any, labelFn: (d: Date) => string | null): void {
    this.payments.forEach(p => {
      const d = new Date(p.payment_date);
      const label = labelFn(d);
      if (label && buckets[label]) {
        const amount = parseFloat(p.amount as any);
        if (!isNaN(amount)) {
          buckets[label].income = (Number(buckets[label].income) || 0) + amount;
        }
      }
    });

    this.bookings.forEach(b => {
      const d = new Date(b.booking_date);
      const label = labelFn(d);
      if (label && buckets[label]) {
        if (b.status === 'vacated') buckets[label].vacated++;
        else if (['approved', 'rented'].includes(b.status)) buckets[label].bookings++;
      }
    });
  }

  getMax(arr: number[]): number {
    return Math.max(...arr, 1);
  }

  onTowerChange(): void {
    if (!this.newUnit.tower_id) return;

    const selectedTower = this.towers.find(t => t.id == this.newUnit.tower_id);
    if (selectedTower) {
      if (!this.newUnit.description) {
        this.newUnit.description = selectedTower.description || '';
      }
      // Auto-populate location from tower
      const parts = [selectedTower.street, selectedTower.area, selectedTower.city, selectedTower.state].filter(p => !!p);
      this.newUnit.location = parts.join(', ');
      // Reset floor and unit number suggestion when tower changes
      this.newUnit.floor = null;
      this.newUnit.wing = '';
      this.newUnit.unit_number = '';
    }
  }

  get selectedTowerForUnit(): any {
    if (!this.newUnit.tower_id) return null;
    return this.towers.find(t => t.id == this.newUnit.tower_id) || null;
  }

  get floorOptions(): number[] {
    const tower = this.selectedTowerForUnit;
    if (!tower || !tower.floors) return [];
    return Array.from({ length: tower.floors }, (_, i) => i + 1);
  }

  onFloorOrWingChange(): void {
    if (this.newUnit.floor) {
      const wingPrefix = this.newUnit.wing ? `-${this.newUnit.wing[0].toUpperCase()}` : '';
      const unitsOnFloor = (this.selectedTowerForUnit?.units_per_floor || 4);
      this.newUnit.unit_number = `${this.newUnit.floor}${wingPrefix}01`;
    }
  }

  insertLink(type: 'tower' | 'unit'): void {
    const textareaId = type === 'tower' ? 'towerDescription' : 'unitDescription';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (!selectedText) {
      alert('Please select some text first to insert a link.');
      return;
    }

    let url = prompt('Enter Google Maps or any URL:');
    if (url) {
      url = url.trim();
      if (!url) return;

      // Ensure it has a protocol
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const linkHtml = `<a href="${url}" target="_blank" class="text-indigo-600 hover:underline font-medium">${selectedText}</a>`;
      const newValue = textarea.value.substring(0, start) + linkHtml + textarea.value.substring(end);

      if (type === 'tower') {
        this.newTower.description = newValue;
      } else {
        this.newUnit.description = newValue;
      }
    }
  }

  addTower(): void {
    if (!this.newTower.name || !this.newTower.floors) return;

    const towerData = {
      name: this.newTower.name,
      floors: parseInt(this.newTower.floors),
      description: this.newTower.description,
      state: this.newTower.state,
      city: this.newTower.city,
      area: this.newTower.area,
      street: this.newTower.street,
      units_per_floor: this.newTower.units_per_floor
    };

    const request = this.isEditingTower && this.editingTowerId
      ? this.adminService.updateTower(this.editingTowerId, towerData)
      : this.adminService.addTower(towerData);

    request.subscribe({
      next: () => {
        this.actionMessage = this.isEditingTower ? 'Tower updated successfully!' : 'Tower added successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.resetTowerForm();
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || (this.isEditingTower ? 'Failed to update tower.' : 'Failed to add tower.');
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  editTower(tower: any): void {
    this.isAddingTower = true;
    this.isEditingTower = true;
    this.editingTowerId = tower.id;
    this.newTower = {
      name: tower.name,
      floors: tower.floors.toString(),
      description: tower.description || '',
      state: tower.state || '',
      city: tower.city || '',
      area: tower.area || '',
      street: tower.street || '',
      units_per_floor: tower.units_per_floor || null
    };

    // Scroll to form
    const formElement = document.querySelector('form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  cancelTowerEdit(): void {
    this.resetTowerForm();
  }

  resetTowerForm(): void {
    this.isAddingTower = false;
    this.isEditingTower = false;
    this.editingTowerId = null;
    this.newTower = { name: '', floors: '', description: '', state: '', city: '', area: '', street: '', units_per_floor: null };
  }

  addAmenity(): void {
    if (!this.newAmenity.name) return;
    this.adminService.addAmenity(this.newAmenity).subscribe({
      next: () => {
        this.actionMessage = 'Amenity added successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
        this.newAmenity = { name: '', description: '' };
      },
      error: (err) => this.errorMessage = 'Failed to add amenity.'
    });
  }

  deleteAmenity(id: number): void {
    if (!confirm('Are you sure you want to delete this amenity? This will remove it from all units.')) return;
    this.adminService.deleteAmenity(id).subscribe({
      next: () => {
        this.actionMessage = 'Amenity deleted successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = 'Failed to delete amenity.'
    });
  }

  // Amenity Status Management consolidated above

  toggleForm(): void {
    this.isAddingUnit = !this.isAddingUnit;
    if (!this.isAddingUnit) {
      this.isEditingUnit = false;
      this.editingUnitId = null;
      this.newUnit = { tower_id: '', unit_number: '', floor: null, wing: '', bhk: null, price: null, security_deposit: null, description: '', location: '', amenity_ids: [] };
      this.selectedFiles = [];
    }
  }

  editUnit(unit: any): void {
    this.isEditingUnit = true;
    this.editingUnitId = unit.id;
    this.isAddingUnit = true; // Show the form area

    // Use tower_id directly from unit data (returned by GET /flats)
    const towerId = unit.tower_id ? unit.tower_id.toString() : (this.towers.find((t: any) => t.name === unit.tower_name)?.id?.toString() || '');

    this.newUnit = {
      tower_id: towerId,
      unit_number: unit.unit_number,
      floor: unit.floor ?? null,
      wing: unit.wing || '',
      bhk: unit.bhk,
      price: unit.price,
      security_deposit: unit.security_deposit ?? null,
      description: unit.description || '',
      location: unit.location || '',
      amenity_ids: unit.amenities
        ? this.amenities.filter((a: any) => unit.amenities.includes(a.name)).map((a: any) => a.id)
        : []
    };

    // If location is not saved in unit, auto-fill from tower
    if (!this.newUnit.location && towerId) {
      const tower = this.towers.find((t: any) => t.id == towerId);
      if (tower) {
        const parts = [tower.street, tower.area, tower.city, tower.state].filter((p: string) => !!p);
        this.newUnit.location = parts.join(', ');
      }
    }

    this.selectedFiles = []; // Clear file selection for edits
    this.defaultImageIndex = 0;
  }

  addUnit(): void {
    // Validate required fields only for NEW units. For edits, we allow partial updates.
    if (!this.isEditingUnit) {
      if (!this.newUnit.tower_id || !this.newUnit.unit_number || !this.newUnit.bhk || !this.newUnit.price || this.selectedFiles.length === 0) {
        this.errorMessage = 'Please fill all required fields and upload at least one image.';
        return;
      }
    } else {
      // For edits, we just need the tower_id and unit_number to ensure consistency if those are changed,
      // but the backend handles defaults if they are missing.
      // Small check to ensure we don't send empty strings for numeric fields if they were intentionally cleared
      if (this.newUnit.unit_number === '') {
        this.errorMessage = 'Unit number cannot be empty.';
        return;
      }
    }

    const formData = new FormData();
    if (this.newUnit.tower_id) formData.append('tower_id', this.newUnit.tower_id);
    if (this.newUnit.unit_number) formData.append('unit_number', this.newUnit.unit_number);
    if (this.newUnit.bhk !== null && this.newUnit.bhk !== undefined) formData.append('bhk', this.newUnit.bhk.toString());
    if (this.newUnit.price !== null && this.newUnit.price !== undefined) formData.append('price', this.newUnit.price.toString());
    if (this.newUnit.security_deposit !== null && this.newUnit.security_deposit !== undefined) formData.append('security_deposit', this.newUnit.security_deposit.toString());
    if (this.newUnit.description !== undefined) formData.append('description', this.newUnit.description || '');
    if (this.newUnit.floor !== null && this.newUnit.floor !== undefined) formData.append('floor', this.newUnit.floor.toString());
    if (this.newUnit.wing) formData.append('wing', this.newUnit.wing);
    if (this.newUnit.location) formData.append('location', this.newUnit.location);

    formData.append('default_image_index', this.defaultImageIndex.toString());

    if (this.newUnit.amenity_ids) {
      this.newUnit.amenity_ids.forEach(id => {
        formData.append('amenity_ids', id.toString());
      });
    }

    // Attach new images if provided during create or edit
    this.selectedFiles.forEach((file: File) => {
      formData.append('images', file, file.name);
    });

    const request = this.isEditingUnit && this.editingUnitId
      ? this.adminService.updateUnit(this.editingUnitId, formData)
      : this.adminService.addUnit(formData);

    request.subscribe({
      next: () => {
        this.loadData();
        this.actionMessage = this.isEditingUnit ? 'Unit updated successfully!' : 'Unit added successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.isAddingUnit = false;
        this.isEditingUnit = false;
        this.editingUnitId = null;
        this.newUnit = { tower_id: '', unit_number: '', floor: null, wing: '', bhk: null, price: null, security_deposit: null, description: '', location: '', amenity_ids: [] };
        this.selectedFiles = [];

        // Reset file input if needed via DOM or binding
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.error || (this.isEditingUnit ? 'Failed to update unit.' : 'Failed to add unit.');
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  vacateUnit(unitId: number): void {
    if (confirm('Are you sure you want to mark this unit as available?')) {
      this.adminService.vacateUnit(unitId).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => this.errorMessage = 'Failed to vacate unit.'
      });
    }
  }

  toggleMaintenanceStatus(unit: any, newStatus: string): void {
    if (!unit || !unit.id) return;
    this.adminService.updateUnitStatus(unit.id, newStatus).subscribe({
      next: () => {
        this.actionMessage = `Unit ${unit.unit_number} updated successfully!`;
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update unit status.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  updateMaintenanceStatus(reqId: number, status: 'pending' | 'resolved'): void {
    if (!reqId) return;
    this.maintenanceService.updateRequestStatus(reqId, status).subscribe({
      next: () => {
        this.actionMessage = `Request marked as ${status}!`;
        this.loadData();
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update request status.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  toggleAmenity(id: number): void {
    const index = this.newUnit.amenity_ids.indexOf(id);
    if (index > -1) {
      this.newUnit.amenity_ids.splice(index, 1);
    } else {
      this.newUnit.amenity_ids.push(id);
    }
  }

  approveBooking(id: number): void {
    this.adminService.approveBooking(id).subscribe({
      next: () => {
        this.actionMessage = 'Booking approved successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = err.error?.error || 'Failed to approve booking'
    });
  }

  rejectBooking(id: number): void {
    this.adminService.rejectBooking(id).subscribe({
      next: () => {
        this.actionMessage = 'Booking rejected successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = err.error?.error || 'Failed to reject booking'
    });
  }

  deleteUnit(unitId: number): void {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    this.adminService.deleteUnit(unitId).subscribe({
      next: () => {
        this.actionMessage = 'Unit deleted successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = 'Failed to delete unit.'
    });
  }

  deleteTower(towerId: number): void {
    if (!confirm('Are you sure you want to delete this tower? This will delete all units inside it!')) return;
    this.adminService.deleteTower(towerId).subscribe({
      next: () => {
        this.actionMessage = 'Tower deleted successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = 'Failed to delete tower.'
    });
  }

  async downloadLease(bookingId: number, unitNumber: string): Promise<void> {
    try {
      const blob = await this.adminService.downloadLease(bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lease_Agreement_Unit_${unitNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      this.errorMessage = 'Failed to download lease PDF.';
      setTimeout(() => this.errorMessage = '', 4000);
    }
  }

  deleteUser(id: number): void {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.actionMessage = 'User deleted successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = err.error?.error || 'Failed to delete user.'
    });
  }

  updateUserRole(id: number, currentRole: string): void {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const msg = `Are you sure you want to change this user's role to ${newRole}?`;
    if (!confirm(msg)) return;

    this.adminService.updateUserRole(id, newRole).subscribe({
      next: () => {
        this.actionMessage = `User role updated to ${newRole}!`;
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => this.errorMessage = err.error?.error || 'Failed to update user role.'
    });
  }

  viewUserHistory(userId: number): void {
    this.isHistoryLoading = true;
    this.showHistoryModal = true;
    this.adminService.getUserHistory(userId).subscribe({
      next: (data) => {
        this.selectedUserHistory = data;
        this.isHistoryLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load user history.';
        this.isHistoryLoading = false;
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedUserHistory = null;
  }
}
