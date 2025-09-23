-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (app-level, separate from Supabase auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address TEXT UNIQUE,
  farcaster_fid TEXT UNIQUE,
  handle TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_guest BOOLEAN DEFAULT FALSE,
  guest_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Auth sessions table for tracking verified sessions
CREATE TABLE public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('guest', 'siwf', 'wallet', 'supabase')),
  wallet_address TEXT,
  farcaster_fid TEXT,
  signature_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- WordWave game rooms
CREATE TABLE public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  max_players INTEGER CHECK (max_players BETWEEN 2 AND 8) DEFAULT 4,
  round_time_seconds INTEGER DEFAULT 15,
  rounds INTEGER DEFAULT 10,
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_game', 'finished')),
  current_round INTEGER DEFAULT 0,
  current_player_turn UUID,
  last_word TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Players in rooms (presence)
CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  score INTEGER DEFAULT 0,
  turn_order INTEGER DEFAULT 0,
  eliminated_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Game rounds
CREATE TABLE public.game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES public.users(id)
);

-- Game moves (words submitted)
CREATE TABLE public.game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.game_players(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id),
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL,
  is_valid BOOLEAN DEFAULT NULL,
  validation_reason TEXT,
  time_taken_ms INTEGER,
  points_awarded INTEGER DEFAULT 0,
  chain_valid BOOLEAN DEFAULT FALSE
);

-- Dictionary for word validation
CREATE TABLE public.dictionary_words (
  word TEXT PRIMARY KEY,
  language TEXT DEFAULT 'en',
  definition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboards
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  average_time_ms INTEGER DEFAULT 0,
  favorite_word TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictionary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = supabase_auth_id OR 
    id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = supabase_auth_id OR 
    is_guest = true
  );

-- RLS Policies for auth_sessions
CREATE POLICY "Users can view own sessions" ON public.auth_sessions
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

CREATE POLICY "Users can create sessions" ON public.auth_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own sessions" ON public.auth_sessions
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

-- RLS Policies for game_rooms
CREATE POLICY "Anyone can view game rooms" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR
    EXISTS (SELECT 1 FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

CREATE POLICY "Room hosts can update their rooms" ON public.game_rooms
  FOR UPDATE USING (
    host_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    host_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

-- RLS Policies for game_players
CREATE POLICY "Anyone can view game players" ON public.game_players
  FOR SELECT USING (true);

CREATE POLICY "Users can join games" ON public.game_players
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

CREATE POLICY "Users can update own player status" ON public.game_players
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

-- RLS Policies for game_rounds
CREATE POLICY "Anyone can view game rounds" ON public.game_rounds
  FOR SELECT USING (true);

CREATE POLICY "Game participants can create rounds" ON public.game_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_players 
      WHERE room_id = NEW.room_id 
      AND (
        user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
        user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
      )
    )
  );

-- RLS Policies for game_moves
CREATE POLICY "Anyone can view game moves" ON public.game_moves
  FOR SELECT USING (true);

CREATE POLICY "Players can submit moves" ON public.game_moves
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

-- RLS Policies for dictionary
CREATE POLICY "Anyone can view dictionary" ON public.dictionary_words
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage dictionary" ON public.dictionary_words
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE supabase_auth_id = auth.uid() AND handle = 'admin')
  );

-- RLS Policies for leaderboards
CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards
  FOR SELECT USING (true);

CREATE POLICY "Users can update own leaderboard" ON public.leaderboards
  FOR ALL USING (
    user_id = (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR
    user_id = (SELECT user_id FROM public.auth_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token' AND is_active = true)
  );

-- Functions for game logic
CREATE OR REPLACE FUNCTION public.normalize_word(word TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(word, '[^a-zA-Z]', '', 'g')));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_last_char(word TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized_word TEXT;
BEGIN
  normalized_word := public.normalize_word(word);
  IF LENGTH(normalized_word) = 0 THEN
    RETURN '';
  END IF;
  RETURN RIGHT(normalized_word, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_word_chain(room_id UUID, new_word TEXT)
RETURNS TABLE(is_valid BOOLEAN, reason TEXT, required_start_char TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  last_move_word TEXT;
  normalized_new_word TEXT;
  required_char TEXT := '';
  duplicate_count INTEGER;
BEGIN
  -- Normalize the new word
  normalized_new_word := public.normalize_word(new_word);
  
  -- Check if word is empty after normalization
  IF LENGTH(normalized_new_word) = 0 THEN
    RETURN QUERY SELECT FALSE, 'empty_word', '';
  END IF;
  
  -- Get the last valid word from this room
  SELECT normalized_word INTO last_move_word
  FROM public.game_moves gm
  WHERE gm.room_id = validate_word_chain.room_id
    AND gm.is_valid = true
  ORDER BY gm.created_at DESC
  LIMIT 1;
  
  -- If there's a previous word, check chain rule
  IF last_move_word IS NOT NULL THEN
    required_char := public.get_last_char(last_move_word);
    IF LEFT(normalized_new_word, 1) != required_char THEN
      RETURN QUERY SELECT FALSE, 'chain_mismatch', required_char;
    END IF;
  END IF;
  
  -- Check for duplicates in this room
  SELECT COUNT(*) INTO duplicate_count
  FROM public.game_moves gm
  WHERE gm.room_id = validate_word_chain.room_id
    AND gm.normalized_word = normalized_new_word;
    
  IF duplicate_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'duplicate_word', required_char;
  END IF;
  
  -- Check if word exists in dictionary
  IF NOT EXISTS (SELECT 1 FROM public.dictionary_words WHERE word = normalized_new_word) THEN
    RETURN QUERY SELECT FALSE, 'not_in_dictionary', required_char;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'valid', required_char;
END;
$$;

-- Function to update user timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at
  BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some basic dictionary words for testing
INSERT INTO public.dictionary_words (word) VALUES 
('apple'), ('echo'), ('orange'), ('elephant'), ('table'), ('eagle'), 
('door'), ('river'), ('rainbow'), ('wolf'), ('fire'), ('energy'), 
('yarn'), ('night'), ('tree'), ('earth'), ('house'), ('sun'), 
('moon'), ('nature'), ('game'), ('time'), ('space'), ('chair'),
('book'), ('keyboard'), ('dance'), ('music'), ('art'), ('text'),
('tiger'), ('rabbit'), ('tower'), ('road'), ('dream'), ('magic'),
('castle'), ('dragon'), ('quest'), ('team'), ('mountain'), ('ocean'),
('forest'), ('thunder'), ('lightning'), ('storm'), ('peace'),
('freedom'), ('journey'), ('adventure'), ('mystery'), ('wonder');

-- Function to create guest user
CREATE OR REPLACE FUNCTION public.create_guest_user(
  display_name TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  session_id TEXT;
BEGIN
  -- Generate a unique guest session ID
  session_id := 'guest_' || gen_random_uuid()::text;
  
  -- Create the guest user
  INSERT INTO public.users (
    display_name,
    avatar_url,
    is_guest,
    guest_session_id
  ) VALUES (
    COALESCE(display_name, 'Guest Player'),
    avatar_url,
    true,
    session_id
  ) RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;