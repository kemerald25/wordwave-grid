import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

interface WordInputProps {
  onSubmit: (word: string) => void;
  disabled?: boolean;
  placeholder?: string;
  lastWord?: string;
  requiredStartLetter?: string;
  maxLength?: number;
  showHint?: boolean;
}

export function WordInput({ 
  onSubmit, 
  disabled = false, 
  placeholder = "Enter your word...",
  lastWord,
  requiredStartLetter,
  maxLength = 20,
  showHint = true
}: WordInputProps) {
  const [word, setWord] = useState('');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    // Validate word starts with required letter
    if (requiredStartLetter && word.length > 0) {
      const startsCorrectly = word.toLowerCase().startsWith(requiredStartLetter.toLowerCase());
      setIsValid(startsCorrectly);
    } else {
      setIsValid(true);
    }
  }, [word, requiredStartLetter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || disabled || !isValid) return;
    
    onSubmit(word.trim());
    setWord('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hint */}
      {showHint && requiredStartLetter && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-3 rounded-lg text-center"
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-neon-magenta" />
            <span className="text-muted-foreground">
              Your word must start with{' '}
              <span className="font-bold text-neon-magenta text-lg mx-1">
                "{requiredStartLetter.toUpperCase()}"
              </span>
              {lastWord && (
                <span className="text-xs">
                  (from "{lastWord}")
                </span>
              )}
            </span>
          </div>
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={`
                bg-input border-2 text-lg px-4 py-3 rounded-xl
                transition-all duration-300 focus:shadow-neon
                ${!isValid 
                  ? 'border-destructive focus:border-destructive focus:ring-destructive' 
                  : 'border-border focus:border-brand-500 focus:ring-brand-500'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
            
            {/* Character Counter */}
            <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
              {word.length}/{maxLength}
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={disabled || !word.trim() || !isValid}
            className={`
              px-6 py-3 rounded-xl font-medium transition-all duration-300
              ${isValid ? 'btn-neon' : 'btn-magenta opacity-50'}
            `}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* Validation Message */}
        {!isValid && word.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/20 rounded-lg p-2"
          >
            Word must start with "{requiredStartLetter?.toUpperCase()}"
          </motion.div>
        )}
      </form>
    </div>
  );
}