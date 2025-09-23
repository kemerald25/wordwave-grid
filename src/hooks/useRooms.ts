import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export interface GameRoom {
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
  // Joined data
  host?: {
    display_name: string;
    avatar_url?: string;
  };
  players: Array<{
    id: string;
    user_id: string;
    display_name: string;
    avatar_url?: string;
    score: number;
    is_active: boolean;
    turn_order: number;
  }>;
}

export function useRooms() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { appUser } = useAuth();

  const fetchRooms = useCallback(async () => {
    try {
      setError(null);

      // Fetch rooms with host info and player counts
      const { data: roomsData, error: roomsError } = await supabase
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
        .in("status", ["lobby", "in_game"])
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;

      // Type-safe mapping
      const typedRooms: GameRoom[] = (roomsData || []).map((room) => ({
        ...room,
        status: room.status as "lobby" | "in_game" | "finished",
        players: (room.players || []).sort(
          (a, b) => a.turn_order - b.turn_order
        ),
      }));

      setRooms(typedRooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Failed to load rooms");
      if (!isLoading) {
        // Only show toast if not initial load
        toast.error("Failed to load rooms");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const createRoom = async (roomData: {
    name: string;
    maxPlayers: number;
    roundTime: number;
    rounds: number;
  }) => {
    if (!appUser) {
      toast.error("Please sign in to create a room");
      return null;
    }

    try {
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          name: roomData.name,
          host_id: appUser.id,
          max_players: roomData.maxPlayers,
          round_time_seconds: roomData.roundTime,
          rounds: roomData.rounds,
          status: "lobby",
        })
        .select()
        .single();

      if (error) throw error;

      // Add the host as a player
      const { error: playerError } = await supabase
        .from("game_players")
        .insert({
          room_id: room.id,
          user_id: appUser.id,
          display_name: appUser.display_name || "Player",
          avatar_url: appUser.avatar_url,
          turn_order: 0,
          score: 0,
          is_active: true,
        });

      if (playerError) throw playerError;

      toast.success("Room created successfully!");
      await fetchRooms(); // Refresh the rooms list
      return room.id;
    } catch (err) {
      console.error("Error creating room:", err);
      toast.error("Failed to create room");
      return null;
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!appUser) {
      toast.error("Please sign in to join a room");
      return false;
    }

    try {
      // Check if room exists and has space
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select(
          `
          *,
          players:game_players(count)
        `
        )
        .eq("id", roomId)
        .eq("status", "lobby")
        .single();

      if (roomError) throw roomError;

      if (!room) {
        toast.error("Room not found or no longer available");
        return false;
      }

      const playerCount = room.players?.[0]?.count || 0;
      if (playerCount >= room.max_players) {
        toast.error("Room is full");
        return false;
      }

      // Check if already in room
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", appUser.id)
        .single();

      if (existingPlayer) {
        toast.info("You are already in this room");
        return true;
      }

      // Add player to room
      const { error } = await supabase.from("game_players").insert({
        room_id: roomId,
        user_id: appUser.id,
        display_name: appUser.display_name || "Player",
        avatar_url: appUser.avatar_url,
        turn_order: playerCount,
        score: 0,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Joined room successfully!");
      await fetchRooms();
      return true;
    } catch (err) {
      console.error("Error joining room:", err);
      toast.error("Failed to join room");
      return false;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchRooms();

    // Subscribe to room changes with more specific filters and immediate updates
    const roomsSubscription = supabase
      .channel("rooms-lobby-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: "status=in.(lobby,in_game)",
        },
        (payload) => {
          console.log("Room change detected:", payload);
          // Immediate update for better responsiveness
          if (payload.eventType === "UPDATE" && payload.new) {
            setRooms((prev) =>
              prev.map((room) =>
                room.id === payload.new.id
                  ? {
                      ...room,
                      ...payload.new,
                      status: payload.new.status as
                        | "lobby"
                        | "in_game"
                        | "finished",
                    }
                  : room
              )
            );
          } else if (payload.eventType === "INSERT" && payload.new) {
            // Add new room immediately
            fetchRooms();
          }
          // Still do full fetch for complete data
          setTimeout(fetchRooms, 200);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
        },
        (payload) => {
          console.log("Player change detected:", payload);
          // Immediate refresh for player changes - these are critical for lobby display
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
    };
  }, [fetchRooms]);

  return {
    rooms,
    isLoading,
    error,
    fetchRooms,
    createRoom,
    joinRoom,
  };
}
