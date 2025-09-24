import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  type: 'player_joined' | 'game_started' | 'turn_reminder' | 'game_finished';
  roomId: string;
  roomName: string;
  playerName?: string;
  message: string;
}

export function useGameNotifications() {
  const sendNotification = useCallback(async (data: NotificationData) => {
    try {
      // This would typically call your notification service
      // For now, we'll use a simple API call to your backend
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, []);

  const notifyPlayerJoined = useCallback(async (roomId: string, roomName: string, playerName: string) => {
    return sendNotification({
      type: 'player_joined',
      roomId,
      roomName,
      playerName,
      message: `${playerName} joined your WordWave game "${roomName}"!`
    });
  }, [sendNotification]);

  const notifyGameStarted = useCallback(async (roomId: string, roomName: string) => {
    return sendNotification({
      type: 'game_started',
      roomId,
      roomName,
      message: `Your WordWave game "${roomName}" has started! Time to chain some words!`
    });
  }, [sendNotification]);

  const notifyTurnReminder = useCallback(async (roomId: string, roomName: string, playerName: string) => {
    return sendNotification({
      type: 'turn_reminder',
      roomId,
      roomName,
      playerName,
      message: `It's your turn in "${roomName}"! Don't keep everyone waiting!`
    });
  }, [sendNotification]);

  const notifyGameFinished = useCallback(async (roomId: string, roomName: string, winnerName: string) => {
    return sendNotification({
      type: 'game_finished',
      roomId,
      roomName,
      playerName: winnerName,
      message: `Game "${roomName}" finished! ${winnerName} won! Ready for another round?`
    });
  }, [sendNotification]);

  return {
    notifyPlayerJoined,
    notifyGameStarted,
    notifyTurnReminder,
    notifyGameFinished
  };
}