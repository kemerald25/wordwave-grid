import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CyberGridProps {
  lowPowerMode?: boolean;
  onToggleLowPower?: (enabled: boolean) => void;
}

export function CyberGrid({ lowPowerMode = false, onToggleLowPower }: CyberGridProps) {
  const [isLowPower, setIsLowPower] = useState(lowPowerMode);

  useEffect(() => {
    const body = document.body;
    if (isLowPower) {
      body.classList.add('low-power');
    } else {
      body.classList.remove('low-power');
    }

    return () => body.classList.remove('low-power');
  }, [isLowPower]);

  const handleToggle = () => {
    const newValue = !isLowPower;
    setIsLowPower(newValue);
    onToggleLowPower?.(newValue);
  };

  return (
    <>
      {/* Animated Grid Background */}
      <div className="cyber-grid" />
      
      {/* Low Power Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="glass-panel text-xs hover:shadow-neon transition-all duration-300"
          title={isLowPower ? "Enable animations" : "Low power mode"}
        >
          <Settings className="w-3 h-3 mr-1" />
          {isLowPower ? "Low Power" : "Full FX"}
        </Button>
      </div>
    </>
  );
}