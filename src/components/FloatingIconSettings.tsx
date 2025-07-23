import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Eye, Circle, Square, Heart, Star, Volume2, Vibrate } from 'lucide-react';

interface FloatingIconSettings {
  style: 'circle' | 'square' | 'heart' | 'star';
  transparency: number;
  soundFeedback: boolean;
  hapticFeedback: boolean;
  rememberPosition: boolean;
}

interface FloatingIconSettingsProps {
  onBackClick: () => void;
  speakText: (text: string) => void;
}

export const FloatingIconSettings = ({ onBackClick, speakText }: FloatingIconSettingsProps) => {
  const [settings, setSettings] = useState<FloatingIconSettings>({
    style: 'circle',
    transparency: 90,
    soundFeedback: true,
    hapticFeedback: true,
    rememberPosition: true
  });

  const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('blindvision-icon-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to load icon settings:', error);
      }
    }
  }, []);

  // Save settings and update preview
  useEffect(() => {
    localStorage.setItem('blindvision-icon-settings', JSON.stringify(settings));
    
    // Update preview style
    const opacity = settings.transparency / 100;
    let borderRadius = '50%';
    
    switch (settings.style) {
      case 'square':
        borderRadius = '15%';
        break;
      case 'heart':
        borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
        break;
      case 'star':
        borderRadius = '0';
        break;
      default:
        borderRadius = '50%';
    }

    setPreviewStyle({
      opacity,
      borderRadius,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      transform: settings.style === 'star' ? 'rotate(0deg)' : 'none',
      clipPath: settings.style === 'star' 
        ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        : 'none'
    });

    // Dispatch event to update actual floating button
    window.dispatchEvent(new CustomEvent('blindvision-update-icon-style', { 
      detail: settings 
    }));
  }, [settings]);

  const handleStyleChange = (style: FloatingIconSettings['style']) => {
    setSettings(prev => ({ ...prev, style }));
    
    const styleNames = {
      circle: 'circular',
      square: 'rounded square',
      heart: 'heart-shaped',
      star: 'star-shaped'
    };
    
    speakText(`Icon style changed to ${styleNames[style]}`);
  };

  const handleTransparencyChange = (transparency: number[]) => {
    setSettings(prev => ({ ...prev, transparency: transparency[0] }));
  };

  const handleSoundFeedbackChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, soundFeedback: enabled }));
    speakText(enabled ? "Sound feedback enabled" : "Sound feedback disabled");
  };

  const handleHapticFeedbackChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, hapticFeedback: enabled }));
    speakText(enabled ? "Haptic feedback enabled" : "Haptic feedback disabled");
  };

  const handleRememberPositionChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, rememberPosition: enabled }));
    speakText(enabled ? "Position memory enabled" : "Position memory disabled");
  };

  const iconComponents = {
    circle: Circle,
    square: Square,
    heart: Heart,
    star: Star
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBackClick}
            variant="outline"
            size="icon"
            className="border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Icon Settings</h1>
        </div>

        {/* Preview Card */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Icon Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div 
              className="w-16 h-16 flex items-center justify-center transition-all duration-300"
              style={previewStyle}
            >
              <Eye className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Style Selection */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Icon Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(iconComponents) as Array<keyof typeof iconComponents>).map((style) => {
                const Icon = iconComponents[style];
                const isSelected = settings.style === style;
                
                return (
                  <Button
                    key={style}
                    onClick={() => handleStyleChange(style)}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-16 flex flex-col gap-2 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs capitalize">{style}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transparency */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Transparency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">
                Opacity: {settings.transparency}%
              </Label>
              <Slider
                value={[settings.transparency]}
                onValueChange={handleTransparencyChange}
                min={20}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Lower values make the icon more transparent
            </p>
          </CardContent>
        </Card>

        {/* Feedback Settings */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Feedback Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-feedback" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Sound Feedback
              </Label>
              <Switch
                id="sound-feedback"
                checked={settings.soundFeedback}
                onCheckedChange={handleSoundFeedbackChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="haptic-feedback" className="flex items-center gap-2">
                <Vibrate className="w-4 h-4" />
                Haptic Feedback
              </Label>
              <Switch
                id="haptic-feedback"
                checked={settings.hapticFeedback}
                onCheckedChange={handleHapticFeedbackChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="remember-position" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Remember Position
              </Label>
              <Switch
                id="remember-position"
                checked={settings.rememberPosition}
                onCheckedChange={handleRememberPositionChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Sound: Play audio when icon is tapped</p>
              <p>• Haptic: Vibrate when icon is tapped</p>
              <p>• Position: Save icon location across app sessions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};