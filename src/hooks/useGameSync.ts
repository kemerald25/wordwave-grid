/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

interface GameSyncOptions {
  roomId: string;
  onRoomUpdate?: (room: any) => void;
  onPlayerUpdate?: (players: any[]) => void;
  onMoveUpdate?: (move: any) => void;
  onPlayerJoin?: (player: any) => void;
  onPlayerLeave?: (playerId: string) => void;
  onGameStateChange?: (state: any) => void;
  onTypingUpdate?: (isTyping: boolean, playerName?: string) => void;
}

export function useGameSync({
  roomId,
  onRoomUpdate,
  onPlayerUpdate,
  onMoveUpdate,
  onPlayerJoin,
  onPlayerLeave,
  onGameStateChange,
  onTypingUpdate,
}: GameSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounced fetch to prevent multiple simultaneous calls
  const debouncedFetchCompleteRoomData = useCallback(
    async (immediate = false) => {
      if (!roomId || isRefreshing) return;

      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      // If not immediate and we fetched recently, debounce
      if (!immediate && timeSinceLastFetch < 500) {
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(() => {
          debouncedFetchCompleteRoomData(true);
        }, 500 - timeSinceLastFetch);
        return;
      }

      try {
        setIsRefreshing(true);
        lastFetchTimeRef.current = now;

        console.log("🔄 Fetching complete room data...");

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

        if (error) {
          console.error("Error fetching room data:", error);
          return;
        }

        const typedRoom = {
          ...roomData,
          status: roomData.status as "lobby" | "in_game" | "finished",
          players: (roomData.players || []).sort(
            (a, b) => a.turn_order - b.turn_order
          ),
        };

        console.log("✅ Room data fetched successfully:", typedRoom);

        // Call all update handlers with fresh data
        onRoomUpdate?.(typedRoom);
        onPlayerUpdate?.(typedRoom.players);
        onGameStateChange?.(typedRoom);
      } catch (error) {
        console.error("Error fetching complete room data:", error);
      } finally {
        setIsRefreshing(false);
      }
    },
    [roomId, onRoomUpdate, onPlayerUpdate, onGameStateChange, isRefreshing]
  );

  const setupRealtimeSync = useCallback(() => {
    if (!roomId) return;

    // Clean up existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing channel");
      supabase.removeChannel(channelRef.current);
    }

    console.log(`🔄 Setting up real-time sync for room: ${roomId}`);

    const channel = supabase
      .channel(`game-room-${roomId}`, {
        config: {
          presence: { key: roomId },
          broadcast: { self: false, ack: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          console.log(
            "🎮 Real-time room update:",
            payload.eventType,
            payload.new
          );

          // Always fetch fresh data on room changes - don't rely on payload data
          // This ensures we get the most up-to-date state
          await debouncedFetchCompleteRoomData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log(
            "👥 Real-time player update:",
            payload.eventType,
            payload
          );

          if (payload.eventType === "INSERT" && payload.new) {
            onPlayerJoin?.(payload.new);
            toast.success(`${payload.new.display_name} joined the game!`);
          } else if (payload.eventType === "DELETE" && payload.old) {
            onPlayerLeave?.(payload.old.id);
            toast.info("A player left the game");
          }

          // Fetch fresh data after player changes
          await debouncedFetchCompleteRoomData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_moves",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log("🎯 Real-time move update:", payload.new);

          // Notify about the new move immediately
          if (payload.new) {
            onMoveUpdate?.(payload.new);
          }

          // Then fetch complete updated room state
          // This ensures we get the updated last_word, current_turn, etc.
          await debouncedFetchCompleteRoomData();
        }
      )
      .on("broadcast", { event: "game_update" }, async (payload) => {
        console.log("📡 Broadcast update:", payload.payload);

        const { type, data } = payload.payload || {};

        switch (type) {
          case "word_submitted":
            console.log("📝 Word submitted broadcast received");
            onMoveUpdate?.(data);
            // Force immediate refresh for word submissions
            await debouncedFetchCompleteRoomData(true);
            break;
          case "player_joined":
            onPlayerJoin?.(data);
            await debouncedFetchCompleteRoomData();
            break;
          case "turn_change":
            console.log("🔄 Turn change broadcast received");
            await debouncedFetchCompleteRoomData(true);
            break;
          case "force_refresh":
            console.log("🔄 Force refresh broadcast received");
            await debouncedFetchCompleteRoomData(true);
            break;
          default:
            await debouncedFetchCompleteRoomData();
        }
      })
      .on("broadcast", { event: "typing_update" }, (payload) => {
        const { type, data } = payload.payload || {};
        if (type === "typing_indicator") {
          const { isTyping, playerName } = data || {};
          onTypingUpdate?.(isTyping, playerName);
        }
      })
      .on("presence", { event: "sync" }, () => {
        console.log("👁️ Presence sync");
      });

    channel.subscribe(async (status) => {
      console.log(`📡 Realtime subscription status: ${status}`);

      if (status === "SUBSCRIBED") {
        console.log("✅ Successfully subscribed to real-time updates");
        isConnectedRef.current = true;

        // Initial data fetch with immediate flag
        await debouncedFetchCompleteRoomData(true);

        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Real-time subscription error");
        isConnectedRef.current = false;
        toast.error("Connection issue - attempting to reconnect...");

        // Attempt to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Attempting to reconnect...");
          setupRealtimeSync();
        }, 3000);
      } else if (status === "CLOSED") {
        console.log("🔌 Real-time connection closed");
        isConnectedRef.current = false;
      }
    });

    channelRef.current = channel;
  }, [
    roomId,
    debouncedFetchCompleteRoomData,
    onPlayerJoin,
    onPlayerLeave,
    onMoveUpdate,
    onTypingUpdate,
  ]);

  const broadcastUpdate = useCallback((type: string, data: any) => {
    if (channelRef.current && isConnectedRef.current) {
      console.log(`📤 Broadcasting ${type}:`, data);
      channelRef.current.send({
        type: "broadcast",
        event: "game_update",
        payload: { type, data, timestamp: Date.now() },
      });
    } else {
      console.warn("⚠️ Cannot broadcast - channel not connected");
    }
  }, []);

  const broadcastTyping = useCallback(
    (isTyping: boolean, playerName?: string) => {
      if (channelRef.current && isConnectedRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "typing_update",
          payload: {
            type: "typing_indicator",
            data: { isTyping, playerName, timestamp: Date.now() },
          },
        });
      }
    },
    []
  );

  const forceRefresh = useCallback(async () => {
    console.log("🔄 Force refreshing room data...");

    // Broadcast to other clients that they should refresh too
    broadcastUpdate("force_refresh", { roomId });

    // Force immediate refresh
    await debouncedFetchCompleteRoomData(true);
  }, [debouncedFetchCompleteRoomData, broadcastUpdate, roomId]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        console.log("🧹 Cleaning up channel on unmount");
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Setup effect
  useEffect(() => {
    if (roomId) {
      setupRealtimeSync();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomId, setupRealtimeSync]);

  return {
    broadcastUpdate,
    broadcastTyping,
    forceRefresh,
    reconnect: setupRealtimeSync,
    isConnected: isConnectedRef.current,
    isRefreshing,
  };
}
