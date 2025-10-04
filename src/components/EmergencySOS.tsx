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

export const EmergencySOS = ({ onClose, speakText, currentLocation }: EmergencySOSProps) => {
  const [isCalling, setIsCalling] = useState(false);
  const { toast } = useToast();

  const handleEmergencyCall = useCallback(() => {
    setIsCalling(true);
    speakText('Calling emergency services now');
    
    // Open phone dialer with emergency number
    window.location.href = 'tel:112'; // International emergency number
    
    setTimeout(() => setIsCalling(false), 2000);
  }, [speakText]);

  const handleShareLocation = useCallback(() => {
    if (currentLocation) {
      const locationText = `Emergency! My location: https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Emergency Location',
          text: locationText
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(locationText);
        toast({
          title: 'Location Copied',
          description: 'Emergency location copied to clipboard'
        });
      }
      
      speakText('Location shared');
    } else {
      speakText('Location not available');
      toast({
        title: 'Location Unavailable',
        description: 'Unable to get current location',
        variant: 'destructive'
      });
    }
  }, [currentLocation, speakText, toast]);

  const handleCallEmergencyContact = useCallback(() => {
    const emergencyContact = localStorage.getItem('emergency-contact');
    if (emergencyContact) {
      speakText('Calling emergency contact');
      window.location.href = `tel:${emergencyContact}`;
    } else {
      speakText('No emergency contact set. Please set one in settings.');
      toast({
        title: 'No Emergency Contact',
        description: 'Please set an emergency contact in settings',
        variant: 'destructive'
      });
    }
  }, [speakText, toast]);

  return (
    <div className="fixed inset-0 z-50 bg-destructive/20 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-lg border-4 border-destructive shadow-neon animate-scale-in">
        <CardHeader className="bg-destructive text-destructive-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
              <CardTitle className="text-2xl font-bold">Emergency SOS</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-destructive-foreground hover:bg-destructive-foreground/20"
              aria-label="Close emergency panel"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <Button
            size="lg"
            onClick={handleEmergencyCall}
            disabled={isCalling}
            className="w-full h-20 text-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-3"
          >
            <Phone className="w-8 h-8" />
            {isCalling ? 'Calling...' : 'Call Emergency (112)'}
          </Button>

          <Button
            size="lg"
            onClick={handleCallEmergencyContact}
            className="w-full h-16 text-lg gap-3"
            variant="outline"
          >
            <Phone className="w-6 h-6" />
            Call Emergency Contact
          </Button>

          {currentLocation && (
            <Button
              size="lg"
              onClick={handleShareLocation}
              className="w-full h-16 text-lg gap-3"
              variant="outline"
            >
              <Share2 className="w-6 h-6" />
              Share Location
            </Button>
          )}

          {currentLocation && (
            <Card className="bg-muted/50 border-muted">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm font-semibold mb-1">Current Location</p>
                    <p className="text-xs text-muted-foreground">
                      {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-sm text-center text-muted-foreground pt-4">
            Emergency services will be contacted immediately
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
