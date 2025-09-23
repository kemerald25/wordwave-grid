import { ReactNode } from 'react';
import { CyberGrid } from './CyberGrid';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export function Layout({ children, title, subtitle, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <CyberGrid />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {showHeader && (
          <header className="p-6 text-center animate-fade-in-up">
            <div className="max-w-4xl mx-auto">
              {title && (
                <h1 className="text-4xl md:text-6xl font-bold mb-4 text-brand-500 animate-neon-glow">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          </header>
        )}
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <footer className="p-4 text-center text-sm text-muted-foreground pb-[120px]">
          <div className="glass-panel inline-block px-4 py-2 rounded-lg">
            WordWave • Chain Reaction Word Game
          </div>
        </footer>
      </div>
    </div>
  );
}