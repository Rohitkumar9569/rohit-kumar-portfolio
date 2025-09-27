import React from 'react';

const PageLoader = () => {
  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-slate-900">
      {/* This is a simple spinner made with Tailwind CSS */}
      <div className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-cyan-500 border-t-transparent"></div>
    </div>
  );
};

export default PageLoader;