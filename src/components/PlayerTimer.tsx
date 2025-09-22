import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';

interface PlayerTimerProps {
  duration: number; // in seconds
  isActive: boolean;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PlayerTimer({ 
  duration, 
  isActive, 
  onComplete, 
  size = 'md', 
  showIcon = true 
}: PlayerTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isActive && !isRunning) {
      setTimeLeft(duration);
      setIsRunning(true);
    } else if (!isActive) {
      setIsRunning(false);
    }
  }, [isActive, duration, isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onComplete]);

  const progress = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-20 h-20 text-xl',
    lg: 'w-24 h-24 text-2xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (!isActive && timeLeft === duration) {
    return (
      <div className={`${sizeClasses[size]} glass-panel rounded-full flex items-center justify-center border-border`}>
        <Clock className={`${iconSizes[size]} text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Outer Ring */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg className="w-full h-full -rotate-90 drop-shadow-lg">
          {/* Background Circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="hsl(var(--border))"
            strokeWidth="3"
            fill="transparent"
          />
          
          {/* Progress Circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke={isCritical ? "hsl(var(--destructive))" : isUrgent ? "hsl(var(--neon-magenta))" : "hsl(var(--brand-500))"}
            strokeWidth="3"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className={isUrgent ? "drop-shadow-lg" : ""}
            style={{
              filter: isUrgent ? "drop-shadow(0 0 8px currentColor)" : undefined
            }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`glass-panel rounded-full p-2 ${isCritical ? 'animate-pulse-glow' : ''}`}>
            <div className="text-center">
              {showIcon && timeLeft > 0 && (
                <Zap className={`${iconSizes[size]} mx-auto mb-1 ${isCritical ? 'text-destructive' : isUrgent ? 'text-neon-magenta' : 'text-brand-500'}`} />
              )}
              <div className={`font-bold font-mono ${isCritical ? 'text-destructive animate-neon-glow' : isUrgent ? 'text-neon-magenta' : 'text-brand-500'}`}>
                {timeLeft}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse Effect for Urgent */}
      {isUrgent && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-neon-magenta"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </div>
  );
}