import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PremiumGateComponent } from './components/premium-gate/premium-gate';
import { ThemeStoreModalComponent } from './components/theme-store-modal/theme-store-modal';
import { NotificationsDropdownComponent } from './components/notifications-dropdown/notifications-dropdown';

@NgModule({
  declarations: [PremiumGateComponent, NotificationsDropdownComponent],
  imports: [CommonModule, RouterModule, ThemeStoreModalComponent],
  exports: [PremiumGateComponent, ThemeStoreModalComponent, NotificationsDropdownComponent]
})
export class SharedModule {}
