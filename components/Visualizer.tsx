import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ControllerState } from '../types';

interface VisualizerProps {
  physicsState: React.MutableRefObject<ControllerState>;
}

const PhoneMesh: React.FC<{ physicsState: React.MutableRefObject<ControllerState> }> = ({ physicsState }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const { position, rotation } = physicsState.current;
      
      // Update Position
      meshRef.current.position.set(position.x, position.y, position.z);
      
      // Update Rotation
      meshRef.current.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 2, 0.2]} /> {/* Phone shape roughly 1:2 ratio */}
      <meshStandardMaterial color="#00ff88" metalness={0.8} roughness={0.2} wireframe={false} />
      <axesHelper args={[2]} />
    </mesh>
  );
};

export const Visualizer: React.FC<VisualizerProps> = ({ physicsState }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={60} />
        <OrbitControls makeDefault />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} />

        <Grid 
            args={[20, 20]} 
            cellColor="#444" 
            sectionColor="#888" 
            fadeDistance={20} 
            fadeStrength={1}
        />
        
        <PhoneMesh physicsState={physicsState} />
      </Canvas>
    </div>
  );
};