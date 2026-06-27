import { motion } from 'framer-motion';
import { Edit, Save, Upload } from 'lucide-react';
import { useState } from 'react';

const userProfile = {
  name: 'Rahul',
  avatar: 'https://i.pravatar.cc/150?u=rahul',
  bio: 'Aspiring Full Stack Developer with a passion for creating beautiful and functional web applications. Currently mastering React and TypeScript.',
  skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'Framer Motion'],
};

export default function UserProfileCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(userProfile.bio);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gray-900/50 border border-white/10 rounded-2xl"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
        <div className="relative">
          <img src={userProfile.avatar} alt="User Avatar" className="w-24 h-24 rounded-full border-4 border-accent" />
          <button className="absolute bottom-0 right-0 bg-accent p-2 rounded-full text-white hover:bg-accent-light transition-colors">
            <Upload className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold">{userProfile.name}</h2>
          <p className="text-gray-400">Level 12 - Elite Coder</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Bio</h3>
          <button onClick={() => setIsEditing(!isEditing)} className="text-accent text-sm flex items-center gap-1">
            {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>
        {isEditing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            rows={4}
          />
        ) : (
          <p className="text-sm text-gray-300">{bio}</p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-3">Top Skills</h3>
        <div className="flex flex-wrap gap-2">
          {userProfile.skills.map(skill => (
            <span key={skill} className="bg-accent/20 text-accent text-xs font-semibold px-3 py-1 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
