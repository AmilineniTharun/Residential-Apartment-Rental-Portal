import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { FlatList } from './components/flat-list/flat-list';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { Profile } from './components/profile/profile';
import { authGuard } from './guards/auth/auth-guard';
import { adminGuard } from './guards/admin/admin-guard';

import { Home } from './components/home/home';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: Home },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'flats', component: FlatList },
    {
        path: 'dashboard',
        component: UserDashboard,
        canActivate: [authGuard]
    },
    {
        path: 'admin',
        component: AdminDashboard,
        canActivate: [adminGuard]
    },
    {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard]
    },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password/:token', component: ResetPasswordComponent }
];
