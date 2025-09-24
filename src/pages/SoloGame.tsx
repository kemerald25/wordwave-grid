import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { AnimatedWordReveal } from '@/components/AnimatedWordReveal';
import { PlayerTimer } from '@/components/PlayerTimer';
import { WordInput } from '@/components/WordInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Home, Trophy, Zap, Target, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useExternalDictionary } from '@/hooks/useExternalDictionary';

interface SoloGameStats {
  score: number;
  wordsPlayed: number;
  averageTime: number;
  longestWord: string;
  currentStreak: number;
  bestStreak: number;
}

const DIFFICULTY_LEVELS = {
  easy: { timeLimit: 30, name: 'Easy', color: 'text-green-500' },
  medium: { timeLimit: 20, name: 'Medium', color: 'text-yellow-500' },
  hard: { timeLimit: 15, name: 'Hard', color: 'text-red-500' },
  expert: { timeLimit: 10, name: 'Expert', color: 'text-purple-500' }
};

export default function SoloGame() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { validateWord } = useExternalDictionary();
  
  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS>('medium');
  const [currentWord, setCurrentWord] = useState('');
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [revealWord, setRevealWord] = useState('');
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [turnStartTime, setTurnStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  
  // Game stats
  const [stats, setStats] = useState<SoloGameStats>({
    score: 0,
    wordsPlayed: 0,
    averageTime: 0,
    longestWord: '',
    currentStreak: 0,
    bestStreak: 0
  });
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setCurrentWord('');
    setUsedWords(new Set());
    setStats({
      score: 0,
      wordsPlayed: 0,
      averageTime: 0,
      longestWord: '',
      currentStreak: 0,
      bestStreak: 0
    });
    setGameStartTime(Date.now());
    startTurn();
    toast.success('Solo game started! 🎮');
  };

  const startTurn = () => {
    const timeLimit = DIFFICULTY_LEVELS[difficulty].timeLimit;
    setTimeLeft(timeLimit);
    setTurnStartTime(Date.now());
    totalTimeRef.current = timeLimit;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeOut = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // End current streak
    setStats(prev => ({
      ...prev,
      currentStreak: 0
    }));
    
    toast.error('Time\'s up! ⏰');
    
    // Continue game with a random word
    generateRandomWord();
  };

  const generateRandomWord = () => {
    const commonWords = [
      'apple', 'echo', 'orange', 'elephant', 'table', 'eagle', 'door', 'river',
      'rainbow', 'wolf', 'fire', 'energy', 'yarn', 'night', 'tree', 'earth',
      'house', 'sun', 'moon', 'nature', 'game', 'time', 'space', 'chair',
      'book', 'keyboard', 'dance', 'music', 'art', 'text', 'tiger', 'rabbit'
    ];
    
    let newWord;
    do {
      newWord = commonWords[Math.floor(Math.random() * commonWords.length)];
    } while (usedWords.has(newWord.toLowerCase()));
    
    setCurrentWord(newWord);
    setRevealWord(newWord);
    setShowWordReveal(true);
    setUsedWords(prev => new Set([...prev, newWord.toLowerCase()]));
    
    setTimeout(() => {
      startTurn();
    }, 2000);
  };

  const handleWordSubmit = async (word: string) => {
    if (!isPlaying || isSubmitting || gameOver) return;

    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      toast.error('Please enter a word');
      return;
    }

    setIsSubmitting(true);
    const timeTaken = Date.now() - turnStartTime;

    try {
      // Check if word was already used
      if (usedWords.has(trimmedWord)) {
        toast.error('Word already used!');
        setStats(prev => ({ ...prev, currentStreak: 0 }));
        setIsSubmitting(false);
        generateRandomWord();
        return;
      }

      // Validate word with external dictionary
      const validation = await validateWord(trimmedWord);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid word');
        setStats(prev => ({ ...prev, currentStreak: 0 }));
        setIsSubmitting(false);
        generateRandomWord();
        return;
      }

      // Check chain rule (if there's a current word)
      if (currentWord) {
        const lastChar = currentWord.slice(-1).toLowerCase();
        const firstChar = trimmedWord.charAt(0);
        if (firstChar !== lastChar) {
          toast.error(`Word must start with "${lastChar.toUpperCase()}"`);
          setStats(prev => ({ ...prev, currentStreak: 0 }));
          setIsSubmitting(false);
          generateRandomWord();
          return;
        }
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Calculate points
      const basePoints = trimmedWord.length;
      const timeBonus = Math.max(0, Math.ceil((totalTimeRef.current - (timeTaken / 1000)) / totalTimeRef.current * 10));
      const streakBonus = Math.floor(stats.currentStreak / 5) * 5;
      const totalPoints = basePoints + timeBonus + streakBonus;

      // Update stats
      const newStreak = stats.currentStreak + 1;
      const newWordsPlayed = stats.wordsPlayed + 1;
      const newAverageTime = ((stats.averageTime * stats.wordsPlayed) + (timeTaken / 1000)) / newWordsPlayed;
      const newLongestWord = trimmedWord.length > stats.longestWord.length ? trimmedWord : stats.longestWord;

      setStats(prev => ({
        score: prev.score + totalPoints,
        wordsPlayed: newWordsPlayed,
        averageTime: newAverageTime,
        longestWord: newLongestWord,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak)
      }));

      // Add word to used words
      setUsedWords(prev => new Set([...prev, trimmedWord]));

      // Show word reveal
      setCurrentWord(trimmedWord);
      setRevealWord(trimmedWord);
      setShowWordReveal(true);

      // Show points toast
      toast.success(`+${totalPoints} points! ${timeBonus > 0 ? `(+${timeBonus} time bonus)` : ''} ${streakBonus > 0 ? `(+${streakBonus} streak bonus)` : ''}`);

      // Continue game after animation
      setTimeout(() => {
        startTurn();
      }, 2000);

    } catch (error) {
      console.error('Error validating word:', error);
      toast.error('Error validating word');
      setStats(prev => ({ ...prev, currentStreak: 0 }));
      generateRandomWord();
    } finally {
      setIsSubmitting(false);
    }
  };

  const pauseGame = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resumeGame = () => {
    setIsPaused(false);
    startTurn();
  };

  const endGame = async () => {
    setGameOver(true);
    setIsPlaying(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Save stats to leaderboard if user is authenticated
    if (appUser && !appUser.is_guest) {
      try {
        // Update or create leaderboard entry
        const { data: existingEntry } = await supabase
          .from('leaderboards')
          .select('*')
          .eq('user_id', appUser.id)
          .single();

        const gameTime = (Date.now() - gameStartTime) / 1000;
        
        if (existingEntry) {
          // Update existing entry
          await supabase
            .from('leaderboards')
            .update({
              total_games: existingEntry.total_games + 1,
              total_points: existingEntry.total_points + stats.score,
              best_streak: Math.max(existingEntry.best_streak, stats.bestStreak),
              average_time_ms: Math.round(((existingEntry.average_time_ms * existingEntry.total_games) + (gameTime * 1000)) / (existingEntry.total_games + 1)),
              favorite_word: stats.longestWord.length > (existingEntry.favorite_word?.length || 0) ? stats.longestWord : existingEntry.favorite_word,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', appUser.id);
        } else {
          // Create new entry
          await supabase
            .from('leaderboards')
            .insert({
              user_id: appUser.id,
              total_games: 1,
              total_wins: 0, // Solo games don't have wins
              total_points: stats.score,
              best_streak: stats.bestStreak,
              average_time_ms: Math.round(gameTime * 1000),
              favorite_word: stats.longestWord
            });
        }

        toast.success('Stats saved to leaderboard! 📊');
      } catch (error) {
        console.error('Error saving stats:', error);
        toast.error('Failed to save stats');
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setIsPaused(false);
    setCurrentWord('');
    setUsedWords(new Set());
    setStats({
      score: 0,
      wordsPlayed: 0,
      averageTime: 0,
      longestWord: '',
      currentStreak: 0,
      bestStreak: 0
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const getRequiredStartLetter = () => {
    if (!currentWord) return '';
    return currentWord.slice(-1).toUpperCase();
  };

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/lobby')}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-500">Solo Challenge</h1>
            <Badge className={`${DIFFICULTY_LEVELS[difficulty].color} bg-transparent border-current`}>
              {DIFFICULTY_LEVELS[difficulty].name} Mode
            </Badge>
          </div>

          <div className="flex gap-2">
            {isPlaying && !gameOver && (
              <Button
                onClick={isPaused ? resumeGame : pauseGame}
                variant="outline"
                className="border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            
            {(isPlaying || gameOver) && (
              <Button
                onClick={resetGame}
                variant="outline"
                className="border-neon-magenta/30 hover:border-neon-magenta hover:bg-neon-magenta/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Game Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-panel p-4 text-center">
              <Trophy className="w-6 h-6 text-brand-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.score}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </Card>
            
            <Card className="glass-panel p-4 text-center">
              <Target className="w-6 h-6 text-neon-magenta mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.currentStreak}</div>
              <div className="text-sm text-muted-foreground">Streak</div>
            </Card>
            
            <Card className="glass-panel p-4 text-center">
              <Zap className="w-6 h-6 text-neon-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.wordsPlayed}</div>
              <div className="text-sm text-muted-foreground">Words</div>
            </Card>
            
            <Card className="glass-panel p-4 text-center">
              <Clock className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {stats.averageTime > 0 ? `${stats.averageTime.toFixed(1)}s` : '0s'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Time</div>
            </Card>
          </div>

          {/* Difficulty Selection */}
          {!isPlaying && !gameOver && (
            <Card className="glass-panel p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 text-center">Choose Difficulty</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(DIFFICULTY_LEVELS).map(([key, level]) => (
                  <Button
                    key={key}
                    onClick={() => setDifficulty(key as keyof typeof DIFFICULTY_LEVELS)}
                    variant={difficulty === key ? "default" : "outline"}
                    className={`${difficulty === key ? 'btn-neon' : 'border-brand-500/30 hover:border-brand-500'} p-4 h-auto flex-col`}
                  >
                    <div className={`text-lg font-bold ${level.color}`}>{level.name}</div>
                    <div className="text-sm text-muted-foreground">{level.timeLimit}s per turn</div>
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Game Controls */}
          {!isPlaying && !gameOver && (
            <div className="text-center">
              <Button
                onClick={startGame}
                className="btn-neon text-lg px-8 py-4 rounded-2xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Solo Game
              </Button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <Card className="glass-panel p-8">
                <Trophy className="w-16 h-16 text-brand-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-foreground mb-4">Game Over!</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-500 mb-3">Final Stats</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Final Score:</span>
                        <span className="font-bold text-foreground">{stats.score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Words Played:</span>
                        <span className="font-bold text-foreground">{stats.wordsPlayed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best Streak:</span>
                        <span className="font-bold text-foreground">{stats.bestStreak}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Time:</span>
                        <span className="font-bold text-foreground">{stats.averageTime.toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-neon-magenta mb-3">Achievements</h3>
                    <div className="space-y-2 text-sm">
                      {stats.longestWord && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Longest Word:</span>
                          <span className="font-bold text-foreground">{stats.longestWord}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Difficulty:</span>
                        <span className={`font-bold ${DIFFICULTY_LEVELS[difficulty].color}`}>
                          {DIFFICULTY_LEVELS[difficulty].name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 justify-center mt-6">
                  <Button onClick={startGame} className="btn-neon">
                    <Play className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                  <Button 
                    onClick={() => navigate('/leaderboard')} 
                    variant="outline"
                    className="border-brand-500/30 hover:border-brand-500"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    View Leaderboard
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Game Play Area */}
          {isPlaying && !gameOver && !isPaused && (
            <div className="space-y-8">
              {/* Timer */}
              <div className="flex justify-center">
                <PlayerTimer
                  duration={DIFFICULTY_LEVELS[difficulty].timeLimit}
                  isActive={true}
                  size="lg"
                />
              </div>

              {/* Current Word Display */}
              <div className="min-h-[150px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {showWordReveal && revealWord ? (
                    <AnimatedWordReveal
                      key={revealWord}
                      word={revealWord}
                      isActive={true}
                      size="xl"
                      color="brand"
                      onAnimationComplete={() => setShowWordReveal(false)}
                    />
                  ) : currentWord ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <div className="text-6xl font-bold text-brand-500 mb-2 animate-neon-glow">
                        {currentWord.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Current word
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl text-muted-foreground mb-2">🎯</div>
                      <div className="text-xl text-muted-foreground mb-2">
                        Start with any word!
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Begin your solo challenge
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Word Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto"
              >
                <WordInput
                  onSubmit={handleWordSubmit}
                  onChange={() => {}} // No typing indicators needed for solo
                  placeholder={!currentWord ? "Start with any word..." : "Enter your word..."}
                  lastWord={currentWord}
                  requiredStartLetter={getRequiredStartLetter()}
                  showHint={!!currentWord}
                  disabled={isSubmitting}
                />
              </motion.div>

              {/* End Game Button */}
              <div className="text-center">
                <Button
                  onClick={endGame}
                  variant="outline"
                  className="border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                >
                  End Game
                </Button>
              </div>
            </div>
          )}

          {/* Paused State */}
          {isPaused && (
            <div className="text-center">
              <Card className="glass-panel p-8 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-foreground mb-4">Game Paused</h2>
                <p className="text-muted-foreground mb-6">
                  Take your time! Resume when you're ready.
                </p>
                <Button onClick={resumeGame} className="btn-neon">
                  Resume Game
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}