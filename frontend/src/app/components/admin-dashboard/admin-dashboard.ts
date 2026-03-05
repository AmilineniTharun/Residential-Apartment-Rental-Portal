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

  activeTab: 'overview' | 'units' | 'amenities' | 'towers' | 'leases' | 'bookings' | 'maintenance' = 'overview';

  reports: any = null;
  stats: any = {
    totalUnits: 0,
    availableUnits: 0,
    pendingBookings: 0,
    totalTenants: 0,
    revenue: 0
  };
  amenities: any[] = [];
  towers: any[] = [];
  units: any[] = [];
  bookings: any[] = [];
  leases: any[] = [];
  maintenanceRequests: MaintenanceRequest[] = [];
  selectedTowerFilter: string | null = null;
  bookingStatusFilter: 'all' | 'approved' | 'pending' | 'rejected' | 'options' = 'all';

  isLoading = true;
  errorMessage = '';
  actionMessage = '';

  // Lease action state
  leaseRequests: any[] = [];
  leaseActionForm: { [bookingId: number]: 'terminate' | 'extend' | null } = {};
  leaseActionDate: { [bookingId: number]: string } = {};
  reqApproveDate: { [reqId: number]: string } = {};
  isLeaseActing = false;

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

  setTab(tab: 'overview' | 'units' | 'amenities' | 'towers' | 'leases' | 'bookings' | 'maintenance') {
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
          revenue: data.revenue?.expected_monthly_revenue || 0
        };
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });

    this.adminService.getTowers().subscribe(data => this.towers = data.towers || []);
    this.adminService.getAmenities().subscribe(data => this.amenities = data.amenities || []);
    this.adminService.getUnits().subscribe(data => this.units = data.data || []);
    this.adminService.getBookings().subscribe(data => this.bookings = data || []);
    this.adminService.getLeases().subscribe(data => this.leases = data.leases || []);

    this.maintenanceService.getAllRequests().subscribe({
      next: (data) => this.maintenanceRequests = data.requests || [],
      error: (err) => console.error('Failed to load maintenance requests', err)
    });
  }

  viewTowerUnits(towerName: string): void {
    this.selectedTowerFilter = towerName;
    this.activeTab = 'units';
  }

  clearTowerFilter(): void {
    this.selectedTowerFilter = null;
  }

  get filteredUnits(): any[] {
    if (!this.selectedTowerFilter) {
      return this.units;
    }
    return this.units.filter(u => u.tower_name === this.selectedTowerFilter);
  }

  get filteredBookings(): any[] {
    if (this.bookingStatusFilter === 'all') {
      return this.bookings;
    }
    if (this.bookingStatusFilter === 'options') {
      return []; // Options view doesn't use the table
    }
    return this.bookings.filter(b => b.status === this.bookingStatusFilter);
  }

  get leasesWithDates(): number {
    return this.leases.filter(l => l.start_date && l.end_date).length;
  }

  get leasesPendingDates(): number {
    return this.leases.filter(l => !l.start_date || !l.end_date).length;
  }

  setBookingFilter(filter: 'all' | 'approved' | 'pending' | 'rejected' | 'options'): void {
    this.bookingStatusFilter = filter;
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

  // Amenity Status Management
  selectedAmenityTowerId: number | null = null;
  towerAmenityStatuses: any[] = [];
  selectedAmenityId: number | null = null;
  amenityStatus: string = 'Open';
  isUpdatingStatus: boolean = false;

  onAmenityTowerChange(): void {
    this.selectedAmenityId = null;
    if (this.selectedAmenityTowerId) {
      this.loadTowerAmenityStatuses();
    } else {
      this.towerAmenityStatuses = [];
    }
  }

  loadTowerAmenityStatuses(): void {
    if (!this.selectedAmenityTowerId) return;
    this.adminService.getTowerAmenityStatus(this.selectedAmenityTowerId).subscribe({
      next: (data) => this.towerAmenityStatuses = data.statuses || [],
      error: (err) => console.error('Failed to load tower amenity statuses', err)
    });
  }

  updateAmenityStatus(): void {
    if (!this.selectedAmenityTowerId || !this.selectedAmenityId || !this.amenityStatus) {
      this.errorMessage = 'Please select a tower, amenity and status.';
      return;
    }

    this.isUpdatingStatus = true;
    const data = {
      tower_id: this.selectedAmenityTowerId,
      amenity_id: this.selectedAmenityId,
      status: this.amenityStatus
    };

    this.adminService.updateTowerAmenityStatus(data).subscribe({
      next: () => {
        this.isUpdatingStatus = false;
        this.actionMessage = 'Amenity status updated successfully!';
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadTowerAmenityStatuses();
        // Reset selection
        this.selectedAmenityId = null;
        this.amenityStatus = 'Open';
      },
      error: (err) => {
        this.isUpdatingStatus = false;
        this.errorMessage = 'Failed to update amenity status.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

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
    // let confirmMsg = newStatus === 'under_maintenance'
    //   ? `Are you sure you want to mark unit ${unit.unit_number} as Under Maintenance?`
    //   : `Are you sure you want to mark unit ${unit.unit_number} as Available?`;

    // if (!confirm(confirmMsg)) return;

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

  toggleLeaseAction(bookingId: number, type: 'terminate' | 'extend'): void {
    this.leaseActionForm[bookingId] = this.leaseActionForm[bookingId] === type ? null : type;
  }

  doAdminTerminate(bookingId: number): void {
    const date = this.leaseActionDate[bookingId];
    if (!date) return;
    this.isLeaseActing = true;
    this.leaseService.adminTerminateLease(bookingId, date).subscribe({
      next: () => {
        this.isLeaseActing = false;
        this.leaseActionForm[bookingId] = null;
        this.actionMessage = '✅ Lease terminated successfully.';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadData();
      },
      error: (err) => {
        this.isLeaseActing = false;
        this.errorMessage = err.error?.error || 'Failed to terminate lease.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  doAdminExtend(bookingId: number): void {
    const date = this.leaseActionDate[bookingId];
    if (!date) return;
    this.isLeaseActing = true;
    this.leaseService.adminExtendLease(bookingId, date).subscribe({
      next: () => {
        this.isLeaseActing = false;
        this.leaseActionForm[bookingId] = null;
        this.actionMessage = '✅ Lease extended successfully.';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadData();
      },
      error: (err) => {
        this.isLeaseActing = false;
        this.errorMessage = err.error?.error || 'Failed to extend lease.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  loadLeaseRequests(): void {
    this.leaseService.getLeaseRequests().subscribe({
      next: (data) => this.leaseRequests = data,
      error: (err) => console.error('Failed to load lease requests', err)
    });
  }

  approveLeaseReq(reqId: number, newEndDate?: string): void {
    this.leaseService.approveLeaseRequest(reqId, newEndDate).subscribe({
      next: () => {
        this.actionMessage = '✅ Request approved.';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadLeaseRequests();
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to approve request.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  rejectLeaseReq(reqId: number): void {
    this.leaseService.rejectLeaseRequest(reqId).subscribe({
      next: () => {
        this.actionMessage = 'Request rejected.';
        setTimeout(() => this.actionMessage = '', 4000);
        this.loadLeaseRequests();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to reject request.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  deleteUnit(unitId: number): void {
    if (confirm('Are you sure you want to delete this unit permanently?')) {
      this.adminService.deleteUnit(unitId).subscribe({
        next: () => {
          this.actionMessage = 'Unit deleted successfully!';
          setTimeout(() => this.actionMessage = '', 3000);
          this.loadData();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Failed to delete unit'
      });
    }
  }

  deleteTower(towerId: number): void {
    if (confirm('Are you sure you want to delete this tower? This action cannot be undone.')) {
      this.adminService.deleteTower(towerId).subscribe({
        next: () => {
          this.actionMessage = 'Tower deleted successfully!';
          setTimeout(() => this.actionMessage = '', 3000);
          this.loadData();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Failed to delete tower'
      });
    }
  }

  updateMaintenanceStatus(id: number, status: 'pending' | 'resolved'): void {
    this.maintenanceService.updateRequestStatus(id, status).subscribe({
      next: () => {
        this.actionMessage = `Maintenance request marked as ${status}`;
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update maintenance status';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  serviceDateForm: { [id: number]: string } = {};
  adminNoteForm: { [id: number]: string } = {};

  assignServiceDate(id: number): void {
    const date = this.serviceDateForm[id];
    const note = this.adminNoteForm[id];

    this.maintenanceService.updateRequestStatus(id, undefined, date, note).subscribe({
      next: () => {
        this.actionMessage = `Service date scheduled for request #${id}`;
        setTimeout(() => this.actionMessage = '', 3000);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update service date';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }
}
