import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, MapPin, Phone, Navigation, Share, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyPanelProps {
  speakText: (text: string) => void;
  currentLocation?: { lat: number; lng: number; address?: string };
}

export const EmergencyPanel = ({ speakText, currentLocation }: EmergencyPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const handleFindNearbyHelp = useCallback(async () => {
    speakText("Finding nearby help and services...");
    
    if (!currentLocation) {
      speakText("Getting your location first...");
      setIsGettingLocation(true);
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        const searchQuery = `hospitals+police+emergency+services+near+${lat},${lng}`;
        const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
        window.open(mapsUrl, '_blank');
        
        speakText("Opening map with nearby emergency services and hospitals.");
        
        toast({
          title: "Emergency Services Located",
          description: "Map opened with nearby emergency services",
        });
        
      } catch (error) {
        console.error('Location error:', error);
        speakText("Could not get your location. Opening general emergency services search.");
        window.open('https://www.google.com/maps/search/emergency+services+hospitals', '_blank');
        
        toast({
          title: "Location Unavailable",
          description: "Opened general emergency services search",
          variant: "destructive"
        });
      } finally {
        setIsGettingLocation(false);
      }
    } else {
      const searchQuery = `hospitals+police+emergency+services+near+${currentLocation.lat},${currentLocation.lng}`;
      const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
      window.open(mapsUrl, '_blank');
      speakText("Opening map with nearby emergency services based on your current location.");
    }
  }, [speakText, currentLocation, toast]);

  const handleShareLocation = useCallback(async () => {
    speakText("Getting your current location to share...");
    setIsGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);
      
      const locationText = `My current location: https://www.google.com/maps?q=${lat},${lng} (Accuracy: ${accuracy} meters)`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'My Current Location',
          text: locationText
        });
        speakText("Location shared successfully.");
      } else {
        await navigator.clipboard.writeText(locationText);
        speakText("Your location has been copied to clipboard.");
        toast({
          title: "Location Copied",
          description: "Location link copied to clipboard",
        });
      }
      
    } catch (error) {
      console.error('Location sharing error:', error);
      speakText("Could not get or share your location. Please try again.");
      toast({
        title: "Location Sharing Failed",
        description: "Could not access your location",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [speakText, toast]);

  const handleEmergencyCall = useCallback(() => {
    speakText("Important: This will only work if your device supports calling. For true emergencies, always use your phone's emergency calling feature.");
    
    const emergencyNumbers = [
      { label: "Emergency Services", number: "911", description: "Police, Fire, Medical Emergency" },
      { label: "Non-Emergency Police", number: "311", description: "Non-urgent police assistance" },
      { label: "Poison Control", number: "1-800-222-1222", description: "Poison emergency hotline" }
    ];
    
    const numbersText = emergencyNumbers.map(n => `${n.label}: ${n.number}`).join(', ');
    speakText(`Emergency numbers: ${numbersText}. To call, use your phone's dialer or emergency calling feature.`);
    
    toast({
      title: "Emergency Numbers",
      description: "Use your phone's dialer for emergency calls",
    });
  }, [speakText, toast]);

  return (
    <Card className="bv-surface w-full max-w-md shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5" />
            <span>Emergency & Location</span>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            size="sm"
            className="text-xs h-8 min-h-0 px-3 rounded-full"
            aria-label={isExpanded ? "Collapse emergency panel" : "Expand emergency panel"}
          >
            {isExpanded ? "Less" : "Show"}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleFindNearbyHelp}
            disabled={isGettingLocation}
            className="bv-btn-white rounded-xl flex flex-col items-start gap-0.5 h-auto py-3 px-3 min-h-[56px]"
            aria-label="Find nearby emergency services and hospitals"
          >
            <Navigation className="w-4 h-4" />
            <span className="text-xs font-semibold leading-tight">Find Help Nearby</span>
          </Button>
          
          <Button
            onClick={handleShareLocation}
            disabled={isGettingLocation}
            variant="outline"
            className="rounded-xl flex flex-col items-start gap-0.5 h-auto py-3 px-3 min-h-[56px]"
            aria-label="Share your current location"
          >
            <Share className="w-4 h-4" />
            <span className="text-xs font-semibold leading-tight">Share Location</span>
          </Button>
        </div>

        {currentLocation && (
          <div className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-foreground/15 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-foreground shrink-0" />
            <span>
              {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
            </span>
          </div>
        )}

        {isExpanded && (
          <div className="space-y-2 animate-fade-in pt-1">
            <Button
              onClick={handleEmergencyCall}
              variant="outline"
              className="w-full rounded-xl flex items-center gap-3 h-auto py-3 px-4 justify-start"
              aria-label="View emergency phone numbers"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium">Emergency Numbers</div>
                <div className="text-xs text-muted-foreground">911, 311, Poison Control</div>
              </div>
            </Button>

            <div className="p-3 rounded-lg border border-foreground/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Safety tips</p>
                  <p>Stay calm · Know your location · Use voice: &ldquo;emergency help&rdquo;</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-1">
          Voice: &ldquo;emergency help&rdquo; or &ldquo;find help nearby&rdquo;
        </p>
      </CardContent>
    </Card>
  );
};
