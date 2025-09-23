import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { toast } from "sonner";

export interface AppUser {
  id: string;
  supabase_auth_id?: string;
  wallet_address?: string;
  farcaster_fid?: string;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_guest?: boolean;
  guest_session_id?: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  session_token: string;
  auth_type: "guest" | "siwf" | "wallet" | "supabase";
  wallet_address?: string;
  farcaster_fid?: string;
  expires_at: string;
  is_active: boolean;
}

interface AuthContextType {
  // Core auth state
  user: User | null;
  appUser: AppUser | null;
  session: AuthSession | null;
  isLoading: boolean;

  // Auth methods
  signInAsGuest: () => Promise<void>;
  signInWithSIWF: () => Promise<void>;
  signInWithWallet: () => Promise<void>;
  signOut: () => Promise<void>;

  // MiniKit context
  miniKitUser: any;
  miniKitClient: any;

  // Utils
  isAuthenticated: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [miniKitProcessed, setMiniKitProcessed] = useState(false);

  // MiniKit integration
  const miniKit = useMiniKit();
  const miniKitUser = miniKit?.context?.user;
  const miniKitClient = miniKit?.context?.client;

  // Auto-authenticate with MiniKit when user is available
  useEffect(() => {
    const autoAuthWithMiniKit = async () => {
      if (miniKitUser && !miniKitProcessed && !isLoading) {
        console.log("Auto-authenticating with MiniKit user:", miniKitUser);
        setMiniKitProcessed(true);

        try {
          await createOrLoadFarcasterUser(miniKitUser);
        } catch (error) {
          console.error("Auto MiniKit auth failed:", error);
          // Fallback to guest if MiniKit auth fails
          setIsLoading(false);
        }
      }
    };

    autoAuthWithMiniKit();
  }, [miniKitUser, miniKitProcessed, isLoading]);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log("Auth state changed:", event, supabaseSession?.user?.id);

