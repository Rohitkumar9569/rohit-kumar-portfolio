import React from 'react';
import { Outlet } from 'react-router-dom';

const ViewerLayout = () => {
  return (
    <div className="bg-slate-900 text-white">
      <main>
        <Outlet /> {/* This will render the viewer page */}
      </main>
    </div>
  );
};

export default ViewerLayout;