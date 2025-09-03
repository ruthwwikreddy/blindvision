import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, MapPin, Phone, Users, Navigation, Share, AlertCircle } from 'lucide-react';
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
        
        // Open Google Maps with nearby hospitals, police, etc.
        const searchQuery = `hospitals+police+emergency+services+near+${lat},${lng}`;
        const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
        window.open(mapsUrl, '_blank');
        
        speakText("Opening map with nearby emergency services and hospitals. The map will show locations you can navigate to for help.");
        
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
      
      // Create shareable location text
      const locationText = `My current location: https://www.google.com/maps?q=${lat},${lng} (Accuracy: ${accuracy} meters)`;
      
      // Try to share if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: 'My Current Location',
          text: locationText
        });
        speakText("Location shared successfully.");
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(locationText);
        speakText("Your location has been copied to clipboard. You can paste and share it with others.");
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
    
    // Create emergency contact options
    const emergencyNumbers = [
      { label: "Emergency Services", number: "911", description: "Police, Fire, Medical Emergency" },
      { label: "Non-Emergency Police", number: "311", description: "Non-urgent police assistance" },
      { label: "Poison Control", number: "1-800-222-1222", description: "Poison emergency hotline" }
    ];
    
    // For now, just provide information
    const numbersText = emergencyNumbers.map(n => `${n.label}: ${n.number}`).join(', ');
    speakText(`Emergency numbers: ${numbersText}. To call, use your phone's dialer or emergency calling feature.`);
    
    toast({
      title: "Emergency Numbers",
      description: "Use your phone's dialer for emergency calls",
    });
  }, [speakText, toast]);

  return (
    <Card className="border-border shadow-soft w-full max-w-md border-l-4 border-l-destructive">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Emergency & Location</span>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            size="sm"
            className="text-xs border-border hover:bg-muted"
            aria-label={isExpanded ? "Collapse emergency panel" : "Expand emergency panel"}
          >
            {isExpanded ? "Less" : "Show"}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Quick actions always visible */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleFindNearbyHelp}
            disabled={isGettingLocation}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center gap-2 h-auto p-3"
            aria-label="Find nearby emergency services and hospitals"
          >
            <Navigation className="w-4 h-4" />
            <div className="text-left">
              <div className="text-xs font-medium">🆘 Find Help</div>
              <div className="text-xs opacity-80">Nearby</div>
            </div>
          </Button>
          
          <Button
            onClick={handleShareLocation}
            disabled={isGettingLocation}
            variant="outline"
            className="border-border hover:bg-muted flex items-center gap-2 h-auto p-3"
            aria-label="Share your current location"
          >
            <Share className="w-4 h-4" />
            <div className="text-left">
              <div className="text-xs font-medium">📍 Share</div>
              <div className="text-xs opacity-80">Location</div>
            </div>
          </Button>
        </div>

        {/* Current location display */}
        {currentLocation && (
          <div className="text-center p-2 bg-muted/30 rounded text-xs">
            <MapPin className="w-3 h-3 inline mr-1" />
            Location: {currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
          </div>
        )}

        {/* Expanded emergency options */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-xs text-muted-foreground font-medium">Additional Emergency Options:</div>
            
            <Button
              onClick={handleEmergencyCall}
              variant="outline"
              className="w-full border-border hover:bg-muted flex items-center gap-2 h-auto p-3"
              aria-label="View emergency phone numbers"
            >
              <Phone className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">Emergency Numbers</div>
                <div className="text-xs text-muted-foreground">View important contact numbers</div>
              </div>
            </Button>

            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Emergency Safety Tips:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Stay calm and speak clearly</li>
                    <li>• Know your location before calling</li>
                    <li>• Keep important contacts accessible</li>
                    <li>• Use voice commands: "emergency help"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <p><strong>Voice command:</strong> Say "emergency help" or "find help nearby"</p>
        </div>
      </CardContent>
    </Card>
  );
};