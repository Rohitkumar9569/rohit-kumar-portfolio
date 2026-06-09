import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useSectionNavigation } from '../hooks/useSectionNavigation';

const WebGLContextGuard = () => {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
    };
    const handleContextRestored = () => invalidate();

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [gl, invalidate]);

  return null;
};

const InteractiveCube = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const navigateToSection = useSectionNavigation();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += delta * 0.5;
    groupRef.current.rotation.y += delta * 0.5;
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const navigateByFaceIndex = (faceIndex: number) => {
    switch (faceIndex) {
      case 0:
        navigateToSection('about');
        break;
      case 1:
        navigateToSection('skills');
        break;
      case 2:
        navigateToSection('projects');
        break;
      case 3:
        navigateToSection('contact');
        break;
      case 4:
        navigateToSection('study-hub');
        break;
      case 5:
        navigateToSection('certifications');
        break;
      default:
        break;
    }
  };

  const handleFaceClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    navigateByFaceIndex(Math.floor(event.face?.materialIndex ?? -1));
  };

  const boxSize = 2.5;
  const textOffset = boxSize / 2 + 0.1;

  return (
    <group ref={groupRef} scale={hovered ? 1.1 : 1}>
      <mesh
        onClick={handleFaceClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[boxSize, boxSize, boxSize]} />
        <meshPhysicalMaterial attach="material-0" color="#22d3ee" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-1" color="#f87171" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-2" color="#4ade80" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-3" color="#fbbf24" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-4" color="#a78bfa" roughness={0.5} metalness={0.7} />
        <meshPhysicalMaterial attach="material-5" color="#e879f9" roughness={0.5} metalness={0.7} />
      </mesh>

      <Text position={[textOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.4} color="white">
        About
      </Text>
      <Text position={[-textOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.4} color="white">
        Skills
      </Text>
      <Text position={[0, textOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="white">
        Projects
      </Text>
      <Text position={[0, -textOffset, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.4} color="white">
        Contact
      </Text>
      <Text position={[0, 0, textOffset]} fontSize={0.3} color="white">
        Study Hub
      </Text>
      <Text position={[0, 0, -textOffset]} rotation={[0, Math.PI, 0]} fontSize={0.35} color="white">
        Certs
      </Text>
    </group>
  );
};

const ArchitectCanvas = () => {
  return (
    <Canvas>
      <WebGLContextGuard />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <InteractiveCube />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={8} />
    </Canvas>
  );
};

export default ArchitectCanvas;
