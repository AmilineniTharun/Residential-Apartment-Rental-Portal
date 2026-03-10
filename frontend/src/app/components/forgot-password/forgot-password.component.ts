import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
    email: string = '';
    message: string = '';
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor(private authService: AuthService) { }

    onSubmit() {
        this.isLoading = true;
        this.message = '';
        this.errorMessage = '';

        this.authService.forgotPassword(this.email).subscribe({
            next: (res) => {
                this.message = res.message;
                this.isLoading = false;
                this.email = '';
            },
            error: (err) => {
                this.errorMessage = err.error?.error || 'Something went wrong. Please try again.';
                this.isLoading = false;
            }
        });
    }
}
