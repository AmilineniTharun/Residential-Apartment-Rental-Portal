import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
    token: string = '';
    password: any = '';
    confirmPassword: any = '';
    message: string = '';
    errorMessage: string = '';
    isLoading: boolean = false;
    isSuccess: boolean = false;

    constructor(
        private authService: AuthService,
        private route: ActivatedRoute
    ) { }

    ngOnInit() {
        this.token = this.route.snapshot.params['token'];
        if (!this.token) {
            this.errorMessage = 'Invalid reset link. Token is missing.';
        }
    }

    onSubmit() {
        if (this.password !== this.confirmPassword) {
            this.errorMessage = 'Passwords do not match.';
            return;
        }

        this.isLoading = true;
        this.message = '';
        this.errorMessage = '';

        const payload = {
            token: this.token,
            password: this.password
        };

        this.authService.resetPassword(payload).subscribe({
            next: (res) => {
                this.message = res.message;
                this.isLoading = false;
                this.isSuccess = true;
            },
            error: (err) => {
                this.errorMessage = err.error?.error || 'Failed to reset password. The link may have expired.';
                this.isLoading = false;
            }
        });
    }
}
