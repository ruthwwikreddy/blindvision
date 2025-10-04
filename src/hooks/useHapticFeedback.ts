import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';

export type HapticPattern = 
  | 'success'
  | 'error'
  | 'warning'
  | 'modeChange'
  | 'capture'
  | 'buttonPress'
  | 'longPress'
  | 'swipe'
  | 'selection';

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback(async (pattern: HapticPattern) => {
    try {
      switch (pattern) {
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        
        case 'modeChange':
          // Double tap pattern
          await Haptics.impact({ style: ImpactStyle.Medium });
          setTimeout(async () => {
            await Haptics.impact({ style: ImpactStyle.Medium });
          }, 100);
          break;
        
        case 'capture':
          // Strong single impact
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        
        case 'buttonPress':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        
        case 'longPress':
          // Triple tap pattern
          await Haptics.impact({ style: ImpactStyle.Medium });
          setTimeout(async () => {
            await Haptics.impact({ style: ImpactStyle.Medium });
          }, 80);
          setTimeout(async () => {
            await Haptics.impact({ style: ImpactStyle.Medium });
          }, 160);
          break;
        
        case 'swipe':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        
        case 'selection':
          await Haptics.selectionStart();
          setTimeout(async () => {
            await Haptics.selectionEnd();
          }, 50);
          break;
      }
    } catch (error) {
      console.log('Haptic feedback not available:', error);
    }
  }, []);

  return { triggerHaptic };
};
