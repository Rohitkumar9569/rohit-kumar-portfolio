// src/components/PyqCardSkeleton.tsx

import React from 'react';

const PyqCardSkeleton = () => {
  return (
    <div className="bg-slate-800 rounded-lg p-6 animate-pulse">
      {/* Year Placeholder */}
      <div className="h-4 bg-slate-700 rounded-full w-1/4 mb-4"></div>
      
      {/* Title Placeholder */}
      <div className="h-6 bg-slate-700 rounded w-3/4 mb-3"></div>
      
      {/* Exam Name Placeholder */}
      <div className="h-4 bg-slate-700 rounded w-1/2 mb-6"></div>
      
      {/* Buttons Placeholder */}
      <div className="flex space-x-4 mt-6">
        <div className="h-10 bg-slate-700 rounded-md w-full"></div>
        <div className="h-10 bg-slate-700 rounded-md w-full"></div>
      </div>
    </div>
  );
};

export default PyqCardSkeleton;