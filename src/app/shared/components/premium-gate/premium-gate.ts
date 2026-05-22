import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-premium-gate',
  templateUrl: './premium-gate.html',
  standalone: false
})
export class PremiumGateComponent {
  private auth = inject(AuthService);
  
  get isPremium(): boolean {
    let role = localStorage.getItem('role');
    // Assuming PRO role or subscription logic.
    return role === 'PRO' || role === 'ADMIN';
  }
}
