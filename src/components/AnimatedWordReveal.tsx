import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedWordRevealProps {
  word: string;
  isActive?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "brand" | "magenta" | "cyan" | "green";
  onAnimationComplete?: () => void;
}

export function AnimatedWordReveal({
  word,
  isActive = false,
  size = "lg",
  color = "brand",
  onAnimationComplete,
}: AnimatedWordRevealProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, word.length * 120 + 800); // Slower, smoother timing
      return () => clearTimeout(timer);
    }
  }, [isActive, word.length, onAnimationComplete]);

  if (!isVisible || !word) return null;

  const letters = word.toUpperCase().split("");

  const sizeClasses = {
    sm: "text-2xl md:text-3xl",
    md: "text-3xl md:text-4xl",
    lg: "text-4xl md:text-6xl",
    xl: "text-5xl md:text-7xl",
  };

  const colorClasses = {
    brand: "text-brand-500",
    magenta: "text-neon-magenta",
    cyan: "text-neon-cyan",
    green: "text-neon-green",
  };

  return (
    <div className="flex items-center justify-center min-h-[100px] select-none">
      <div
        className={`flex items-center justify-center font-bold tracking-wider ${sizeClasses[size]} ${colorClasses[color]}`}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={`${word}-${index}`}
            initial={{
              opacity: 0,
              y: -30,
              scale: 0.8,
              filter: "blur(8px)",
              rotateX: -90,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              rotateX: 0,
            }}
            transition={{
              delay: index * 0.12, // Slower letter-by-letter reveal
              type: "spring",
              stiffness: 200,
              damping: 20,
              duration: 0.8,
            }}
            className="inline-block mx-0.5 drop-shadow-2xl animate-neon-glow transform-gpu"
            style={{
              textShadow: `0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor`,
              transformStyle: "preserve-3d",
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
