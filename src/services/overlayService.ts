import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface FloatingIconSettings {
  style: 'circle' | 'square' | 'heart' | 'star';
  transparency: number;
  soundFeedback: boolean;
  hapticFeedback: boolean;
  rememberPosition: boolean;
}

export interface OverlayService {
  showFloatingButton(): Promise<void>;
  hideFloatingButton(): Promise<void>;
  requestOverlayPermission(): Promise<boolean>;
  checkOverlayPermission(): Promise<boolean>;
  updateIconSettings(settings: FloatingIconSettings): void;
}

class NativeOverlayService implements OverlayService {
  private hasPermission = false;
  private iconSettings: FloatingIconSettings = {
    style: 'circle',
    transparency: 90,
    soundFeedback: true,
    hapticFeedback: true,
    rememberPosition: true
  };
  private lastPosition = { x: 20, y: 20 };

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

    // Load settings and position
    this.loadSettings();

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
    button.innerHTML = this.getIconSVG();
    
    // Apply dynamic styling based on settings
    const styles = this.getButtonStyles();
    Object.assign(button.style, styles);

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
      
      // Save position if remember position is enabled
      if (this.iconSettings.rememberPosition) {
        this.lastPosition = { x: initialX, y: initialY };
        this.savePosition();
      }
    };

    // Add drag event listeners
    button.addEventListener('mousedown', handleStart);
    button.addEventListener('touchstart', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    // Listen for settings updates
    window.addEventListener('blindvision-update-icon-style', this.handleSettingsUpdate.bind(this));

    // Add click handler to trigger camera capture
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Add sound feedback
      if (this.iconSettings.soundFeedback) {
        this.playClickSound();
      }
      
      // Add haptic feedback
      if (this.iconSettings.hapticFeedback && Capacitor.isNativePlatform()) {
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

  updateIconSettings(settings: FloatingIconSettings): void {
    this.iconSettings = settings;
    this.saveSettings();
    this.refreshButton();
  }

  private loadSettings(): void {
    // Load icon settings
    const savedSettings = localStorage.getItem('blindvision-icon-settings');
    if (savedSettings) {
      try {
        this.iconSettings = { ...this.iconSettings, ...JSON.parse(savedSettings) };
      } catch (error) {
        console.error('Failed to load icon settings:', error);
      }
    }

    // Load position
    if (this.iconSettings.rememberPosition) {
      const savedPosition = localStorage.getItem('blindvision-icon-position');
      if (savedPosition) {
        try {
          this.lastPosition = JSON.parse(savedPosition);
        } catch (error) {
          console.error('Failed to load icon position:', error);
        }
      }
    }
  }

  private saveSettings(): void {
    localStorage.setItem('blindvision-icon-settings', JSON.stringify(this.iconSettings));
  }

  private savePosition(): void {
    localStorage.setItem('blindvision-icon-position', JSON.stringify(this.lastPosition));
  }

  private getIconSVG(): string {
    switch (this.iconSettings.style) {
      case 'square':
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2"/>
          </svg>
        `;
      case 'heart':
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            <circle cx="12" cy="12" r="2" fill="black"/>
          </svg>
        `;
      case 'star':
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            <circle cx="12" cy="12" r="2" fill="black"/>
          </svg>
        `;
      default:
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
    }
  }

  private getButtonStyles(): React.CSSProperties {
    let borderRadius = '50%';
    let clipPath = 'none';
    
    switch (this.iconSettings.style) {
      case 'square':
        borderRadius = '15%';
        break;
      case 'heart':
        borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
        break;
      case 'star':
        borderRadius = '0';
        clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        break;
    }

    const opacity = this.iconSettings.transparency / 100;
    const position = this.iconSettings.rememberPosition ? this.lastPosition : { x: 20, y: 20 };

    return {
      position: 'fixed',
      top: `${position.y}px`,
      right: this.iconSettings.rememberPosition ? 'auto' : '20px',
      left: this.iconSettings.rememberPosition ? `${position.x}px` : 'auto',
      width: '60px',
      height: '60px',
      borderRadius,
      clipPath,
      opacity,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '9999',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
      transition: 'all 0.3s ease',
      userSelect: 'none'
    };
  }

  private refreshButton(): void {
    const button = document.getElementById('blind-vision-floating-button');
    if (button) {
      button.innerHTML = this.getIconSVG();
      const styles = this.getButtonStyles();
      Object.assign(button.style, styles);
    }
  }

  private handleSettingsUpdate(event: CustomEvent): void {
    this.iconSettings = event.detail;
    this.saveSettings();
    this.refreshButton();
  }

  private playClickSound(): void {
    // Create a simple click sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio feedback not available:', error);
    }
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