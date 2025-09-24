import { useCallback } from 'react';
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { useAuth } from '@/providers/AuthProvider';

interface ShareGameOptions {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  isHost?: boolean;
  gameStatus?: 'lobby' | 'in_game' | 'finished';
}

export function useGameSharing() {
  const { composeCast } = useComposeCast();
  const { appUser } = useAuth();

  const shareGameInvite = useCallback(({
    roomId,
    roomName,
    playerCount,
    maxPlayers,
    isHost = false,
    gameStatus = 'lobby'
  }: ShareGameOptions) => {
    const gameUrl = `${window.location.origin}/room/${roomId}`;
    const playerName = appUser?.display_name || 'A player';
    
    let shareText = '';
    const embeds = [gameUrl];

    if (gameStatus === 'lobby') {
      if (isHost) {
        shareText = `🎮 Join my WordWave game "${roomName}"! ${playerCount}/${maxPlayers} players ready. Let's chain some words! ⚡`;
      } else {
        shareText = `🎮 Come join us in "${roomName}" on WordWave! ${playerCount}/${maxPlayers} players - room for more! ⚡`;
      }
    } else if (gameStatus === 'in_game') {
      shareText = `🔥 Epic WordWave battle happening in "${roomName}"! ${playerName} is crushing it! Think you can do better? ⚡`;
    } else {
      shareText = `🏆 Just finished an amazing WordWave game in "${roomName}"! Who wants to challenge me next? ⚡`;
    }

    composeCast({
      text: shareText,
      embeds
    });
  }, [composeCast, appUser]);

  const shareAchievement = useCallback((achievement: {
    type: 'high_score' | 'win_streak' | 'perfect_round' | 'speed_demon';
    value: number;
    roomName?: string;
    roomId?: string;
  }) => {
    const playerName = appUser?.display_name || 'Someone';
    let shareText = '';
    let embeds = [window.location.origin];

    if (achievement.roomId) {
      embeds = [`${window.location.origin}/room/${achievement.roomId}`];
    }

    switch (achievement.type) {
      case 'high_score':
        shareText = `🎯 ${playerName} just scored ${achievement.value} points in WordWave! Can you beat that? ⚡`;
        break;
      case 'win_streak':
        shareText = `🔥 ${playerName} is on a ${achievement.value} game win streak in WordWave! Who can stop them? ⚡`;
        break;
      case 'perfect_round':
        shareText = `💎 Perfect round! ${playerName} got every word right in WordWave! Flawless victory! ⚡`;
        break;
      case 'speed_demon':
        shareText = `⚡ Lightning fast! ${playerName} completed their turn in just ${achievement.value}s in WordWave! ⚡`;
        break;
    }

    composeCast({
      text: shareText,
      embeds
    });
  }, [composeCast, appUser]);

  const shareGameResult = useCallback((result: {
    won: boolean;
    score: number;
    position: number;
    totalPlayers: number;
    roomName: string;
    roomId: string;
  }) => {
    const playerName = appUser?.display_name || 'Someone';
    const gameUrl = `${window.location.origin}/room/${result.roomId}`;
    
    let shareText = '';
    
    if (result.won) {
      shareText = `🏆 ${playerName} won "${result.roomName}" with ${result.score} points! Think you can beat the champion? ⚡`;
    } else if (result.position <= 3) {
      shareText = `🥉 ${playerName} finished ${result.position}/${result.totalPlayers} in "${result.roomName}" with ${result.score} points! So close to victory! ⚡`;
    } else {
      shareText = `🎮 Just played "${result.roomName}" and scored ${result.score} points! Who wants to challenge me to a rematch? ⚡`;
    }

    composeCast({
      text: shareText,
      embeds: [gameUrl]
    });
  }, [composeCast, appUser]);

  return {
    shareGameInvite,
    shareAchievement,
    shareGameResult
  };
}