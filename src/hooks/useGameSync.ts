/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
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

export function useGameSync(options: GameSyncOptions) {
  const {
    roomId,
    onRoomUpdate,
    onPlayerUpdate,
    onMoveUpdate,
    onPlayerJoin,
    onPlayerLeave,
    onGameStateChange,
    onTypingUpdate,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize callback refs to prevent unnecessary recreations
  const stableCallbacks = useMemo(
    () => ({
      onRoomUpdate,
      onPlayerUpdate,
      onMoveUpdate,
      onPlayerJoin,
      onPlayerLeave,
      onGameStateChange,
      onTypingUpdate,
    }),
    [
      onRoomUpdate,
      onPlayerUpdate,
      onMoveUpdate,
      onPlayerJoin,
      onPlayerLeave,
      onGameStateChange,
      onTypingUpdate,
    ]
  );

  // Debounced fetch to prevent multiple simultaneous calls
  const fetchCompleteRoomData = useCallback(
    async (immediate = false) => {
      if (!roomId || !isMountedRef.current || isRefreshing) {
        return;
      }

      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      // Debounce logic
      if (!immediate && timeSinceLastFetch < 300) {
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(() => {
          fetchCompleteRoomData(true);
        }, 300 - timeSinceLastFetch);
        return;
      }

      try {
        setIsRefreshing(true);
        lastFetchTimeRef.current = now;

        console.log("🔄 Fetching room data for:", roomId);

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
          console.error("❌ Error fetching room data:", error);
          return;
        }

        if (!isMountedRef.current) return;

        const typedRoom = {
          ...roomData,
          status: roomData.status as "lobby" | "in_game" | "finished",
          players: (roomData.players || []).sort(
            (a, b) => a.turn_order - b.turn_order
          ),
        };

        console.log("✅ Fresh room data:", {
          id: typedRoom.id,
          last_word: typedRoom.last_word,
          current_turn: typedRoom.current_player_turn,
          status: typedRoom.status,
        });

        // Update all callbacks with fresh data
        stableCallbacks.onRoomUpdate?.(typedRoom);
        stableCallbacks.onPlayerUpdate?.(typedRoom.players);
        stableCallbacks.onGameStateChange?.(typedRoom);
      } catch (error) {
        console.error("❌ Failed to fetch room data:", error);
      } finally {
        if (isMountedRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [roomId, isRefreshing, stableCallbacks]
  );

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      console.log("🧹 Cleaning up channel");
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn("Warning cleaning up channel:", error);
      }
      channelRef.current = null;
    }
    isConnectedRef.current = false;
    setConnectionState("disconnected");
  }, []);

  const setupRealtimeSync = useCallback(() => {
    if (!roomId || !isMountedRef.current) {
      console.log("⚠️ Skipping setup - no roomId or component unmounted");
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up existing channel
    cleanupChannel();

    console.log(`🚀 Setting up realtime sync for room: ${roomId}`);
    setConnectionState("connecting");

    const channelName = `game-room-${roomId}-${Date.now()}`; // Add timestamp to prevent conflicts

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: roomId },
        broadcast: { self: false, ack: false },
      },
    });

    // Room changes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_rooms",
        filter: `id=eq.${roomId}`,
      },
      async (payload) => {
        if (!isMountedRef.current) return;

        console.log("🎮 Room change detected:", payload.eventType);
        await fetchCompleteRoomData(true);
      }
    );

    // Player changes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_players",
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        if (!isMountedRef.current) return;

        console.log("👥 Player change detected:", payload.eventType);

        if (payload.eventType === "INSERT" && payload.new) {
          stableCallbacks.onPlayerJoin?.(payload.new);
          toast.success(`${payload.new.display_name} joined!`);
        } else if (payload.eventType === "DELETE" && payload.old) {
          stableCallbacks.onPlayerLeave?.(payload.old.id);
          toast.info("Player left the game");
        }

        await fetchCompleteRoomData(true);
      }
    );

    // Move changes - this is crucial for word updates
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_moves",
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        if (!isMountedRef.current) return;

        console.log("🎯 New move detected:", payload.new);

        // Notify about new move
        if (payload.new) {
          stableCallbacks.onMoveUpdate?.(payload.new);
        }

        // Force immediate refresh to get updated room state
        await fetchCompleteRoomData(true);
      }
    );

    // Broadcast updates
    channel.on("broadcast", { event: "game_update" }, async (payload) => {
      if (!isMountedRef.current) return;

      console.log("📡 Broadcast received:", payload.payload?.type);
      await fetchCompleteRoomData(true);
    });

    // Typing updates
    channel.on("broadcast", { event: "typing_update" }, (payload) => {
      if (!isMountedRef.current) return;

      const { type, data } = payload.payload || {};
      if (type === "typing_indicator") {
        stableCallbacks.onTypingUpdate?.(data?.isTyping, data?.playerName);
      }
    });

    // Subscribe and handle status changes
    channel.subscribe(async (status) => {
      if (!isMountedRef.current) return;

      console.log(`📡 Connection status: ${status}`);

      switch (status) {
        case "SUBSCRIBED":
          console.log("✅ Successfully connected to realtime");
          isConnectedRef.current = true;
          setConnectionState("connected");

          // Initial data fetch
          await fetchCompleteRoomData(true);
          break;

        case "CHANNEL_ERROR":
          console.error("❌ Channel error - will retry");
          isConnectedRef.current = false;
          setConnectionState("error");

          // Don't immediately reconnect on error - wait a bit
          if (isMountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                console.log("🔄 Retrying connection after error...");
                setupRealtimeSync();
              }
            }, 5000);
          }
          break;

        case "CLOSED":
          console.log("🔌 Connection closed");
          isConnectedRef.current = false;
          setConnectionState("disconnected");

          // Only reconnect if we were previously connected and component is still mounted
          if (isMountedRef.current && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                console.log("🔄 Reconnecting after close...");
                setupRealtimeSync();
              }
            }, 2000);
          }
          break;

        case "TIMED_OUT":
          console.log("⏰ Connection timed out");
          isConnectedRef.current = false;
          setConnectionState("error");

          if (isMountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setupRealtimeSync();
              }
            }, 1000);
          }
          break;
      }
    });

    channelRef.current = channel;
  }, [roomId, cleanupChannel, fetchCompleteRoomData, stableCallbacks]);

  const broadcastUpdate = useCallback((type: string, data: any) => {
    if (channelRef.current && isConnectedRef.current) {
      console.log(`📤 Broadcasting ${type}:`, data);
      channelRef.current.send({
        type: "broadcast",
        event: "game_update",
        payload: { type, data, timestamp: Date.now() },
      });
    } else {
      console.warn(`⚠️ Cannot broadcast ${type} - not connected`);
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
    console.log("🔄 Force refresh requested");
    await fetchCompleteRoomData(true);
  }, [fetchCompleteRoomData]);

  const reconnect = useCallback(() => {
    console.log("🔄 Manual reconnect requested");
    setupRealtimeSync();
  }, [setupRealtimeSync]);

  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Main setup effect - only depends on roomId
  useEffect(() => {
    if (roomId && isMountedRef.current) {
      setupRealtimeSync();
    }

    return () => {
      // Cleanup on roomId change or unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      cleanupChannel();
    };
  }, [roomId]); // Only depend on roomId to prevent unnecessary reconnections

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      cleanupChannel();
    };
  }, [cleanupChannel]);

  return {
    broadcastUpdate,
    broadcastTyping,
    forceRefresh,
    reconnect,
    isConnected: isConnectedRef.current,
    connectionState,
    isRefreshing,
  };
}
