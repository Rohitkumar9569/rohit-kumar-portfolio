// src/framer-motion-3d.d.ts

import 'react';
import { MotionProps } from 'framer-motion';
import { MeshProps } from '@react-three/fiber';

// This tells the editor's JSX parser that an element called 'motion.mesh' exists
// and what props it can accept.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'motion.mesh': MotionProps & MeshProps & React.RefAttributes<THREE.Mesh>;
    }
  }
}
declare module '*.jpg' {
  const path: string;
  export default path;
}
declare module '*.png' {
  const path: string;
  export default path;
}