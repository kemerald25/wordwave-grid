import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown, Zap, Target, Clock, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_games: number;
  total_wins: number;
  total_points: number;
  best_streak: number;
  average_time_ms: number;
  favorite_word: string;
  updated_at: string;
  user: {
    display_name: string;
    avatar_url?: string;
    handle?: string;
  };
}

interface DailyWeeklyStats {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  total_points: number;
  games_played: number;
  wins: number;
  avg_time: number;
}

export default function Leaderboard() {
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaders, setWeeklyLeaders] = useState<DailyWeeklyStats[]>([]);
  const [dailyLeaders, setDailyLeaders] = useState<DailyWeeklyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('multiplayer');
  const [soloLeaders, setSoloLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setIsLoading(true);

      // Fetch all-time leaderboard
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('leaderboards')
        .select(`
          *,
          user:users(display_name, avatar_url, handle)
        `)
        .gt('total_wins', 0) // Only show players with multiplayer wins
        .order('total_points', { ascending: false })
        .limit(50);

      if (allTimeError) throw allTimeError;

      setAllTimeLeaders(allTimeData || []);

      // Fetch solo leaderboard (players with games but no wins - indicating solo play)
      const { data: soloData, error: soloError } = await supabase
        .from('leaderboards')
        .select(`
          *,
          user:users(display_name, avatar_url, handle)
        `)
        .gt('total_games', 0)
        .order('total_points', { ascending: false })
        .limit(50);

      if (soloError) throw soloError;

      setSoloLeaders(soloData || []);

      // Fetch weekly stats (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('game_moves')
        .select(`
          user_id,
          points_awarded,
          time_taken_ms,
          is_valid,
          users(display_name, avatar_url)
        `)
        .gte('created_at', weekAgo.toISOString())
        .eq('is_valid', true);

      if (weeklyError) throw weeklyError;

      // Process weekly data
      const weeklyStats = processTimeBasedStats(weeklyData || []);
      setWeeklyLeaders(weeklyStats);

      // Fetch daily stats (last 24 hours)
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);

      const { data: dailyData, error: dailyError } = await supabase
        .from('game_moves')
        .select(`
          user_id,
          points_awarded,
          time_taken_ms,
          is_valid,
          users(display_name, avatar_url)
        `)
        .gte('created_at', dayAgo.toISOString())
        .eq('is_valid', true);

      if (dailyError) throw dailyError;

      // Process daily data
      const dailyStats = processTimeBasedStats(dailyData || []);
      setDailyLeaders(dailyStats);

    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      toast.error('Failed to load leaderboards');
    } finally {
      setIsLoading(false);
    }
  };

  const processTimeBasedStats = (moves: any[]): DailyWeeklyStats[] => {
    const userStats: { [key: string]: DailyWeeklyStats } = {};

    moves.forEach((move) => {
      const userId = move.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          display_name: move.users?.display_name || 'Unknown Player',
          avatar_url: move.users?.avatar_url,
          total_points: 0,
          games_played: 0,
          wins: 0,
          avg_time: 0
        };
      }

      userStats[userId].total_points += move.points_awarded || 0;
      userStats[userId].games_played += 1;
      
      // Calculate average time (simplified)
      const currentAvg = userStats[userId].avg_time;
      const newTime = move.time_taken_ms || 0;
      userStats[userId].avg_time = currentAvg === 0 ? newTime : (currentAvg + newTime) / 2;
    });

    return Object.values(userStats)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 20);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">#{rank}</div>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500 text-black';
      case 2:
        return 'bg-gray-400 text-black';
      case 3:
        return 'bg-amber-600 text-black';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTime = (ms: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  const formatWinRate = (wins: number, games: number) => {
    if (games === 0) return '0%';
    return `${Math.round((wins / games) * 100)}%`;
  };

  const LeaderboardCard = ({ 
    entry, 
    rank, 
    type = 'all-time' 
  }: { 
    entry: LeaderboardEntry | DailyWeeklyStats; 
    rank: number;
    type?: 'all-time' | 'weekly' | 'daily';
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`glass-panel p-4 rounded-xl hover:shadow-neon transition-all duration-300 ${
        rank <= 3 ? 'ring-1 ring-brand-500/30' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="flex-shrink-0">
          {getRankIcon(rank)}
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          {'user' in entry && entry.user?.avatar_url ? (
            <img
              src={entry.user.avatar_url}
              alt={entry.user.display_name}
              className="w-12 h-12 rounded-full border-2 border-brand-500"
            />
          ) : entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt={entry.display_name}
              className="w-12 h-12 rounded-full border-2 border-brand-500"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-black font-bold text-lg">
              {('user' in entry ? entry.user?.display_name : entry.display_name)?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground truncate">
              {'user' in entry ? entry.user?.display_name : entry.display_name}
            </h3>
            <Badge className={`${getRankBadgeColor(rank)} text-xs px-2 py-0.5`}>
              #{rank}
            </Badge>
          </div>
          
          {'user' in entry && entry.user?.handle && (
            <p className="text-xs text-muted-foreground mb-2">@{entry.user.handle}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-brand-500" />
              <span className="text-muted-foreground">
                {'total_points' in entry ? entry.total_points : entry.total_points} pts
              </span>
            </div>
            
            {type === 'all-time' && 'total_games' in entry && (
              <>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-neon-magenta" />
                  <span className="text-muted-foreground">
                    {formatWinRate(entry.total_wins, entry.total_games)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-neon-green" />
                  <span className="text-muted-foreground">
                    {entry.best_streak} streak
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neon-cyan" />
                  <span className="text-muted-foreground">
                    {formatTime(entry.average_time_ms)}
                  </span>
                </div>
              </>
            )}

            {type !== 'all-time' && (
              <>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-neon-magenta" />
                  <span className="text-muted-foreground">
                    {entry.games_played} games
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neon-cyan" />
                  <span className="text-muted-foreground">
                    {formatTime(entry.avg_time)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <Layout title="Leaderboard" subtitle="Top players and their achievements">
        <div className="flex items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Leaderboard" subtitle="Top players and their achievements">
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass-panel">
            <TabsTrigger value="multiplayer" className="data-[state=active]:bg-brand-500 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-1" />
              Multiplayer
            </TabsTrigger>
            <TabsTrigger value="solo" className="data-[state=active]:bg-neon-green data-[state=active]:text-black">
              <User className="w-4 h-4 mr-1" />
              Solo
            </TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-brand-500 data-[state=active]:text-black">
              This Week
            </TabsTrigger>
            <TabsTrigger value="daily" className="data-[state=active]:bg-brand-500 data-[state=active]:text-black">
              Today
            </TabsTrigger>
          </TabsList>

          <TabsContent value="multiplayer" className="space-y-4">
            {allTimeLeaders.length > 0 ? (
              allTimeLeaders.map((entry, index) => (
                <LeaderboardCard
                  key={entry.id}
                  entry={entry}
                  rank={index + 1}
                  type="all-time"
                />
              ))
            ) : (
              <Card className="glass-panel p-8 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Multiplayer Rankings Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to win a multiplayer game and claim the top spot!
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="solo" className="space-y-4">
            {soloLeaders.length > 0 ? (
              soloLeaders.map((entry, index) => (
                <LeaderboardCard
                  key={entry.id}
                  entry={entry}
                  rank={index + 1}
                  type="all-time"
                />
              ))
            ) : (
              <Card className="glass-panel p-8 text-center">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Solo Rankings Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to play solo and set a high score!
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            {weeklyLeaders.length > 0 ? (
              weeklyLeaders.map((entry, index) => (
                <LeaderboardCard
                  key={entry.user_id}
                  entry={entry}
                  rank={index + 1}
                  type="weekly"
                />
              ))
            ) : (
              <Card className="glass-panel p-8 text-center">
                <Medal className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Weekly Activity</h3>
                <p className="text-muted-foreground">
                  Play some games this week to appear on the weekly leaderboard!
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            {dailyLeaders.length > 0 ? (
              dailyLeaders.map((entry, index) => (
                <LeaderboardCard
                  key={entry.user_id}
                  entry={entry}
                  rank={index + 1}
                  type="daily"
                />
              ))
            ) : (
              <Card className="glass-panel p-8 text-center">
                <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Daily Activity</h3>
                <p className="text-muted-foreground">
                  Play some games today to appear on the daily leaderboard!
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}