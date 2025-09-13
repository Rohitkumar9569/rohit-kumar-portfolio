import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { scroller } from 'react-scroll';
import { motion } from 'framer-motion';

const InteractiveCube = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  React.useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  const handleFaceClick = (event: any) => {
    event.stopPropagation();
    const faceIndex = Math.floor(event.face.materialIndex);
    
    // <-- CORRECTED: Array now has 6 items for 6 faces
    const sections = ['about', 'skills', 'projects', 'contact', 'about', 'certifications']; 
    const sectionToScroll = sections[faceIndex];

    scroller.scrollTo(sectionToScroll, {
      duration: 500, // <-- FASTER SCROLLING
      delay: 0,
      smooth: 'easeInOutQuad',
    });
  };

  const boxSize = 2.5;
  const textOffset = boxSize / 2 + 0.1;

  return (
    <group ref={meshRef}>
      <motion.mesh
        onClick={handleFaceClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        animate={{ scale: hovered ? 1.1 : 1 }}
        whileTap={{ scale: 0.95 }} // <-- ADDED PRESS ANIMATION
      >
        <boxGeometry args={[boxSize, boxSize, boxSize]} />
        <meshPhysicalMaterial attach="material-0" color="#22d3ee" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-1" color="#f87171" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-2" color="#4ade80" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-3" color="#fbbf24" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-4" color="#a78bfa" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-5" color="#e879f9" roughness={0.5} metalness={0.7} /> 
      </motion.mesh>

      <motion.group 
        animate={{ scale: hovered ? 1.1 : 1 }}
        whileTap={{ scale: 0.95 }} // <-- ADDED PRESS ANIMATION
      >
        {/* <-- UPDATED TEXT LABEL to "Home" */}
        <Text position={[0, 0, textOffset]} fontSize={0.4} color="white">Home</Text>
        <Text position={[0, 0, -textOffset]} rotation={[0, Math.PI, 0]} fontSize={0.35} color="white">Certs</Text>
        <Text position={[textOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.4} color="white">About</Text>
        <Text position={[-textOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.4} color="white">Skills</Text>
        <Text position={[0, textOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="white">Projects</Text>
        <Text position={[0, -textOffset, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.4} color="white">Contact</Text>
      </motion.group>
    </group>
  );
};

const ArchitectCanvas = () => {
  return (
    <Canvas>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <InteractiveCube />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
};

export default ArchitectCanvas;