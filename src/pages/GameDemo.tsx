import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { AnimatedWordReveal } from '@/components/AnimatedWordReveal';
import { PlayerTimer } from '@/components/PlayerTimer';
import { WordInput } from '@/components/WordInput';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const demoWords = [
  'CYBER', 'REACTOR', 'RAIN', 'NEXUS', 'STORM', 'MATRIX', 'XENON', 'NOVA'
];

export default function GameDemo() {
  const [currentWord, setCurrentWord] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  const startDemo = () => {
    setIsPlaying(true);
    setWordIndex(0);
    setScore(0);
    setCurrentWord(demoWords[0]);
    setShowTimer(true);
  };

  const nextWord = () => {
    const next = (wordIndex + 1) % demoWords.length;
    setWordIndex(next);
    setCurrentWord(demoWords[next]);
    setScore(prev => prev + demoWords[wordIndex].length);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentWord('');
    setShowTimer(false);
    setScore(0);
    setWordIndex(0);
  };

  const handleTimerComplete = () => {
    nextWord();
  };

  const handleWordSubmit = (word: string) => {
    console.log('Submitted word:', word);
    // In a real game, this would validate the word
    setScore(prev => prev + word.length * 2); // Bonus for user input
    nextWord();
  };

  const getLastLetter = () => {
    if (!currentWord) return '';
    return currentWord.charAt(currentWord.length - 1);
  };

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 p-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-brand-500 animate-neon-glow">
            WordWave Demo
          </h1>
          <p className="text-muted-foreground max-w-md">
            Experience the chain reaction word game with stunning animations
          </p>
        </div>

        {/* Game Area */}
        <div className="w-full max-w-2xl space-y-8">
          {/* Score */}
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="glass-panel inline-block px-6 py-3 rounded-2xl">
                <div className="text-2xl font-bold text-brand-500">
                  Score: {score}
                </div>
              </div>
            </motion.div>
          )}

          {/* Timer */}
          {showTimer && (
            <div className="flex justify-center">
              <PlayerTimer
                duration={8}
                isActive={isPlaying}
                onComplete={handleTimerComplete}
                size="lg"
              />
            </div>
          )}

          {/* Word Display */}
          <div className="min-h-[150px] flex items-center justify-center">
            {isPlaying && currentWord ? (
              <AnimatedWordReveal
                word={currentWord}
                isActive={true}
                size="xl"
                color="brand"
                onAnimationComplete={() => {
                  setTimeout(nextWord, 2000);
                }}
              />
            ) : (
              <div className="text-center space-y-4">
                <div className="text-6xl text-muted-foreground">⚡</div>
                <div className="text-xl text-muted-foreground">
                  Ready to see the magic?
                </div>
              </div>
            )}
          </div>

          {/* Word Input Demo */}
          {isPlaying && currentWord && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
            >
              <WordInput
                onSubmit={handleWordSubmit}
                placeholder="Enter a word..."
                lastWord={currentWord}
                requiredStartLetter={getLastLetter()}
                showHint={true}
              />
            </motion.div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isPlaying ? (
              <Button
                onClick={startDemo}
                className="btn-neon text-lg px-8 py-4 rounded-2xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Demo
              </Button>
            ) : (
              <Button
                onClick={resetDemo}
                variant="outline"
                className="border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/10 text-lg px-8 py-4 rounded-2xl"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset Demo
              </Button>
            )}
            
            <Button
              onClick={() => navigate('/lobby')}
              variant="outline"
              className="border-neon-magenta/30 hover:border-neon-magenta hover:bg-neon-magenta/10 text-lg px-8 py-4 rounded-2xl"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Lobby
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-brand-500 mb-2">Animated Reveals</h3>
            <p className="text-sm text-muted-foreground">
              Watch words come to life with stunning letter-by-letter animations
            </p>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="font-bold text-neon-magenta mb-2">Chain Reaction</h3>
            <p className="text-sm text-muted-foreground">
              Each word must start with the last letter of the previous word
            </p>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <div className="text-4xl mb-3">⏱️</div>
            <h3 className="font-bold text-neon-green mb-2">Time Pressure</h3>
            <p className="text-sm text-muted-foreground">
              Quick thinking and fast typing are key to victory
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}