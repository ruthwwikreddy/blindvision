import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Trash2, Eye, BarChart, Clock } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { useTranslation } from 'react-i18next';

interface PrivacySettingsProps {
  onBackClick: () => void;
  speakText: (text: string) => void;
}

export const PrivacySettings = ({ onBackClick, speakText }: PrivacySettingsProps) => {
  const { settings, updateSettings, resetSettings } = usePrivacySettings();
  const { t } = useTranslation();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
    speakText(`${key} ${value ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBackClick}
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t('privacy.title')}</h1>
        </div>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              {t('privacy.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="local-processing" className="text-base">
                  {t('privacy.localProcessing')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('privacy.localProcessingDesc')}
                </p>
              </div>
              <Switch
                id="local-processing"
                checked={settings.localProcessing}
                onCheckedChange={(checked) => handleToggle('localProcessing', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="privacy-mode" className="text-base">
                  {t('privacy.privacyMode')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('privacy.privacyModeDesc')}
                </p>
              </div>
              <Switch
                id="privacy-mode"
                checked={settings.privacyMode}
                onCheckedChange={(checked) => handleToggle('privacyMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-delete" className="text-base">
                  {t('privacy.autoDelete')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('privacy.autoDeleteDesc')}
                </p>
              </div>
              <Switch
                id="auto-delete"
                checked={settings.autoDelete}
                onCheckedChange={(checked) => handleToggle('autoDelete', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="anonymous-stats" className="text-base">
                  {t('privacy.anonymousStats')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('privacy.anonymousStatsDesc')}
                </p>
              </div>
              <Switch
                id="anonymous-stats"
                checked={settings.anonymousStats}
                onCheckedChange={(checked) => handleToggle('anonymousStats', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">{t('privacy.dataRetention')}</Label>
              <Select
                value={settings.dataRetention}
                onValueChange={(value: any) => updateSettings({ dataRetention: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t('privacy.dataRetentionOptions.immediate')}</SelectItem>
                  <SelectItem value="hour">{t('privacy.dataRetentionOptions.hour')}</SelectItem>
                  <SelectItem value="day">{t('privacy.dataRetentionOptions.day')}</SelectItem>
                  <SelectItem value="week">{t('privacy.dataRetentionOptions.week')}</SelectItem>
                  <SelectItem value="month">{t('privacy.dataRetentionOptions.month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              className="w-full gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};