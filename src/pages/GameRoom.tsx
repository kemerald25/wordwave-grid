import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AnimatedWordReveal } from "@/components/AnimatedWordReveal";
import { PlayerTimer } from "@/components/PlayerTimer";
import { WordInput } from "@/components/WordInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Users,
  Crown,
  Trophy,
  Play,
  ArrowLeft,
  Zap,
  Share2,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSync } from "@/hooks/useGameSync";
import { useExternalDictionary } from "@/hooks/useExternalDictionary";
import { useGameSharing } from "@/hooks/useGameSharing";
import { useGameNotifications } from "@/hooks/useGameNotifications";

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
  status: "lobby" | "in_game" | "finished";
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
  const [currentWord, setCurrentWord] = useState("");
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [lastSubmittedWord, setLastSubmittedWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typingPlayers, setTypingPlayers] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { validateWord } = useExternalDictionary();
  const { shareGameInvite, shareGameResult } = useGameSharing();
  const { notifyPlayerJoined, notifyGameStarted } = useGameNotifications();

  // Enhanced real-time synchronization with immediate state updates
  const { broadcastUpdate, broadcastTyping, forceRefresh, isConnected } = useGameSync({
    roomId: roomId || "",
    onRoomUpdate: (updatedRoom) => {
      console.log("🎮 Room updated via sync:", updatedRoom);
      
      // Immediately update room state
      setRoom(updatedRoom);

      // Handle game state changes with immediate feedback
      if (updatedRoom.status === "in_game" && !gameStarted) {
        setGameStarted(true);
        toast.success("Game started! 🎮");
      }

      // Handle turn changes with immediate feedback
      if (updatedRoom.current_player_turn && appUser) {
        const myTurn = updatedRoom.current_player_turn === appUser.id;
        const wasMyTurn = isMyTurn;
        
        // Update turn state immediately
        setIsMyTurn(myTurn);

        if (myTurn && gameStarted && !wasMyTurn) {
          toast.info("It's your turn! ⚡");
          startTurnTimer(updatedRoom.round_time_seconds);
        } else if (!myTurn && timerRef.current) {
          clearInterval(timerRef.current);
          setTimeLeft(0);
        }
      }

      // Handle word updates with immediate feedback
      if (updatedRoom.last_word !== currentWord) {
        const newWord = updatedRoom.last_word || "";
        console.log("🔄 Word updated:", currentWord, "->", newWord);
        setCurrentWord(newWord);
        
        // If there's a new word and it's different, show reveal animation
        if (newWord && newWord !== currentWord && newWord !== lastSubmittedWord) {
          setLastSubmittedWord(newWord);
          setShowWordReveal(true);
          
          // Auto-hide reveal after animation
          setTimeout(() => {
            setShowWordReveal(false);
          }, 2000);
        }
      }
    },
    onPlayerUpdate: (players) => {
      console.log("👥 Players updated via sync:", players);
      setRoom((prev) => (prev ? { ...prev, players } : null));
    },
    onMoveUpdate: (move) => {
      console.log("🎯 Move updated via sync:", move);
      
      if (move.is_valid && move.word) {
        // Immediately update the word state
        setCurrentWord(move.word);
        setLastSubmittedWord(move.word);
        setShowWordReveal(true);

        // Show points awarded toast for the player who made the move
        if (move.user_id === appUser?.id && move.points_awarded) {
          toast.success(`+${move.points_awarded} points!`);
        }
        
        // Auto-hide reveal animation
        setTimeout(() => {
          setShowWordReveal(false);
        }, 2000);
      } else if (move.user_id === appUser?.id && !move.is_valid) {
        toast.error(`Invalid word: ${move.validation_reason?.replace("_", " ")}`);
      }
    },
    onPlayerJoin: async (player) => {
      console.log("🆕 Player joined via sync:", player);
      
      if (room && appUser?.id !== player.user_id) {
        toast.success(`${player.display_name} joined!`);
        await notifyPlayerJoined(room.id, room.name, player.display_name);
      }
    },
    onPlayerLeave: (playerId) => {
      console.log("👋 Player left via sync:", playerId);
      toast.info("Player left the game");
    },
    onGameStateChange: (gameState) => {
      console.log("🔄 Complete game state updated via sync");
      // Additional game state handling if needed
    },
    onTypingUpdate: (isTyping, playerName) => {
      if (isTyping && playerName && playerName !== appUser?.display_name) {
        setTypingPlayers(prev => new Set([...prev, playerName]));
        
        // Auto-clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingPlayers(prev => {
            const newSet = new Set(prev);
            newSet.delete(playerName);
            return newSet;
          });
        }, 3000);
      } else if (playerName) {
        setTypingPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerName);
          return newSet;
        });
      }
    },
  });

  useEffect(() => {
    if (!roomId) {
      navigate("/lobby");
      return;
    }

    // Initial room fetch
    fetchRoom();

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomId]);

  // Add beforeunload handler to prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameStarted && appUser && room) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [gameStarted, appUser, room]);

  const fetchRoom = async () => {
    try {
      const { data: roomData, error } = await supabase
        .from("game_rooms")
        .select(
          `
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
        `
        )
        .eq("id", roomId)
        .single();

      if (error) throw error;

      const typedRoom: GameRoom = {
        ...roomData,
        status: roomData.status as "lobby" | "in_game" | "finished",
        players: (roomData.players || []).sort(
          (a, b) => a.turn_order - b.turn_order
        ),
      };

      setRoom(typedRoom);
      setGameStarted(typedRoom.status === "in_game");

      // Check if it's the current user's turn
      if (typedRoom.current_player_turn && appUser) {
        const myTurn = typedRoom.current_player_turn === appUser.id;
        setIsMyTurn(myTurn);

        // Start timer if it's my turn and game is active
        if (myTurn && typedRoom.status === "in_game") {
          startTurnTimer(typedRoom.round_time_seconds);
        } else if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }

      // Set current word if game is in progress
      if (typedRoom.last_word) {
        setCurrentWord(typedRoom.last_word);
      }
    } catch (error) {
      console.error("Error fetching room:", error);
      toast.error("Failed to load room");
      navigate("/lobby");
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    if (!room || !appUser || room.host_id !== appUser.id) {
      toast.error("Only the host can start the game");
      return;
    }

    if (room.players.length < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }

    try {
      // Find the first non-host player to go first
      const firstPlayer =
        room.players.find(
          (p) =>
            p.user_id !== room.host_id &&
            p.turn_order ===
              Math.min(
                ...room.players
                  .filter((p) => p.user_id !== room.host_id)
                  .map((p) => p.turn_order)
              )
        ) || room.players[1]; // Fallback to second player if no non-host found

      // Optimistically update local state first
      const updatedRoom = {
        ...room,
        status: "in_game" as const,
        current_player_turn: firstPlayer?.user_id,
        current_round: 1,
        last_word: null,
      };
      setRoom(updatedRoom);
      setGameStarted(true);
      setCurrentWord("");

      if (firstPlayer?.user_id === appUser.id) {
        setIsMyTurn(true);
        startTurnTimer(room.round_time_seconds);
      } else {
        setIsMyTurn(false);
      }

      // Then update database
      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "in_game",
          started_at: new Date().toISOString(),
          current_round: 1,
          current_player_turn: firstPlayer?.user_id,
          last_word: null,
        })
        .eq("id", roomId);

      if (error) throw error;

      // Create first round
      await supabase.from("game_rounds").insert({
        room_id: roomId,
        round_number: 1,
        started_at: new Date().toISOString(),
      });

      toast.success("Game started!");

      // Broadcast the game start
      broadcastUpdate("game_started", {
        current_player_turn: firstPlayer?.user_id,
        status: "in_game",
      });

      // Notify all players
      await notifyGameStarted(roomId, room.name);

    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
      
      // Revert optimistic update on error
      setGameStarted(false);
      if (room) {
        setRoom({ ...room, status: "lobby" });
      }
    }
  };

  const startTurnTimer = (duration?: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const timerDuration = duration || room?.round_time_seconds || 15;
    setTimeLeft(timerDuration);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTurnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTurnTimeout = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Only handle timeout if it's actually my turn
    if (!isMyTurn || !room || !appUser) return;

    // Move to next player without awarding points
    await nextTurn();
    toast.warning("Time's up! Moving to next player.");
  };

  const nextTurn = async () => {
    if (!room || !appUser) return;

    const currentPlayerIndex = room.players.findIndex(
      (p) => p.user_id === room.current_player_turn
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
    const nextPlayer = room.players[nextPlayerIndex];

    // Optimistically update local state first
    const updatedRoom = {
      ...room,
      current_player_turn: nextPlayer.user_id,
    };
    setRoom(updatedRoom);
    setIsMyTurn(nextPlayer.user_id === appUser.id);

    try {
      await supabase
        .from("game_rooms")
        .update({
          current_player_turn: nextPlayer.user_id,
        })
        .eq("id", roomId);

      // Broadcast turn change
      broadcastUpdate("turn_changed", {
        current_player_turn: nextPlayer.user_id,
      });
    } catch (error) {
      console.error("Error moving to next turn:", error);
      // Revert optimistic update on error
      setRoom(room);
      setIsMyTurn(room.current_player_turn === appUser.id);
    }
  };

  const handleWordSubmit = async (word: string) => {
    if (!room || !appUser || !isMyTurn || isSubmitting) return;

    // Prevent empty submissions
    const trimmedWord = word.trim();
    if (!trimmedWord) {
      toast.error("Please enter a word");
      return;
    }

    setIsSubmitting(true);
    broadcastTyping(false, appUser?.display_name); // Stop typing indicator
    const timeTaken = (room.round_time_seconds - timeLeft) * 1000;

    try {
      // Validate word using external dictionary
      const validation = await validateWord(trimmedWord);

      if (!validation.isValid) {
        toast.error(validation.error || "Invalid word");
        setIsSubmitting(false);
        return;
      }

      // Get current round and player info
      const [roundResult, playerResult] = await Promise.all([
        supabase
          .from("game_rounds")
          .select("id")
          .eq("room_id", roomId)
          .is("ended_at", null)
          .single(),
        Promise.resolve(room.players.find((p) => p.user_id === appUser.id))
      ]);

      if (!roundResult.data) {
        toast.error("No active round found");
        setIsSubmitting(false);
        return;
      }

      if (!playerResult) {
        toast.error("Player not found");
        setIsSubmitting(false);
        return;
      }

      // Clear timer immediately to prevent double submissions
      if (timerRef.current) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
      }

      // Validation logic
      const normalizedWord = trimmedWord.toLowerCase().replace(/[^a-z]/g, "");
      let isValid = true;
      let validationReason = "valid";
      let points = 0;

      // Check chain rule
      if (room.last_word) {
        const lastChar = room.last_word.slice(-1).toLowerCase();
        const firstChar = normalizedWord.charAt(0);
        if (firstChar !== lastChar) {
          isValid = false;
          validationReason = "chain_mismatch";
        }
      }

      // Check for duplicates in this game
      if (isValid) {
        const { data: existingMoves } = await supabase
          .from("game_moves")
          .select("id")
          .eq("room_id", roomId)
          .eq("normalized_word", normalizedWord);

        if (existingMoves && existingMoves.length > 0) {
          isValid = false;
          validationReason = "duplicate_word";
        }
      }

      // Calculate points only if valid
      if (isValid && normalizedWord.length > 0) {
        const basePoints = normalizedWord.length;
        const speedBonus = Math.max(
          0,
          Math.ceil(
            ((room.round_time_seconds * 1000 - timeTaken) /
              (room.round_time_seconds * 1000)) *
              5
          )
        );
        points = basePoints + speedBonus;
      }

      // Get next player
      const currentPlayerIndex = room.players.findIndex(
        (p) => p.user_id === appUser.id
      );
      const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
      const nextPlayer = room.players[nextPlayerIndex];

      // Optimistically update local state FIRST for immediate feedback
      if (isValid) {
        // Update word immediately
        setCurrentWord(trimmedWord);
        setLastSubmittedWord(trimmedWord);
        setShowWordReveal(true);
        
        // Update room state
        const updatedPlayers = room.players.map(p => 
          p.user_id === appUser.id ? { ...p, score: p.score + points } : p
        );
        
        const updatedRoom = {
          ...room,
          last_word: trimmedWord,
          current_player_turn: nextPlayer.user_id,
          players: updatedPlayers,
        };
        
        setRoom(updatedRoom);
        setIsMyTurn(false);
        
        // Show points toast immediately
        if (points > 0) {
          toast.success(`+${points} points!`);
        }

        // Auto-hide reveal animation
        setTimeout(() => {
          setShowWordReveal(false);
        }, 2000);
      } else {
        // Still move to next turn even if word is invalid
        const updatedRoom = {
          ...room,
          current_player_turn: nextPlayer.user_id,
        };
        setRoom(updatedRoom);
        setIsMyTurn(false);
      }

      // Then update database
      await Promise.all([
        // Insert the move
        supabase.from("game_moves").insert({
          round_id: roundResult.data.id,
          room_id: roomId,
          player_id: playerResult.id,
          user_id: appUser.id,
          word: trimmedWord,
          normalized_word: normalizedWord,
          submitted_at: new Date().toISOString(),
          is_valid: isValid,
          validation_reason: validationReason,
          time_taken_ms: timeTaken,
          points_awarded: isValid ? points : 0,
          chain_valid: isValid,
        }),

        // Update player score if valid
        ...(isValid ? [
          supabase
            .from("game_players")
            .update({ score: playerResult.score + points })
            .eq("id", playerResult.id)
        ] : []),

        // Update room state
        supabase
          .from("game_rooms")
          .update({
            ...(isValid ? { last_word: trimmedWord } : {}),
            current_player_turn: nextPlayer.user_id,
          })
          .eq("id", roomId),
      ]);

      // Broadcast the move immediately after database update
      broadcastUpdate("word_submitted", {
        word: trimmedWord,
        user_id: appUser.id,
        points_awarded: isValid ? points : 0,
        is_valid: isValid,
        current_player_turn: nextPlayer.user_id,
      });

    } catch (error) {
      console.error("Error submitting word:", error);
      toast.error("Failed to submit word");
      
      // Revert optimistic updates on error
      if (room) {
        setRoom(room);
        setIsMyTurn(room.current_player_turn === appUser.id);
        setCurrentWord(room.last_word || "");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareGame = () => {
    if (!room) return;

    shareGameInvite({
      roomId: room.id,
      roomName: room.name,
      playerCount: room.players.length,
      maxPlayers: room.max_players,
      isHost: room.host_id === appUser?.id,
      gameStatus: room.status,
    });
  };

  const handleInputChange = (value: string) => {
    // Broadcast typing indicator
    if (value.length > 0) {
      broadcastTyping(true, appUser?.display_name);
    } else {
      broadcastTyping(false, appUser?.display_name);
    }
  };

  const leaveRoom = async () => {
    if (!appUser) return;

    try {
      await supabase
        .from("game_players")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", appUser.id);

      navigate("/lobby");
      toast.success("Left room");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room");
    }
  };

  const rejoinRoom = async () => {
    if (!appUser || !room) return;

    try {
      // Check if player already exists
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", appUser.id)
        .single();

      if (!existingPlayer) {
        // Add player back to the game
        const { error } = await supabase.from("game_players").insert({
          room_id: roomId,
          user_id: appUser.id,
          display_name: appUser.display_name || "Player",
          avatar_url: appUser.avatar_url,
          turn_order: room.players.length,
          score: 0,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Rejoined the game!");
      }
    } catch (error) {
      console.error("Error rejoining room:", error);
      toast.error("Failed to rejoin room");
    }
  };

  const getRequiredStartLetter = () => {
    if (!room?.last_word) return "";
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
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Room not found
            </h1>
            <Button onClick={() => navigate("/lobby")} className="btn-neon">
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left side - Back button and connection status */}
          <div className="flex items-center justify-between md:justify-start md:gap-4">
            <Button
              onClick={() => navigate("/lobby")}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Lobby</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Connection Status */}
            {!isConnected && (
              <div className="flex items-center gap-2 text-yellow-500">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"
                />
                <span className="text-sm hidden sm:inline">
                  Reconnecting...
                </span>
              </div>
            )}
          </div>

          {/* Center - Room info with enhanced styling */}
          <div className="text-center relative">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-block px-6 py-3 glass-panel rounded-2xl bg-gradient-to-r from-brand-500/10 to-neon-magenta/10 border border-brand-500/20 hover:border-brand-500/40 transition-all duration-300"
            >
              <h1 className="text-xl md:text-2xl font-bold text-brand-500 truncate max-w-[200px] md:max-w-none flex items-center gap-2 justify-center">
                <Trophy className="w-5 h-5 text-neon-magenta" />
                {room.name}
              </h1>
              <div className="flex items-center gap-2 justify-center mt-1">
                <Badge
                  className={`${
                    room.status === "lobby"
                      ? "bg-brand-500 hover:bg-brand-600"
                      : room.status === "in_game"
                      ? "bg-neon-magenta hover:bg-neon-magenta/80"
                      : "bg-muted hover:bg-muted/80"
                  } text-black font-medium transition-colors duration-200`}
                >
                  {room.status === "lobby"
                    ? "🏃 Waiting"
                    : room.status === "in_game"
                    ? "🎮 Playing"
                    : "🏁 Finished"}
                </Badge>
                <Badge variant="outline" className="border-neon-cyan/30 text-neon-cyan hover:border-neon-cyan hover:bg-neon-cyan/10 transition-all duration-200">
                  Round {room.current_round || 1}/{room.rounds}
                </Badge>
              </div>
            </motion.div>
          </div>

          {/* Right side - Action buttons with enhanced hover effects */}
          <div className="flex gap-2 justify-center md:justify-end">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleShareGame}
                variant="outline"
                size="sm"
                className="border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/10 hover:shadow-neon transition-all duration-300 group"
              >
                <Share2 className="w-4 h-4 md:mr-2 group-hover:rotate-12 transition-transform duration-200" />
                <span className="hidden md:inline">Share</span>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={forceRefresh}
                variant="outline"
                size="sm"
                className="border-neon-cyan/30 hover:border-neon-cyan hover:bg-neon-cyan/10 hover:shadow-glow transition-all duration-300 group"
                title="Refresh game state"
              >
                <motion.span
                  animate={{ rotate: isConnected ? 0 : 360 }}
                  transition={{ duration: 1, repeat: isConnected ? 0 : Infinity, ease: "linear" }}
                  className="group-hover:rotate-180 transition-transform duration-300"
                >
                  🔄
                </motion.span>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={leaveRoom}
                variant="outline"
                size="sm"
                className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 hover:shadow-lg hover:shadow-destructive/20 transition-all duration-300"
              >
                <span className="hidden sm:inline">Leave Room</span>
                <span className="sm:hidden">Leave</span>
              </Button>
            </motion.div>
          </div>
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
                      ? "ring-2 ring-brand-500 shadow-neon"
                      : ""
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
                        {gameStarted &&
                          room.current_player_turn === player.user_id && (
                            <Zap className="w-4 h-4 text-brand-500 animate-pulse" />
                          )}
                        {typingPlayers.has(player.display_name) && (
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-xs text-brand-500 font-medium"
                          >
                            ⌨️ typing...
                          </motion.div>
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

          {/* Rejoin Option for disconnected players */}
          {gameStarted &&
            !room.players.find((p) => p.user_id === appUser?.id) && (
              <div className="text-center">
                <Button
                  onClick={rejoinRoom}
                  className="btn-magenta text-lg px-8 py-4 rounded-2xl"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Rejoin Game
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  You can rejoin this game even after it started
                </p>
              </div>
            )}

          {/* Game Play Area */}
          {gameStarted && (
            <div className="space-y-8">
              {/* Timer */}
              {isMyTurn && (
                <div className="flex justify-center">
                  <PlayerTimer
                    duration={room.round_time_seconds}
                    isActive={true}
                    size="lg"
                  />
                </div>
              )}

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
                      <div className="text-6xl text-muted-foreground mb-2">
                        🎯
                      </div>
                      <div className="text-xl text-muted-foreground mb-2">
                        {isMyTurn
                          ? "Start with any word!"
                          : "Waiting for first word..."}
                      </div>
                      {isMyTurn && (
                        <div className="text-sm text-muted-foreground">
                          You can start with any word
                        </div>
                      )}
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
                    onChange={handleInputChange}
                    placeholder={
                      !currentWord
                        ? "Start with any word..."
                        : "Enter your word..."
                    }
                    lastWord={currentWord}
                    requiredStartLetter={getRequiredStartLetter()}
                    showHint={!!currentWord} // Only show hint after first word
                    disabled={isSubmitting}
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
                        : `${
                            room.players.find(
                              (p) => p.user_id === room.current_player_turn
                            )?.display_name || "Someone"
                          }'s turn`}
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