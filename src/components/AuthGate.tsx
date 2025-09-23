import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Users, Wallet, Zap, ArrowRight } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
  showGuestOption?: boolean;
  requireAuth?: boolean;
  title?: string;
  description?: string;
}

export function AuthGate({
  children,
  showGuestOption = true,
  requireAuth = false,
  title = "Join the WordWave Revolution",
  description = "Connect your identity to save progress, compete on leaderboards, and unlock exclusive features.",
}: AuthGateProps) {
  const {
    isAuthenticated,
    isLoading,
    signInAsGuest,
    signInWithSIWF,
    signInWithWallet,
    miniKitUser,
  } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // If authenticated or guest is allowed and not requiring auth, show children
  if (isAuthenticated && (!requireAuth || !isLoading)) {
    return <>{children}</>;
  }

  // Show auth options
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel p-8 text-center space-y-6">
          {/* Header */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-16 h-16 bg-gradient-brand rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-8 h-8 text-background" />
            </div>
            <h1 className="text-2xl font-bold text-brand-500 mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </motion.div>

          {/* MiniKit Context Info */}
          {miniKitUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3"
            >
              <p className="text-xs text-brand-400">
                Welcome {miniKitUser.displayName}! 👋
              </p>
            </motion.div>
          )}

          {/* Auth Options */}
          <div className="space-y-3">
            {/* SIWF - Primary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={signInWithSIWF}
                className="w-full btn-neon text-base py-6 rounded-2xl"
              >
                <Users className="w-5 h-5 mr-3" />
                Sign In with Farcaster
                <ArrowRight className="w-4 h-4 ml-3" />
              </Button>
            </motion.div>

            {/* Wallet Auth - Secondary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={signInWithWallet}
                variant="outline"
                className="w-full border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/10 text-base py-6 rounded-2xl"
              >
                <Wallet className="w-5 h-5 mr-3" />
                Connect Wallet
              </Button>
            </motion.div>

            {/* Guest Option */}
            {showGuestOption && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={signInAsGuest}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground text-sm py-4"
                >
                  Continue as Guest
                </Button>
              </motion.div>
            )}
          </div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-muted-foreground space-y-1"
          >
            <p>✨ Save your game progress</p>
            <p>🏆 Compete on leaderboards</p>
            <p>🎮 Unlock exclusive features</p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
