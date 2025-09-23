import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { AnimatedWordReveal } from '@/components/AnimatedWordReveal';
import { PlayerTimer } from '@/components/PlayerTimer';
import { WordInput } from '@/components/WordInput';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, Crown, Trophy, Play, ArrowLeft, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  score: number;
  is_active: boolean;
  turn_order: number;
}

interface GameRoom {
  id: string;
  name: string;
  host_id: string;
  max_players: number;
  round_time_seconds: number;
  rounds: number;
  status: 'lobby' | 'in_game' | 'finished';
  current_round: number;
  current_player_turn?: string;
  last_word?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  host?: {
    display_name: string;
    avatar_url?: string;
  };
  players: GamePlayer[];
}

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [lastSubmittedWord, setLastSubmittedWord] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby');
      return;
    }
    fetchRoom();
    setupRealtimeSubscription();
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      const { data: roomData, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          host:users!game_rooms_host_id_fkey(display_name, avatar_url),
          players:game_players(
            id,
            user_id,
            display_name,
            avatar_url,
            score,
            is_active,
            turn_order
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;

      const typedRoom: GameRoom = {
        ...roomData,
        status: roomData.status as 'lobby' | 'in_game' | 'finished',
        players: roomData.players || []
      };

      setRoom(typedRoom);
      setGameStarted(typedRoom.status === 'in_game');
      
      // Check if it's the current user's turn
      if (typedRoom.current_player_turn && appUser) {
        setIsMyTurn(typedRoom.current_player_turn === appUser.id);
      }

      // Set current word if game is in progress
      if (typedRoom.last_word) {
        setCurrentWord(typedRoom.last_word);
      }

    } catch (error) {
      console.error('Error fetching room:', error);
      toast.error('Failed to load room');
      navigate('/lobby');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => fetchRoom()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => fetchRoom()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_moves', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const move = payload.new;
            if (move.is_valid) {
              setCurrentWord(move.word);
              setLastSubmittedWord(move.word);
              setShowWordReveal(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const startGame = async () => {
    if (!room || !appUser || room.host_id !== appUser.id) {
      toast.error('Only the host can start the game');
      return;
    }

    if (room.players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    try {
      // Start the game
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'in_game',
          started_at: new Date().toISOString(),
          current_round: 1,
          current_player_turn: room.players.find(p => p.turn_order === 0)?.user_id
        })
        .eq('id', roomId);

      if (error) throw error;

      // Create first round
      await supabase
        .from('game_rounds')
        .insert({
          room_id: roomId,
          round_number: 1,
          started_at: new Date().toISOString()
        });

      toast.success('Game started!');
      setGameStarted(true);
      startTurnTimer();

    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
    }
  };

  const startTurnTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(room?.round_time_seconds || 15);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTurnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTurnTimeout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Move to next player without awarding points
    nextTurn();
  };

  const nextTurn = async () => {
    if (!room) return;

    const currentPlayerIndex = room.players.findIndex(p => p.user_id === room.current_player_turn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
    const nextPlayer = room.players[nextPlayerIndex];

    try {
      await supabase
        .from('game_rooms')
        .update({
          current_player_turn: nextPlayer.user_id
        })
        .eq('id', roomId);

      setIsMyTurn(nextPlayer.user_id === appUser?.id);
      startTurnTimer();

    } catch (error) {
      console.error('Error moving to next turn:', error);
    }
  };

  const handleWordSubmit = async (word: string) => {
    if (!room || !appUser || !isMyTurn) return;

    const timeTaken = (room.round_time_seconds - timeLeft) * 1000;

    try {
      // Get current round
      const { data: currentRound } = await supabase
        .from('game_rounds')
        .select('id')
        .eq('room_id', roomId)
        .is('ended_at', null)
        .single();

      if (!currentRound) {
        toast.error('No active round found');
        return;
      }

      // Get player info
      const player = room.players.find(p => p.user_id === appUser.id);
      if (!player) {
        toast.error('Player not found');
        return;
      }

      // Validate word
      const normalizedWord = word.toLowerCase().trim().replace(/[^a-z]/g, '');
      let isValid = true;
      let validationReason = 'valid';
      let points = 0;

      // Check if word exists in dictionary
      const { data: dictWord } = await supabase
        .from('dictionary_words')
        .select('word')
        .eq('word', normalizedWord)
        .single();

      if (!dictWord) {
        isValid = false;
        validationReason = 'not_in_dictionary';
      }

      // Check chain rule
      if (isValid && room.last_word) {
        const lastChar = room.last_word.slice(-1).toLowerCase();
        const firstChar = normalizedWord.charAt(0);
        if (firstChar !== lastChar) {
          isValid = false;
          validationReason = 'chain_mismatch';
        }
      }

      // Check for duplicates
      if (isValid) {
        const { data: existingMoves } = await supabase
          .from('game_moves')
          .select('id')
          .eq('room_id', roomId)
          .eq('normalized_word', normalizedWord);

        if (existingMoves && existingMoves.length > 0) {
          isValid = false;
          validationReason = 'duplicate_word';
        }
      }

      // Calculate points if valid
      if (isValid) {
        const basePoints = normalizedWord.length;
        const speedBonus = Math.max(0, Math.ceil((room.round_time_seconds * 1000 - timeTaken) / (room.round_time_seconds * 1000) * 5));
        points = basePoints + speedBonus;
      }

      // Insert the move
      const { error: moveError } = await supabase
        .from('game_moves')
        .insert({
          round_id: currentRound.id,
          room_id: roomId,
          player_id: player.id,
          user_id: appUser.id,
          word: word,
          normalized_word: normalizedWord,
          submitted_at: new Date().toISOString(),
          is_valid: isValid,
          validation_reason: validationReason,
          time_taken_ms: timeTaken,
          points_awarded: points,
          chain_valid: isValid
        });

      if (moveError) throw moveError;

      // Update player score and room state if valid
      if (isValid) {
        await supabase
          .from('game_players')
          .update({
            score: player.score + points
          })
          .eq('id', player.id);

        await supabase
          .from('game_rooms')
          .update({ last_word: word })
          .eq('id', roomId);

        toast.success(`+${points} points!`);
      } else {
        toast.error(`Invalid word: ${validationReason.replace('_', ' ')}`);
      }

      // Move to next turn
      nextTurn();

    } catch (error) {
      console.error('Error submitting word:', error);
      toast.error('Failed to submit word');
    }
  };

  const leaveRoom = async () => {
    if (!appUser) return;

    try {
      await supabase
        .from('game_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', appUser.id);

      navigate('/lobby');
      toast.success('Left room');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const getRequiredStartLetter = () => {
    if (!room?.last_word) return '';
    return room.last_word.slice(-1).toUpperCase();
  };

  if (isLoading) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Room not found</h1>
            <Button onClick={() => navigate('/lobby')} className="btn-neon">
              Back to Lobby
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-500">{room.name}</h1>
            <Badge className={`${
              room.status === 'lobby' ? 'bg-brand-500' :
              room.status === 'in_game' ? 'bg-neon-magenta' : 'bg-muted'
            } text-black font-medium`}>
              {room.status === 'lobby' ? 'Waiting' : 
               room.status === 'in_game' ? 'Playing' : 'Finished'}
            </Badge>
          </div>

          <Button
            onClick={leaveRoom}
            variant="outline"
            className="border-destructive/30 hover:border-destructive hover:bg-destructive/10"
          >
            Leave Room
          </Button>
        </div>

        {/* Game Area */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Players */}
          <Card className="glass-panel p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              Players ({room.players.length}/{room.max_players})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {room.players.map((player) => (
                <motion.div
                  key={player.id}
                  className={`glass-panel p-4 rounded-xl ${
                    gameStarted && room.current_player_turn === player.user_id
                      ? 'ring-2 ring-brand-500 shadow-neon'
                      : ''
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-3">
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.display_name}
                        className="w-10 h-10 rounded-full border-2 border-brand-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-neon flex items-center justify-center text-black font-bold">
                        {player.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {player.display_name}
                        </span>
                        {room.host_id === player.user_id && (
                          <Crown className="w-4 h-4 text-neon-magenta" />
                        )}
                        {gameStarted && room.current_player_turn === player.user_id && (
                          <Zap className="w-4 h-4 text-brand-500 animate-pulse" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Score: {player.score}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Game Controls */}
          {!gameStarted && room.host_id === appUser?.id && (
            <div className="text-center">
              <Button
                onClick={startGame}
                className="btn-neon text-lg px-8 py-4 rounded-2xl"
                disabled={room.players.length < 2}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
              {room.players.length < 2 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Need at least 2 players to start
                </p>
              )}
            </div>
          )}

          {/* Game Play Area */}
          {gameStarted && (
            <div className="space-y-8">
              {/* Timer */}
              <div className="flex justify-center">
                <PlayerTimer
                  duration={room.round_time_seconds}
                  isActive={true}
                  size="lg"
                />
              </div>

              {/* Current Word Display */}
              <div className="min-h-[150px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {showWordReveal && lastSubmittedWord ? (
                    <AnimatedWordReveal
                      key={lastSubmittedWord}
                      word={lastSubmittedWord}
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
                        Last word played
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl text-muted-foreground mb-2">⚡</div>
                      <div className="text-xl text-muted-foreground">
                        Waiting for first word...
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Word Input */}
              {isMyTurn && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto"
                >
                  <WordInput
                    onSubmit={handleWordSubmit}
                    placeholder="Enter your word..."
                    lastWord={currentWord}
                    requiredStartLetter={getRequiredStartLetter()}
                    showHint={true}
                  />
                </motion.div>
              )}

              {/* Turn Indicator */}
              {!isMyTurn && (
                <div className="text-center">
                  <div className="glass-panel inline-block px-6 py-3 rounded-2xl">
                    <div className="text-lg text-muted-foreground">
                      {room.current_player_turn === appUser?.id 
                        ? "Your turn!" 
                        : `${room.players.find(p => p.user_id === room.current_player_turn)?.display_name || 'Someone'}'s turn`
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}