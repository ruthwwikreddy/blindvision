import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useBluetoothButton = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const { toast } = useToast();

  const connectButton = useCallback(async () => {
    try {
      if (!('bluetooth' in navigator)) {
        toast({
          title: "Bluetooth Not Available",
          description: "Bluetooth is not supported on this device",
          variant: "destructive"
        });
        return;
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      setDevice(device);
      setIsConnected(true);

      toast({
        title: "Bluetooth Connected",
        description: `Connected to ${device.name || 'Unknown Device'}`,
      });

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDevice(null);
        toast({
          title: "Bluetooth Disconnected",
          description: "Button disconnected",
        });
      });

    } catch (error) {
      console.error('Bluetooth connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Bluetooth device",
        variant: "destructive"
      });
    }
  }, [toast]);

  const disconnectButton = useCallback(() => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setIsConnected(false);
  }, [device]);

  return {
    isConnected,
    device,
    connectButton,
    disconnectButton
  };
};