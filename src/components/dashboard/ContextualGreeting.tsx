import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ContextualGreetingProps {
  userName?: string;
  streak?: number;
  previousStruggle?: string;
}

export default function ContextualGreeting({
  userName = 'Learner',
  streak = 7,
  previousStruggle
}: ContextualGreetingProps) {
  const [greeting, setGreeting] = useState('');
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();

    // Determine greeting based on time and context
    let greetingText = '';
    let motivationText = '';

    if (previousStruggle) {
      greetingText = `Welcome back, ${userName}!`;
      motivationText = `I noticed you found ${previousStruggle} challenging yesterday. How about we start with a quick review exercise?`;
    } else if (lastVisit && now - parseInt(lastVisit) > 86400000) { // More than 1 day
      greetingText = `Welcome back, ${userName}!`;
      motivationText = `You're on a ${streak}-day streak. Let's keep the momentum going! 🔥`;
    } else if (hour < 12) {
      greetingText = `Good morning, ${userName}!`;
      motivationText = `Ready to tackle that tricky TypeScript module today? Let's make it count!`;
    } else if (hour < 18) {
      greetingText = `Good afternoon, ${userName}!`;
      motivationText = `Perfect time for some focused learning. Your brain is at peak performance!`;
    } else {
      greetingText = `Good evening, ${userName}!`;
      motivationText = `Evening study session? Great! Let's make some progress before wrapping up.`;
    }

    setGreeting(greetingText);
    setMotivation(motivationText);

    // Update last visit
    localStorage.setItem('lastVisit', now.toString());
  }, [userName, streak, previousStruggle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-8 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-accent/20 via-purple-500/20 to-blue-500/20 rounded-2xl"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />

      <div className="relative z-10 p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Main Greeting */}
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-accent to-purple-400 bg-clip-text text-transparent"
            >
              {greeting}
            </motion.h1>

            {/* Motivational message */}
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 text-lg max-w-2xl"
            >
              {motivation}
            </motion.p>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-6 mt-6"
            >
              {streak > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full border border-orange-500/30">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-semibold">
                    <span className="text-orange-500">{streak}</span>
                    <span className="text-gray-400 ml-1">day streak</span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold">
                  <span className="text-green-500">+23%</span>
                  <span className="text-gray-400 ml-1">this week</span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Animated icon */}
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="hidden md:block p-4 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-2xl"
          >
            <Sparkles className="w-12 h-12 text-accent" />
          </motion.div>
        </div>
      </div>

      {/* Bottom glow effect */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
}
