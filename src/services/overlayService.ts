import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface OverlayService {
  showFloatingButton(): Promise<void>;
  hideFloatingButton(): Promise<void>;
  requestOverlayPermission(): Promise<boolean>;
  checkOverlayPermission(): Promise<boolean>;
}

class NativeOverlayService implements OverlayService {
  private hasPermission = false;

  async requestOverlayPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'android') {
      // On Android, we need SYSTEM_ALERT_WINDOW permission
      try {
        // This would typically call a native plugin
        // For now, we'll simulate the permission request
        this.hasPermission = true;
        return true;
      } catch (error) {
        console.error('Failed to request overlay permission:', error);
        return false;
      }
    } else if (Capacitor.getPlatform() === 'ios') {
      // iOS uses local notifications and background app refresh
      this.hasPermission = true;
      return true;
    }
    return false;
  }

  async checkOverlayPermission(): Promise<boolean> {
    return this.hasPermission;
  }

  async showFloatingButton(): Promise<void> {
    if (!this.hasPermission) {
      const granted = await this.requestOverlayPermission();
      if (!granted) {
        throw new Error('Overlay permission not granted');
      }
    }

    // Add haptic feedback
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }

    // For native apps, this would show a system overlay
    // For web, we'll use a different approach
    this.createFloatingButton();
  }

  async hideFloatingButton(): Promise<void> {
    const existingButton = document.getElementById('blind-vision-floating-button');
    if (existingButton) {
      existingButton.remove();
    }
  }

  private createFloatingButton(): void {
    // Remove existing button if any
    this.hideFloatingButton();

    // Create floating button element
    const button = document.createElement('div');
    button.id = 'blind-vision-floating-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Style the floating button
    Object.assign(button.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '9999',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
      transition: 'all 0.3s ease',
      userSelect: 'none'
    });

    // Add hover and active effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
    });

    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1.1)';
    });

    // Make button draggable
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    const handleStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      startX = clientX - initialX;
      startY = clientY - initialY;
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      initialX = clientX - startX;
      initialY = clientY - startY;
      
      button.style.left = `${initialX}px`;
      button.style.top = `${initialY}px`;
      button.style.right = 'auto';
    };

    const handleEnd = () => {
      isDragging = false;
    };

    // Add drag event listeners
    button.addEventListener('mousedown', handleStart);
    button.addEventListener('touchstart', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    // Add click handler to trigger camera capture
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Add haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }

      // Trigger the main app functionality
      this.triggerCameraCapture();
    });

    // Add to DOM
    document.body.appendChild(button);

    // Announce to screen readers
    this.announceToScreenReader('Blind Vision floating button is now active. Tap to capture and analyze your surroundings.');
  }

  private triggerCameraCapture(): void {
    // Dispatch a custom event that the main app can listen to
    const event = new CustomEvent('blindvision-capture-request');
    window.dispatchEvent(event);
  }

  private announceToScreenReader(message: string): void {
    // Create a temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    
    // Add the message
    announcement.textContent = message;
    
    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }
}

// Export singleton instance
export const overlayService = new NativeOverlayService();