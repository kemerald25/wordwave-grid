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

    // Create new channel with better real-time settings
    const channel = supabase
      .channel(`game-room-${roomId}`, {
        config: {
          presence: { key: roomId },
          broadcast: { self: false, ack: true }
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
            // Immediately fetch updated players list
            setTimeout(fetchPlayers, 100);
          } else if (payload.eventType === 'DELETE') {
            onPlayerLeave?.(payload.old?.id);
            setTimeout(fetchPlayers, 100);
          } else if (payload.eventType === 'UPDATE') {
            setTimeout(fetchPlayers, 100);
          }
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
          
          // Force refresh room data to get updated state
          setTimeout(() => {
            fetchPlayers();
            // Also trigger room update to get latest word and turn
            if (onRoomUpdate) {
              supabase
                .from('game_rooms')
                .select('*')
                .eq('id', roomId)
                .single()
                .then(({ data }) => {
                  if (data) onRoomUpdate(data);
                });
            }
          }, 50);
        }
      )
      .on('broadcast', { event: 'game_update' }, (payload) => {
        console.log('Broadcast game update:', payload);
        // Handle immediate game state updates
        if (payload.type === 'word_submitted') {
          onMoveUpdate?.(payload.data);
        } else if (payload.type === 'player_joined') {
          onPlayerJoin?.(payload.data);
        }
      });

    channel.subscribe((status) => {
      console.log('Realtime subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to real-time updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Real-time subscription error');
        toast.error('Connection issue - some updates may be delayed');
      }
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

  const broadcastGameUpdate = useCallback((type: string, data: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { type, data, timestamp: Date.now() }
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
    broadcastGameUpdate,
    reconnect: setupRealtimeSync
  };
}