import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-landing-home',
  templateUrl: './landing-home.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class LandingHomeComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token) {
      if (role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }
}
