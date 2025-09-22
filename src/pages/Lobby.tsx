import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { Button } from '@/components/ui/button';
import { Plus, Users, Gamepad2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock data for demonstration
const mockRooms = [
  {
    id: '1',
    name: 'Cyber Arena',
    hostName: 'NeonMaster',
    players: [
      { id: '1', displayName: 'NeonMaster', isHost: true },
      { id: '2', displayName: 'WordNinja' },
      { id: '3', displayName: 'CyberPoet' }
    ],
    maxPlayers: 6,
    roundTime: 15,
    status: 'lobby' as const,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Lightning Round',
    hostName: 'QuickDraw',
    players: [
      { id: '4', displayName: 'QuickDraw', isHost: true },
      { id: '5', displayName: 'SpeedTyper' }
    ],
    maxPlayers: 4,
    roundTime: 10,
    status: 'in_game' as const,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Relaxed Zone',
    hostName: 'ChillMaster',
    players: [
      { id: '6', displayName: 'ChillMaster', isHost: true },
      { id: '7', displayName: 'WordLover' },
      { id: '8', displayName: 'ThinkSlow' },
      { id: '9', displayName: 'DeepThought' }
    ],
    maxPlayers: 8,
    roundTime: 30,
    status: 'lobby' as const,
    createdAt: new Date()
  }
];

export default function Lobby() {
  const [rooms, setRooms] = useState(mockRooms);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateRoom = (roomData: {
    name: string;
    maxPlayers: number;
    roundTime: number;
    rounds: number;
  }) => {
    const newRoom = {
      id: Date.now().toString(),
      name: roomData.name,
      hostName: 'You', // This would be the actual user's name
      players: [
        { id: 'current-user', displayName: 'You', isHost: true }
      ],
      maxPlayers: roomData.maxPlayers,
      roundTime: roomData.roundTime,
      status: 'lobby' as const,
      createdAt: new Date()
    };
    
    setRooms(prev => [newRoom, ...prev]);
    console.log('Created room:', newRoom);
  };

  const handleJoinRoom = (roomId: string) => {
    console.log('Joining room:', roomId);
    // In a real app, this would navigate to the game room
  };

  const handleViewRoom = (roomId: string) => {
    console.log('Viewing room:', roomId);
    // In a real app, this would show room details or spectate
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const activeRooms = rooms.filter(room => room.status === 'lobby' || room.status === 'in_game');
  const lobbyRooms = activeRooms.filter(room => room.status === 'lobby');
  const activeGames = activeRooms.filter(room => room.status === 'in_game');

  return (
    <Layout
      title="WordWave"
      subtitle="Chain Reaction Word Game • Create or join a room to start playing"
    >
      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="btn-neon text-lg px-8 py-4 rounded-2xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Room
          </Button>
          
          <Button
            onClick={() => window.location.href = '/demo'}
            variant="outline"
            className="border-neon-magenta/30 hover:border-neon-magenta hover:bg-neon-magenta/10 text-lg px-8 py-4 rounded-2xl"
          >
            <Gamepad2 className="w-5 h-5 mr-2" />
            Try Demo
          </Button>
          
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/10 text-lg px-8 py-4 rounded-2xl"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Rooms
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <Users className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{lobbyRooms.length}</div>
            <div className="text-sm text-muted-foreground">Open Rooms</div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <Gamepad2 className="w-8 h-8 text-neon-magenta mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{activeGames.length}</div>
            <div className="text-sm text-muted-foreground">Active Games</div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="glass-panel p-6 rounded-2xl text-center"
          >
            <Users className="w-8 h-8 text-neon-green mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {rooms.reduce((total, room) => total + room.players.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Players</div>
          </motion.div>
        </div>

        {/* Available Rooms */}
        {lobbyRooms.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-500 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Available Rooms
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lobbyRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <RoomCard
                    room={room}
                    onJoin={handleJoinRoom}
                    onView={handleViewRoom}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-neon-magenta flex items-center gap-2">
              <Gamepad2 className="w-6 h-6" />
              Games in Progress
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeGames.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <RoomCard
                    room={room}
                    onJoin={handleJoinRoom}
                    onView={handleViewRoom}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeRooms.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="glass-panel p-12 rounded-3xl max-w-md mx-auto">
              <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Active Rooms</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to create a room and start a game!
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="btn-neon"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Room
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
    </Layout>
  );
}