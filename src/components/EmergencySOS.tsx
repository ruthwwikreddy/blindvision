import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, X, Phone, MapPin, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencySOSProps {
  onClose: () => void;
  speakText: (text: string) => void;
  currentLocation?: { lat: number; lng: number; address?: string };
}

function getEmergencyNumber(): string {
  const locale = navigator.language?.toLowerCase() ?? '';
  if (locale.startsWith('en-us') || locale.startsWith('en-ca')) return '911';
  if (locale.startsWith('en-gb')) return '999';
  if (locale.startsWith('en-au')) return '000';
  if (locale.startsWith('en-in') || locale.startsWith('hi')) return '112';
  return '112';
}

export const EmergencySOS = ({ onClose, speakText, currentLocation }: EmergencySOSProps) => {
  const [isCalling, setIsCalling] = useState(false);
  const { toast } = useToast();
  const emergencyNumber = getEmergencyNumber();

  const handleEmergencyCall = useCallback(() => {
    setIsCalling(true);
    speakText(`Opening phone dialer for emergency number ${emergencyNumber.split('').join(' ')}`);
    window.location.href = `tel:${emergencyNumber}`;
    setTimeout(() => setIsCalling(false), 2000);
  }, [speakText, emergencyNumber]);

  const handleShareLocation = useCallback(async () => {
    if (!currentLocation) {
      speakText('Location not available yet. Try again in a moment.');
      return;
    }

    const locationText = `Emergency! My location: https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Emergency Location', text: locationText });
      } else {
        await navigator.clipboard.writeText(locationText);
        toast({ title: 'Location Copied', description: 'Share the link with someone who can help' });
      }
      speakText('Location ready to share');
    } catch {
      speakText('Could not share location');
    }
  }, [currentLocation, speakText, toast]);

  const handleCallEmergencyContact = useCallback(() => {
    const emergencyContact = localStorage.getItem('emergency-contact');
    if (emergencyContact) {
      speakText('Opening dialer for your emergency contact');
      window.location.href = `tel:${emergencyContact}`;
    } else {
      speakText('No emergency contact saved. Add one in your phone contacts and save the number in settings later.');
      toast({ title: 'No Contact Saved', description: 'Set an emergency contact in your phone for quick access' });
    }
  }, [speakText, toast]);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-lg flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
    >
      <Card className="w-full max-w-md bv-surface-strong shadow-none border-foreground/30 animate-scale-in">
        <CardHeader className="border-b border-foreground/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <CardTitle id="sos-title" className="text-lg font-bold">Emergency SOS</CardTitle>
            </div>
            <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-9 w-9 min-h-0 min-w-0" aria-label="Close emergency panel">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-3">
          <Button
            size="lg"
            onClick={handleEmergencyCall}
            disabled={isCalling}
            className="w-full h-16 text-base bv-btn-white rounded-xl gap-3"
          >
            <Phone className="w-5 h-5" />
            {isCalling ? 'Opening dialer…' : `Call Emergency (${emergencyNumber})`}
          </Button>

          <Button size="lg" onClick={handleCallEmergencyContact} variant="outline" className="w-full h-14 rounded-xl gap-3">
            <Phone className="w-5 h-5" />
            Call Emergency Contact
          </Button>

          <Button size="lg" onClick={handleShareLocation} variant="outline" className="w-full h-14 rounded-xl gap-3" disabled={!currentLocation}>
            <Share2 className="w-5 h-5" />
            Share Location
          </Button>

          {currentLocation && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-foreground/15 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Current location</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground pt-2 leading-relaxed">
            This opens your phone dialer — you must confirm the call. For life-threatening emergencies, use your device&apos;s native emergency features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
