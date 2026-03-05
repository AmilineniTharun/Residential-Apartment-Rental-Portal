import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { FlatList } from './components/flat-list/flat-list';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { authGuard } from './guards/auth/auth-guard';
import { adminGuard } from './guards/admin/admin-guard';

export const routes: Routes = [
    { path: '', redirectTo: '/flats', pathMatch: 'full' },
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
    }
];
