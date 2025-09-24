import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Trophy, Gamepad2, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  {
    path: '/lobby',
    icon: Home,
    label: 'Lobby',
    color: 'text-brand-500'
  },
  {
    path: '/leaderboard',
    icon: Trophy,
    label: 'Leaderboard',
    color: 'text-neon-magenta'
  },
  {
    path: '/solo',
    icon: Target,
    label: 'Solo',
    color: 'text-neon-green'
  }
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on certain pages
  const hiddenPaths = ['/'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  // Don't show in game rooms
  if (location.pathname.startsWith('/room/')) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-panel border-t border-brand-500/20 backdrop-blur-xl">
        <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={cn(
                  "relative p-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-brand-500/20 shadow-neon" 
                    : "hover:bg-brand-500/10"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    isActive ? item.color : "text-current"
                  )} />
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl border border-brand-500/50"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                
                <span className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isActive ? item.color : "text-current"
                )}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}