import { Users, Clock, Trophy, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { GameRoom } from '@/hooks/useRooms';

interface Player {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isHost?: boolean;
}

interface RoomCardProps {
  room: GameRoom;
  onJoin: (roomId: string) => void;
  onView?: (roomId: string) => void;
}

export function RoomCard({ room, onJoin, onView }: RoomCardProps) {
  const isJoinable = room.status === 'lobby' && room.players.length < room.max_players;
  const statusColors = {
    lobby: 'bg-brand-500',
    in_game: 'bg-neon-magenta',
    finished: 'bg-muted'
  };

  const statusLabels = {
    lobby: 'Waiting',
    in_game: 'Playing',
    finished: 'Finished'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="glass-panel p-6 rounded-2xl hover:shadow-neon transition-all duration-300 group"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground group-hover:text-brand-500 transition-colors">
              {room.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="w-4 h-4 text-neon-magenta" />
              <span>Host: {room.host?.display_name || 'Unknown'}</span>
            </div>
          </div>
          
          <Badge 
            className={`${statusColors[room.status]} text-black font-medium px-3 py-1`}
          >
            {statusLabels[room.status]}
          </Badge>
        </div>

        {/* Room Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-brand-500" />
            <span>{room.players.length}/{room.max_players} players</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>{room.round_time_seconds}s rounds</span>
          </div>
        </div>

        {/* Player Avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {room.players.slice(0, 4).map((player, index) => (
              <div
                key={player.id}
                className="w-8 h-8 rounded-full bg-gradient-neon border-2 border-background flex items-center justify-center text-xs font-bold text-black relative z-10"
                style={{ zIndex: 10 - index }}
                title={player.display_name}
              >
                {player.display_name.charAt(0).toUpperCase()}
              </div>
            ))}
            {room.players.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                +{room.players.length - 4}
              </div>
            )}
          </div>
          
          {room.players.length === 0 && (
            <span className="text-sm text-muted-foreground">No players yet</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isJoinable ? (
            <Button
              onClick={() => onJoin(room.id)}
              className="btn-neon flex-1"
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Game
            </Button>
          ) : (
            <Button
              onClick={() => onView?.(room.id)}
              variant="outline"
              className="flex-1 border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/10"
              size="sm"
            >
              <Trophy className="w-4 h-4 mr-2" />
              View Game
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}