import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  MapPin,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CareerSimulation from '../career/CareerSimulation';
import InteractiveSkillTree from '../career/InteractiveSkillTree';

type ViewMode = 'skills' | 'simulation';

type Skill = {
  name: string;
  acquired: boolean;
  level?: number;
};

type CareerPath = {
  id: number;
  title: string;
  description: string;
  avgSalary: string;
  growth: string;
  icon: string;
  jobsAvailable: number;
  location: string;
  requiredSkills: Skill[];
};

const careerPaths: CareerPath[] = [
  {
    id: 1,
    title: 'AI/ML Engineer',
    description: 'Build intelligent systems and deploy machine learning models at scale.',
    avgSalary: '$145K',
    growth: '+38%',
    icon: '🤖',
    jobsAvailable: 5400,
    location: 'Remote-first',
    requiredSkills: [
      { name: 'Python', acquired: true, level: 4 },
      { name: 'TensorFlow', acquired: false },
      { name: 'Data Engineering', acquired: true, level: 3 },
      { name: 'MLOps', acquired: false },
      { name: 'Statistics', acquired: true, level: 4 },
    ],
  },
  {
    id: 2,
    title: 'Full-Stack Developer',
    description: 'Design and ship user-facing features from frontend to backend services.',
    avgSalary: '$125K',
    growth: '+26%',
    icon: '💻',
    jobsAvailable: 8700,
    location: 'Hybrid · SF / NYC',
    requiredSkills: [
      { name: 'TypeScript', acquired: true, level: 4 },
      { name: 'React', acquired: true, level: 3 },
      { name: 'Node.js', acquired: false },
      { name: 'System Design', acquired: false },
      { name: 'CI/CD Automation', acquired: true, level: 2 },
    ],
  },
  {
    id: 3,
    title: 'Product Designer',
    description: 'Craft engaging user experiences backed by research and rapid iteration.',
    avgSalary: '$118K',
    growth: '+19%',
    icon: '🎨',
    jobsAvailable: 3100,
    location: 'Remote · Global',
    requiredSkills: [
      { name: 'User Research', acquired: true, level: 4 },
      { name: 'Figma', acquired: true, level: 5 },
      { name: 'Design Systems', acquired: false },
      { name: 'Prototyping', acquired: true, level: 3 },
      { name: 'Workshop Facilitation', acquired: false },
    ],
  },
  {
    id: 4,
    title: 'Cybersecurity Analyst',
    description: 'Protect systems, monitor threats, and lead incident response programs.',
    avgSalary: '$132K',
    growth: '+31%',
    icon: '🛡️',
    jobsAvailable: 4600,
    location: 'On-site · Major Tech Hubs',
    requiredSkills: [
      { name: 'Network Security', acquired: true, level: 4 },
      { name: 'Threat Hunting', acquired: false },
      { name: 'Cloud Security', acquired: true, level: 2 },
      { name: 'Compliance Frameworks', acquired: false },
      { name: 'Python Automation', acquired: true, level: 3 },
    ],
  },
];

const getSkillCompletion = (skills: Skill[]): number => {
  if (!skills.length) {
    return 0;
  }

  const acquired = skills.filter((skill) => skill.acquired).length;
  return (acquired / skills.length) * 100;
};

export default function CareerSimulator() {
  const [viewMode, setViewMode] = useState<ViewMode>('skills');
  const [activeCareer, setActiveCareer] = useState<CareerPath>(careerPaths[0]);
  const [selectedCareer, setSelectedCareer] = useState<CareerPath | null>(null);

  const activeCareerTitle = useMemo(() => activeCareer.title, [activeCareer]);

  const handleCardSelect = (career: CareerPath) => {
    setActiveCareer(career);
    setSelectedCareer(career);
  };

  const handleTreeSelect = (careerTitle: string) => {
    const matched = careerPaths.find((career) => career.title === careerTitle);
    if (matched) {
      setActiveCareer(matched);
      setViewMode('simulation');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-900 bg-gray-950">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold mb-1">Career Explorer</h1>
                <p className="text-gray-400">Discover your path to success</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-lg border border-accent/30">
              <Briefcase className="w-5 h-5 text-accent" />
              <span className="font-semibold text-accent">{activeCareerTitle}</span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('skills')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === 'skills'
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Interactive Skill Tree
            </button>
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === 'simulation'
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Career Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {viewMode === 'skills' ? (
          <motion.div
            key="skills"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <InteractiveSkillTree onSelectCareer={handleTreeSelect} />
          </motion.div>
        ) : (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CareerSimulation careerPath={activeCareerTitle} />
          </motion.div>
        )}
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Career Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careerPaths.map((career, index) => {
            const skillCompletion = getSkillCompletion(career.requiredSkills);

            return (
              <motion.div
                key={career.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleCardSelect(career)}
                className="card card-interactive cursor-pointer"
              >
                <div className="text-6xl mb-4">{career.icon}</div>

                <h3 className="heading-md mb-2">{career.title}</h3>
                <p className="text-small text-gray-400 mb-4">{career.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-800">
                  <div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                      <DollarSign className="w-3 h-3" />
                      Salary
                    </div>
                    <div className="font-semibold text-sm">{career.avgSalary}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Growth
                    </div>
                    <div className="font-semibold text-sm text-green-500">{career.growth}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Skills Acquired</span>
                    <span className="text-accent font-semibold">
                      {skillCompletion.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skillCompletion}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="h-full bg-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Briefcase className="w-4 h-4" />
                    <span>{career.jobsAvailable.toLocaleString()} jobs</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{career.location}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedCareer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
            onClick={() => setSelectedCareer(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="card card-selected max-w-4xl w-full my-8"
            >
              <button
                onClick={() => setSelectedCareer(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-start gap-6 mb-8">
                <div className="text-8xl">{selectedCareer.icon}</div>
                <div className="flex-1">
                  <h2 className="heading-lg mb-2">{selectedCareer.title}</h2>
                  <p className="text-gray-400 mb-4">{selectedCareer.description}</p>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <DollarSign className="w-4 h-4" />
                        Avg. Salary
                      </div>
                      <div className="font-bold">{selectedCareer.avgSalary}</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Growth Rate
                      </div>
                      <div className="font-bold text-green-500">{selectedCareer.growth}</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Users className="w-4 h-4" />
                        Open Positions
                      </div>
                      <div className="font-bold">
                        {selectedCareer.jobsAvailable.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="heading-md mb-4">Required Skills</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedCareer.requiredSkills.map((skill, index) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        skill.acquired
                          ? 'bg-accent/10 border-accent'
                          : 'bg-gray-900 border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{skill.name}</span>
                        {skill.acquired && (
                          <span className="text-xs bg-accent text-white px-2 py-1 rounded">
                            ✓ Acquired
                          </span>
                        )}
                      </div>

                      {skill.acquired && skill.level && (
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded ${
                                level <= (skill.level || 0) ? 'bg-accent' : 'bg-gray-800'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 mb-8">
                <h3 className="heading-sm mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent" />
                  Live Job Market Insights
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold mb-1">
                      {selectedCareer.jobsAvailable.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Current Openings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold mb-1">{selectedCareer.location}</div>
                    <div className="text-xs text-gray-400">Work Type</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold mb-1 text-green-500">
                      {selectedCareer.growth}
                    </div>
                    <div className="text-xs text-gray-400">Projected Growth (2024-2034)</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary flex-1">Create Learning Path</button>
                <button className="btn btn-ghost flex-1" disabled>
                  Simulate a Day
                  <span className="ml-2 text-xs opacity-50">(Coming Soon)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
