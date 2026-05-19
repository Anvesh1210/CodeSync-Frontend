import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  createOrder(userId: string, amount: number, planType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-order`, {
      userId,
      amount,
      currency: 'INR',
      planType
    });
  }

  verifyPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, paymentData, { responseType: 'text' as 'json' });
  }

  getSubscriptionStatus(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/${userId}`);
  }

  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-checkout-script')) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  payWithRazorpay(options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const rzp = new (window as any).Razorpay({
        ...options,
        handler: (response: any) => {
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject('Payment cancelled by user');
          }
        }
      });
      rzp.open();
    });
  }
}
