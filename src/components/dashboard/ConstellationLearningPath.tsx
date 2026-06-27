import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

interface LessonNode {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  locked: boolean;
  position: [number, number, number];
  connections: number[];
}

const lessonNodes: LessonNode[] = [
  { id: 1, title: 'JavaScript Basics', description: 'Variables & Functions', completed: true, current: false, locked: false, position: [-6, 0, 0], connections: [2] },
  { id: 2, title: 'DOM Manipulation', description: 'Working with HTML', completed: true, current: false, locked: false, position: [-4, 1.5, -1], connections: [3] },
  { id: 3, title: 'ES6+ Features', description: 'Modern JavaScript', completed: true, current: false, locked: false, position: [-2, 0, 1], connections: [4, 5] },
  { id: 4, title: 'React Fundamentals', description: 'Components & Props', completed: true, current: false, locked: false, position: [0, 2, 0], connections: [6] },
  { id: 5, title: 'Async Programming', description: 'Promises & Async/Await', completed: false, current: true, locked: false, position: [0, -1.5, -1], connections: [6] },
  { id: 6, title: 'State Management', description: 'React Hooks & Context', completed: false, current: false, locked: false, position: [2, 0.5, 1], connections: [7] },
  { id: 7, title: 'API Integration', description: 'REST & GraphQL', completed: false, current: false, locked: false, position: [4, 1.5, 0], connections: [8] },
  { id: 8, title: 'Full Stack Project', description: 'Build Complete App', completed: false, current: false, locked: false, position: [6, 0, -1], connections: [] },
];

function FloatingNode({ node, onClick, onHover }: { 
  node: LessonNode; 
  onClick: () => void;
  onHover: (node: LessonNode | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const floatOffset = Math.sin(time + node.id) * 0.15;
    
    meshRef.current.position.y = floatOffset;
    if (glowRef.current) glowRef.current.position.y = floatOffset;
    if (textRef.current) textRef.current.position.y = -1.0 + floatOffset;

    meshRef.current.rotation.y = time * 0.2;
    
    if (node.current && glowRef.current) {
      const pulse = Math.sin(time * 2) * 0.3 + 0.7;
      glowRef.current.scale.setScalar(pulse * 1.5);
    }
    
    const targetScale = hovered ? 1.3 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  const getNodeColor = () => {
    if (node.locked) return '#3a3a3a';
    if (node.completed) return '#0ea5e9';
    if (node.current) return '#ffffff';
    return '#6366f1';
  };

  return (
    <group position={node.position}>
      {/* Main glowing sphere */}
      <mesh
        ref={meshRef}
        onClick={node.locked ? undefined : onClick}
        onPointerOver={() => { if (!node.locked) { setHovered(true); onHover(node); } }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={getNodeColor()} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ring for completed nodes */}
      {node.completed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.05, 16, 32]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.8} />
        </mesh>
      )}

      <Text
        ref={textRef}
        position={[0, -1.0, 0]}
        fontSize={hovered ? 0.35 : 0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.5}
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        {node.title}
      </Text>
    </group>
  );
}

function ConnectionLines({ nodes }: { nodes: LessonNode[] }) {
    const lines = useMemo(() => {
        const result: Array<{ key: string; geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial }> = [];
        
        nodes.forEach(node => {
            node.connections.forEach(connId => {
                const targetNode = nodes.find(n => n.id === connId);
                if (!targetNode) return;

                const bothCompleted = node.completed && targetNode.completed;
                const start = new THREE.Vector3(...node.position);
                const end = new THREE.Vector3(...targetNode.position);
                const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
                midPoint.y += 0.5;
                const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
                const points = curve.getPoints(50);
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: bothCompleted ? '#0ea5e9' : '#6b7280',
                    transparent: true,
                    opacity: bothCompleted ? 1.0 : 0.6,
                    linewidth: 2,
                });

                result.push({ key: `${node.id}-${connId}`, geometry, material });
            });
        });
        
        return result;
    }, [nodes]);

    return (
        <group>
            {lines.map((line) => (
                <primitive key={line.key} object={new THREE.Line(line.geometry, line.material)} />
            ))}
        </group>
    );
}

function Scene({ nodes, onNodeClick, onNodeHover }: { 
  nodes: LessonNode[]; 
  onNodeClick: (node: LessonNode) => void;
  onNodeHover: (node: LessonNode | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.0} />
      <ConnectionLines nodes={nodes} />
      {nodes.map(node => (
        <FloatingNode 
          key={node.id} 
          node={node} 
          onClick={() => onNodeClick(node)}
          onHover={onNodeHover}
        />
      ))}
      <Stars />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={25}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

function Stars() {
    const positions = useMemo(() => {
        const count = 400;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 50;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
        return pos;
    }, []);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.5} />
        </points>
    );
}

export default function ConstellationLearningPath() {
  const [hoveredNode, setHoveredNode] = useState<LessonNode | null>(null);
  const navigate = useNavigate();

  const handleNodeClick = (node: LessonNode) => {
    if (!node.locked) {
      navigate('/lesson', {
      state: {
        topic: node.title,
        description: node.description,
        level: node.current ? 'intermediate' : node.completed ? 'advanced' : 'beginner',
      },
    });
    }
  };

  const completedCount = lessonNodes.filter(n => n.completed).length;
  const totalCount = lessonNodes.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="relative w-full mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Your Learning Constellation</h2>
        <p className="text-sm text-gray-400">Navigate through your personalized learning path</p>
      </div>
      
      <div 
        className="w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black border-2 border-purple-500/50 shadow-2xl relative"
        style={{ minHeight: '600px' }}
      >
        <Canvas 
          camera={{ position: [0, 2, 12], fov: 50 }} 
          gl={{ antialias: true, alpha: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#000000']} />
          <Scene 
            nodes={lessonNodes} 
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
          />
        </Canvas>
        
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="glass-effect rounded-xl p-3 bg-black/60 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-sky-500"></div>
              <span className="text-xs text-gray-300">Completed</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
              <span className="text-xs text-gray-300">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-xs text-gray-300">Available</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-none"
          >
            <div className="glass-effect rounded-xl p-6 bg-black/70 backdrop-blur-md border border-white/20 min-w-[300px]">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-xl font-bold text-white">{hoveredNode.title}</h4>
                {hoveredNode.current && (
                  <Play className="w-5 h-5 text-white animate-pulse" />
                )}
              </div>
              <p className="text-sm text-gray-300 mb-3">{hoveredNode.description}</p>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  hoveredNode.completed 
                    ? 'bg-sky-500/20 text-sky-400'
                    : hoveredNode.current
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {hoveredNode.completed ? 'Completed' : hoveredNode.current ? 'In Progress' : 'Available'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-sky-400">{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
