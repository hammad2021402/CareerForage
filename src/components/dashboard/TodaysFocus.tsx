import { motion } from 'framer-motion';
import { Target, BookOpen, Code, TrendingUp, Check } from 'lucide-react';
import { useState } from 'react';

interface FocusTask {
  id: number;
  type: 'lesson' | 'challenge' | 'review' | 'explore';
  title: string;
  xpReward: number;
  icon: typeof Target;
  completed: boolean;
}

const initialTasks: FocusTask[] = [
  {
    id: 1,
    type: 'review',
    title: 'Review Custom Hooks',
    xpReward: 50,
    icon: BookOpen,
    completed: false,
  },
  {
    id: 2,
    type: 'challenge',
    title: 'Coding Challenge: Arrays',
    xpReward: 150,
    icon: Code,
    completed: false,
  },
  {
    id: 3,
    type: 'explore',
    title: 'Explore Data Analyst Path',
    xpReward: 75,
    icon: TrendingUp,
    completed: false,
  },
];

export default function TodaysFocus() {
  const [tasks, setTasks] = useState<FocusTask[]>(initialTasks);

  const handleCompleteTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800 w-full max-w-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-accent to-purple-500 rounded-xl shadow-lg shadow-accent/30">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Today's Missions</h2>
          <p className="text-xs text-gray-400">AI-curated tasks for you</p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={`p-3 rounded-lg transition-all cursor-pointer ${
              task.completed 
                ? 'bg-green-900/30 border-l-4 border-green-500' 
                : 'bg-dark-800/50 hover:bg-dark-700/70'
            }`}
            onClick={() => handleCompleteTask(task.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`transition-colors ${task.completed ? 'text-green-500' : 'text-accent'}`}>
                  {task.completed ? <Check className="w-4 h-4" /> : <task.icon className="w-4 h-4" />}
                </div>
                <span className={`text-sm font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {task.title}
                </span>
              </div>
              <span className="text-xs font-bold text-yellow-400">+{task.xpReward} XP</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
