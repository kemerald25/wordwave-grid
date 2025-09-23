import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { Button } from '@/components/ui/button';
import { Plus, Users, Gamepad2, RefreshCw, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/providers/AuthProvider';

export default function Lobby() {
  const { rooms, isLoading, createRoom, joinRoom, fetchRooms } = useRooms();
  const { appUser, signOut, isGuest } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateRoom = async (roomData: {
    name: string;
    maxPlayers: number;
    roundTime: number;
    rounds: number;
  }) => {
    const roomId = await createRoom(roomData);
    if (roomId) {
      setShowCreateModal(false);
      // Navigate to room
      navigate(`/room/${roomId}`);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const success = await joinRoom(roomId);
    if (success) {
      // Navigate to room
      navigate(`/room/${roomId}`);
    }
  };

  const handleViewRoom = (roomId: string) => {
    // Navigate to spectate room
    navigate(`/room/${roomId}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRooms();
    setIsRefreshing(false);
  };

  const lobbyRooms = rooms.filter(room => room.status === 'lobby');
  const activeGames = rooms.filter(room => room.status === 'in_game');

  return (
    <Layout
      title={`Welcome ${appUser?.display_name || 'Player'}! ${isGuest ? '(Guest)' : ''}`}
      subtitle="Chain Reaction Word Game • Create or join a room to start playing"
    >
      <div className="space-y-8">
        {/* User Info & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            {appUser?.avatar_url && (
              <img 
                src={appUser.avatar_url} 
                alt={appUser.display_name || 'User'}
                className="w-12 h-12 rounded-full border-2 border-brand-500"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {appUser?.display_name || 'Player'}
              </h2>
              {isGuest && (
                <p className="text-sm text-muted-foreground">
                  Guest Mode • Sign in to save progress
                </p>
              )}
            </div>
          </div>
          
          <Button
            onClick={signOut}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="btn-neon text-lg px-8 py-4 rounded-2xl"
            disabled={isLoading}
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
            disabled={isRefreshing || isLoading}
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
        {!isLoading && rooms.length === 0 && (
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

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="glass-panel p-12 rounded-3xl max-w-md mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-bold text-foreground mb-2">Loading Rooms...</h3>
              <p className="text-muted-foreground">
                Fetching the latest game rooms for you.
              </p>
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