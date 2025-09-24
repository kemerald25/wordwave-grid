import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameSyncOptions {
  roomId: string;
  onRoomUpdate?: (room: any) => void;
  onPlayerUpdate?: (players: any[]) => void;
  onMoveUpdate?: (move: any) => void;
  onPlayerJoin?: (player: any) => void;
  onPlayerLeave?: (playerId: string) => void;
}

export function useGameSync({
  roomId,
  onRoomUpdate,
  onPlayerUpdate,
  onMoveUpdate,
  onPlayerJoin,
  onPlayerLeave
}: GameSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const setupRealtimeSync = useCallback(() => {
    if (!roomId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel with optimized settings
    const channel = supabase
      .channel(`game-room-${roomId}`, {
        config: {
          presence: { key: roomId },
          broadcast: { self: true, ack: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const now = Date.now();
          if (now - lastUpdateRef.current < 100) return; // Debounce rapid updates
          lastUpdateRef.current = now;
          
          console.log('Real-time room update:', payload);
          onRoomUpdate?.(payload.new);
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
        (payload) => {
          console.log('Real-time player update:', payload);
          
          if (payload.eventType === 'INSERT') {
            onPlayerJoin?.(payload.new);
          } else if (payload.eventType === 'DELETE') {
            onPlayerLeave?.(payload.old?.id);
          }
          
          // Fetch updated players list
          fetchPlayers();
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
        (payload) => {
          console.log('Real-time move update:', payload);
          onMoveUpdate?.(payload.new);
        }
      )
      .on('broadcast', { event: 'player_typing' }, (payload) => {
        console.log('Player typing:', payload);
        // Handle typing indicators
      })
      .on('broadcast', { event: 'player_ready' }, (payload) => {
        console.log('Player ready:', payload);
        // Handle ready states
      });

    channel.subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });

    channelRef.current = channel;
  }, [roomId, onRoomUpdate, onPlayerUpdate, onMoveUpdate, onPlayerJoin, onPlayerLeave]);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;

    try {
      const { data: players, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId)
        .order('turn_order', { ascending: true });

      if (error) throw error;
      onPlayerUpdate?.(players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  }, [roomId, onPlayerUpdate]);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_typing',
        payload: { isTyping, timestamp: Date.now() }
      });
    }
  }, []);

  const broadcastReady = useCallback((isReady: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_ready',
        payload: { isReady, timestamp: Date.now() }
      });
    }
  }, []);

  useEffect(() => {
    setupRealtimeSync();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [setupRealtimeSync]);

  return {
    broadcastTyping,
    broadcastReady,
    reconnect: setupRealtimeSync
  };
}