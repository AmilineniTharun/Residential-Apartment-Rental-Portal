import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './profile.html',
    styleUrl: './profile.css'
})
export class Profile implements OnInit {
    authService = inject(AuthService);

    user: any = null;
    isLoading = true;
    errorMessage = '';
    actionMessage = '';

    passwordForm = {
        old_password: '',
        new_password: '',
        confirm_password: ''
    };
    isSubmittingPassword = false;

    isEditingName = false;
    newName = '';
    isEditingPhone = false;
    newPhone = '';
    isUpdatingProfile = false;

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        this.isLoading = true;
        this.authService.getProfile().subscribe({
            next: (data) => {
                this.user = data;
                this.isLoading = false;
            },
            error: (err) => {
                this.errorMessage = 'Failed to load profile details.';
                this.isLoading = false;
                console.error(err);
            }
        });
    }

    toggleEditName(): void {
        if (!this.isEditingName) {
            this.newName = this.user.full_name;
        }
        this.isEditingName = !this.isEditingName;
    }

    toggleEditPhone(): void {
        if (!this.isEditingPhone) {
            this.newPhone = this.user.phone_number || '';
        }
        this.isEditingPhone = !this.isEditingPhone;
    }

    updateProfile(): void {
        const updateData: any = { full_name: this.user.full_name, phone_number: this.user.phone_number };

        if (this.isEditingName) {
            if (!this.newName.trim()) {
                this.errorMessage = 'Full name cannot be empty.';
                return;
            }
            updateData.full_name = this.newName;
        }

        if (this.isEditingPhone) {
            updateData.phone_number = this.newPhone;
        }

        this.isUpdatingProfile = true;
        this.authService.updateProfile(updateData).subscribe({
            next: (res) => {
                this.user.full_name = res.full_name;
                this.user.phone_number = res.phone_number;
                this.isEditingName = false;
                this.isEditingPhone = false;
                this.isUpdatingProfile = false;
                this.actionMessage = 'Profile updated successfully.';
                setTimeout(() => this.actionMessage = '', 3000);

                // Update local storage
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                storedUser.full_name = res.full_name;
                storedUser.phone_number = res.phone_number;
                localStorage.setItem('user', JSON.stringify(storedUser));
            },
            error: (err) => {
                this.errorMessage = err.error?.error || 'Failed to update profile.';
                this.isUpdatingProfile = false;
                setTimeout(() => this.errorMessage = '', 3000);
            }
        });
    }

    changePassword(): void {
        if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
            this.errorMessage = 'New password and confirmation do not match.';
            setTimeout(() => this.errorMessage = '', 4000);
            return;
        }

        if (this.passwordForm.new_password.length < 6) {
            this.errorMessage = 'New password must be at least 6 characters long.';
            setTimeout(() => this.errorMessage = '', 4000);
            return;
        }

        this.isSubmittingPassword = true;
        this.authService.changePassword({
            old_password: this.passwordForm.old_password,
            new_password: this.passwordForm.new_password
        }).subscribe({
            next: (res) => {
                this.actionMessage = '✅ ' + res.message;
                this.passwordForm = { old_password: '', new_password: '', confirm_password: '' };
                this.isSubmittingPassword = false;
                setTimeout(() => this.actionMessage = '', 5000);
            },
            error: (err) => {
                this.errorMessage = err.error?.error || 'Failed to update password.';
                this.isSubmittingPassword = false;
                setTimeout(() => this.errorMessage = '', 5000);
            }
        });
    }
}
