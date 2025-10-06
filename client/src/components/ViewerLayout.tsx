import React from 'react';
import { Outlet } from 'react-router-dom';

const ViewerLayout = () => {
  return (
    <div className="bg-neutral-950 text-white">
      <main>
        <Outlet /> {/* This will render the viewer page */}
      </main>
    </div>
  );
};

export default ViewerLayout;