      if (supabaseSession?.user) {
        setUser(supabaseSession.user);
        await loadAppUser(supabaseSession.user.id);
      } else {
        setUser(null);
        // Don't clear appUser/session here if we have MiniKit user
        if (!miniKitUser) {
          setAppUser(null);
          setSession(null);
        }
      }
    });

    // Check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: supabaseSession } }) => {
        if (supabaseSession?.user) {
          setUser(supabaseSession.user);
          loadAppUser(supabaseSession.user.id).then(() => {
            setIsLoading(false);
          });
        } else {
          // Check for guest session in localStorage, but don't finish loading yet
          // Let MiniKit check happen first
          checkGuestSession().then(() => {
            // Only set loading to false if no MiniKit user is expected
            if (!miniKitUser) {
              setIsLoading(false);
            }
          });
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  const createOrLoadFarcasterUser = async (farcasterUser: any) => {
    try {
      setIsLoading(true);

      // Check if user already exists by FID
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("farcaster_fid", farcasterUser.fid?.toString())
        .single();

      if (existingUser) {
        // User exists, load them
        setAppUser(existingUser);
        setSession({
          id: "minikit-session",
          user_id: existingUser.id,
          session_token: `minikit_${farcasterUser.fid}`,
          auth_type: "siwf",
          farcaster_fid: farcasterUser.fid?.toString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        });
      } else {
        // Create new Farcaster user
        const userData = {
          farcaster_fid: farcasterUser.fid?.toString(),
          handle: farcasterUser.username,
          display_name:
            farcasterUser.displayName ||
            farcasterUser.username ||
            "Farcaster User",
          avatar_url: farcasterUser.pfpUrl,
          is_guest: false,
        };

        const { data: newUser, error } = await supabase
          .from("users")
          .insert(userData)
          .select()
          .single();

        if (error) throw error;

        setAppUser(newUser);
        setSession({
          id: "minikit-session",
          user_id: newUser.id,
          session_token: `minikit_${farcasterUser.fid}`,
          auth_type: "siwf",
          farcaster_fid: farcasterUser.fid?.toString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        });

        toast.success(`Welcome ${userData.display_name}! 🎉`);
      }
    } catch (error) {
      console.error("Error creating/loading Farcaster user:", error);
      toast.error("Failed to authenticate with Farcaster");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkGuestSession = async () => {
    const guestSessionId = localStorage.getItem("wordwave_guest_session");
    if (guestSessionId) {
      try {
        const { data: guestUser } = await supabase
          .from("users")
          .select("*")
          .eq("guest_session_id", guestSessionId)
          .eq("is_guest", true)
          .single();

        if (guestUser) {
          setAppUser(guestUser);
          // Create a mock session for guest
          setSession({
            id: "guest-session",
            user_id: guestUser.id,
            session_token: guestSessionId,
            auth_type: "guest",
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(), // 24 hours
            is_active: true,
          });
        }
      } catch (error) {
        console.error("Error loading guest session:", error);
        localStorage.removeItem("wordwave_guest_session");
      }
    }
  };

  const loadAppUser = async (supabaseUserId: string) => {
    try {
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("supabase_auth_id", supabaseUserId)
        .single();

      if (existingUser) {
        setAppUser(existingUser);
      } else {
        // Create app user if doesn't exist
        const userData = {
          supabase_auth_id: supabaseUserId,
          display_name:
            user?.user_metadata?.display_name ||
            user?.email?.split("@")[0] ||
            "Player",
          avatar_url: user?.user_metadata?.avatar_url,
          is_guest: false,
        };

        const { data: newUser, error } = await supabase
          .from("users")
          .insert(userData)
          .select()
          .single();

        if (error) throw error;
        setAppUser(newUser);
      }
    } catch (error) {
      console.error("Error loading app user:", error);
      toast.error("Failed to load user profile");
    }
  };

  const signInAsGuest = async () => {
    try {
      setIsLoading(true);

      // Use MiniKit context for better guest experience if available
      const guestName =
        miniKitUser?.displayName || `Guest ${Math.floor(Math.random() * 1000)}`;

      // Call the create_guest_user function
      const { data: guestUserId } = await supabase.rpc("create_guest_user", {
        display_name: guestName,
        avatar_url: miniKitUser?.pfpUrl,
      });

      if (!guestUserId) throw new Error("Failed to create guest user");

      // Get the created user
      const { data: guestUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", guestUserId)
        .single();

      if (!guestUser) throw new Error("Failed to retrieve guest user");

      setAppUser(guestUser);

      // Store guest session in localStorage
      localStorage.setItem(
        "wordwave_guest_session",
        guestUser.guest_session_id
      );

      // Create session record
      setSession({
        id: "guest-session",
        user_id: guestUser.id,
        session_token: guestUser.guest_session_id,
        auth_type: "guest",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      });

      toast.success("Playing as guest! Sign in to save your progress.");
    } catch (error) {
      console.error("Guest sign in error:", error);
      toast.error("Failed to create guest session");
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSIWF = async () => {
    try {
      setIsLoading(true);

      if (miniKitUser) {
        // If MiniKit user is available, use it directly
        await createOrLoadFarcasterUser(miniKitUser);
      } else {
        toast.info("Sign In with Farcaster coming soon!");
        // TODO: Implement SIWF using OnchainKit without MiniKit
      }
    } catch (error) {
      console.error("SIWF error:", error);
      toast.error("Failed to sign in with Farcaster");
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithWallet = async () => {
    try {
      setIsLoading(true);
      toast.info("Wallet authentication coming soon!");
      // TODO: Implement wallet auth using OnchainKit
    } catch (error) {
      console.error("Wallet auth error:", error);
      toast.error("Failed to authenticate with wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      // Sign out from Supabase if authenticated
      if (user) {
        await supabase.auth.signOut();
      }

      // Clear guest session
      localStorage.removeItem("wordwave_guest_session");

      // Clear state
      setUser(null);
      setAppUser(null);
      setSession(null);
      setMiniKitProcessed(false);

      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = Boolean(user || appUser);
  const isGuest = Boolean(appUser?.is_guest);

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        session,
        isLoading,
        signInAsGuest,
        signInWithSIWF,
        signInWithWallet,
        signOut,
        miniKitUser,
        miniKitClient,
        isAuthenticated,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
