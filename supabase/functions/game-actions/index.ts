import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameAction {
  action: 'submit_word' | 'start_game' | 'end_turn';
  roomId: string;
  userId: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gameAction: GameAction = await req.json();
    const { action, roomId, userId, data } = gameAction;

    // Validate required fields
    if (!action || !roomId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'submit_word': {
        const { word, timeTaken } = data;
        
        if (!word) {
          return new Response(JSON.stringify({ error: 'Word is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate the word using the database function
        const { data: validationResult } = await supabaseClient
          .rpc('validate_word_chain', {
            room_id: roomId,
            new_word: word
          });

        const validation = validationResult?.[0];
        if (!validation) {
          throw new Error('Failed to validate word');
        }

        // Get current round
        const { data: currentRound } = await supabaseClient
          .from('game_rounds')
          .select('id')
          .eq('room_id', roomId)
          .is('ended_at', null)
          .single();

        if (!currentRound) {
          return new Response(JSON.stringify({ error: 'No active round found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get player info
        const { data: player } = await supabaseClient
          .from('game_players')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', userId)
          .single();

        if (!player) {
          return new Response(JSON.stringify({ error: 'Player not found in room' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Calculate points if valid
        let points = 0;
        if (validation.is_valid) {
          const normalizedWord = word.toLowerCase().trim().replace(/[^a-z]/g, '');
          const basePoints = normalizedWord.length;
          const speedBonus = Math.max(0, Math.ceil((15000 - (timeTaken || 0)) / 15000 * 5));
          points = basePoints + speedBonus;
        }

        // Insert the move
        const { data: move, error: moveError } = await supabaseClient
          .from('game_moves')
          .insert({
            round_id: currentRound.id,
            room_id: roomId,
            player_id: player.id,
            user_id: userId,
            word: word,
            normalized_word: word.toLowerCase().trim().replace(/[^a-z]/g, ''),
            submitted_at: new Date().toISOString(),
            is_valid: validation.is_valid,
            validation_reason: validation.reason,
            time_taken_ms: timeTaken || 0,
            points_awarded: points,
            chain_valid: validation.is_valid
          })
          .select()
          .single();

        if (moveError) throw moveError;

        // Update player score if valid
        if (validation.is_valid) {
          await supabaseClient
            .from('game_players')
            .update({
              score: supabaseClient.rpc('coalesce', { 
                value: supabaseClient.raw('score + ?', [points]), 
                fallback: points 
              })
            })
            .eq('id', player.id);

          // Update room's last word
          await supabaseClient
            .from('game_rooms')
            .update({ last_word: word })
            .eq('id', roomId);
        }

        return new Response(JSON.stringify({
          success: true,
          move,
          validation: {
            isValid: validation.is_valid,
            reason: validation.reason,
            requiredStartChar: validation.required_start_char,
            points
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_game': {
        // Update room status to in_game
        const { error: updateError } = await supabaseClient
          .from('game_rooms')
          .update({
            status: 'in_game',
            started_at: new Date().toISOString(),
            current_round: 1
          })
          .eq('id', roomId)
          .eq('host_id', userId); // Only host can start game

        if (updateError) throw updateError;

        // Create first round
        const { error: roundError } = await supabaseClient
          .from('game_rounds')
          .insert({
            room_id: roomId,
            round_number: 1,
            started_at: new Date().toISOString()
          });

        if (roundError) throw roundError;

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Game action error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});