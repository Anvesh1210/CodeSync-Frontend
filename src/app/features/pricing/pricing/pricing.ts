import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.html',
  standalone: false
})
export class PricingComponent implements OnInit {
  isYearly = false;
  isManagePlanModalOpen = false;
  currentUser: any;
  showCongrats = false;

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  get remainingDays(): number {
    if (!this.currentUser?.subscriptionExpiry) return 0;
    const expiry = new Date(this.currentUser.subscriptionExpiry);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  toggleBilling() {
    this.isYearly = !this.isYearly;
  }

  toggleManagePlanModal() {
    this.isManagePlanModalOpen = !this.isManagePlanModalOpen;
  }

  toggleCongrats() {
    this.showCongrats = !this.showCongrats;
  }

  async upgradeToPro() {
    if (this.currentUser?.premium && this.currentUser?.planType === 'PRO') {
      this.toggleManagePlanModal();
      return;
    }

    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    await this.processPayment();
  }

  async purchaseAgain() {
    await this.processPayment();
    this.isManagePlanModalOpen = false;
  }

  private async processPayment() {
    try {
      const scriptLoaded = await this.paymentService.loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        return;
      }

      const amount = this.isYearly ? 11988 : 1249;
      const order = await this.paymentService.createOrder(this.currentUser.userId, amount, 'PRO').toPromise();
      
      if (!order || !order.keyId || !order.orderId) {
        alert('Failed to initialize payment.');
        return;
      }

      const options = {
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR',
        name: 'CodeSync Premium',
        description: `Extend PRO Plan (${this.isYearly ? 'Yearly' : 'Monthly'})`,
        order_id: order.orderId,
        prefill: {
          name: this.currentUser?.fullName || this.currentUser?.username || 'CodeSync User',
          email: this.currentUser?.email || 'user@codesync.com'
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const paymentResponse = await this.paymentService.payWithRazorpay(options);
      
      await this.paymentService.verifyPayment({
        userId: this.currentUser.userId,
        orderId: order.orderId,
        paymentId: paymentResponse.razorpay_payment_id,
        signature: paymentResponse.razorpay_signature
      }).toPromise();

      this.ngZone.run(() => {
        this.showCongrats = true;
        this.cdr.detectChanges();
        // Refresh user data
        this.authService.validateToken().subscribe({
          next: () => {
            this.cdr.detectChanges();
          }
        });
      });

    } catch (error) {
      console.error('Payment failed:', error);
      if (typeof error === 'string') alert(error);
    }
  }
}
