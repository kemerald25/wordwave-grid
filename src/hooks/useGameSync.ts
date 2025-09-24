import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface GameSyncOptions {
  roomId: string;
  onRoomUpdate?: (room: any) => void;
  onPlayerUpdate?: (players: any[]) => void;
  onMoveUpdate?: (move: any) => void;
  onPlayerJoin?: (player: any) => void;
  onPlayerLeave?: (playerId: string) => void;
  onGameStateChange?: (state: any) => void;
}

export function useGameSync({
  roomId,
  onRoomUpdate,
  onPlayerUpdate,
  onMoveUpdate,
  onPlayerJoin,
  onPlayerLeave,
  onGameStateChange
}: GameSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const fetchCompleteRoomData = useCallback(async () => {
    if (!roomId) return;

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

      const typedRoom = {
        ...roomData,
        status: roomData.status as "lobby" | "in_game" | "finished",
        players: (roomData.players || []).sort(
          (a, b) => a.turn_order - b.turn_order
        ),
      };

      onRoomUpdate?.(typedRoom);
      onPlayerUpdate?.(typedRoom.players);
      onGameStateChange?.(typedRoom);
    } catch (error) {
      console.error('Error fetching complete room data:', error);
    }
  }, [roomId, onRoomUpdate, onPlayerUpdate, onGameStateChange]);

  const setupRealtimeSync = useCallback(() => {
    if (!roomId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(`Setting up real-time sync for room: ${roomId}`);

    // Create new channel with optimized settings
    const channel = supabase
      .channel(`game-room-${roomId}`, {
        config: {
          presence: { key: roomId },
          broadcast: { self: false, ack: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('🎮 Real-time room update:', payload);
          
          // Immediate optimistic update
          if (payload.eventType === 'UPDATE' && payload.new) {
            onRoomUpdate?.(payload.new);
          }
          
          // Full data refresh for consistency
          await fetchCompleteRoomData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('👥 Real-time player update:', payload);
          
          if (payload.eventType === 'INSERT') {
            onPlayerJoin?.(payload.new);
            toast.success(`${payload.new.display_name} joined the game!`);
          } else if (payload.eventType === 'DELETE') {
            onPlayerLeave?.(payload.old?.id);
            toast.info('A player left the game');
          }
          
          // Always refresh complete data for players
          await fetchCompleteRoomData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('🎯 Real-time move update:', payload);
          
          // Immediate move update
          onMoveUpdate?.(payload.new);
          
          // Refresh room data to get updated last_word and turn
          await fetchCompleteRoomData();
        }
      )
      .on('broadcast', { event: 'game_update' }, async (payload) => {
        console.log('📡 Broadcast update:', payload);
        
        // Handle different broadcast types
        switch (payload.payload?.type) {
          case 'word_submitted':
            onMoveUpdate?.(payload.payload.data);
            await fetchCompleteRoomData();
            break;
          case 'player_joined':
            onPlayerJoin?.(payload.payload.data);
            await fetchCompleteRoomData();
            break;
          case 'turn_change':
            await fetchCompleteRoomData();
            break;
          default:
            await fetchCompleteRoomData();
        }
      })
      .on('presence', { event: 'sync' }, () => {
        console.log('👁️ Presence sync');
      });

    channel.subscribe((status) => {
      console.log(`📡 Realtime subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to real-time updates');
        isConnectedRef.current = true;
        
        // Initial data fetch
        fetchCompleteRoomData();
        
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time subscription error');
        isConnectedRef.current = false;
        toast.error('Connection issue - attempting to reconnect...');
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          setupRealtimeSync();
        }, 3000);
      } else if (status === 'CLOSED') {
        console.log('🔌 Real-time connection closed');
        isConnectedRef.current = false;
      }
    });

    channelRef.current = channel;
  }, [roomId, onRoomUpdate, onPlayerUpdate, onMoveUpdate, onPlayerJoin, onPlayerLeave, onGameStateChange, fetchCompleteRoomData]);

  const broadcastUpdate = useCallback((type: string, data: any) => {
    if (channelRef.current && isConnectedRef.current) {
      console.log(`📤 Broadcasting ${type}:`, data);
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { type, data, timestamp: Date.now() }
      });
    }
  }, []);

  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing room data...');
    fetchCompleteRoomData();
  }, [fetchCompleteRoomData]);

  useEffect(() => {
    setupRealtimeSync();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupRealtimeSync]);

  return {
    broadcastUpdate,
    forceRefresh,
    reconnect: setupRealtimeSync,
    isConnected: isConnectedRef.current
  };
}