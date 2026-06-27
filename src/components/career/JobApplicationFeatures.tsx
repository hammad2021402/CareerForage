import { motion } from 'framer-motion';
import { Briefcase, Zap, Search, Linkedin } from 'lucide-react';

export default function JobApplicationFeatures() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 bg-gray-900/50 border border-white/10 rounded-2xl"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Briefcase className="text-accent" />
        Job Application Tools
      </h3>
      <div className="space-y-4">
        <button className="w-full btn btn-primary flex items-center justify-center gap-2">
          <Zap className="w-5 h-5" />
          <span>Auto-Apply to 5 Jobs</span>
        </button>
        <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
          <Search className="w-5 h-5" />
          <span>Find Matching Jobs</span>
        </button>
        <button className="w-full btn btn-ghost flex items-center justify-center gap-2 bg-[#0077B5] text-white hover:bg-[#005e92]">
          <Linkedin className="w-5 h-5" />
          <span>Update LinkedIn Profile</span>
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-4 text-center">
        Auto-Apply uses your profile and skills to find the best matches.
      </p>
    </motion.div>
  );
}
