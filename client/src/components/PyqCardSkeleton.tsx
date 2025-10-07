// src/components/PyqCardSkeleton.tsx

import React from 'react';

const PyqCardSkeleton = () => {
  return (
    // Card Background: White/Light Gray in Light Mode, Slate-800 in Dark Mode (consistent with other cards)
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 animate-pulse
            shadow-lg shadow-gray-300/50 dark:shadow-slate-900/50">

      {/* Year Placeholder (Darker bar inside the card) */}
      <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded-full w-1/4 mb-4"></div>

      {/* Title Placeholder */}
      <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-3/4 mb-3"></div>

      {/* Exam Name Placeholder */}
      <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/2 mb-6"></div>

      {/* Buttons Placeholder */}
      <div className="flex space-x-4 mt-6">
        {/* Button 1 */}
        <div className="h-10 bg-gray-300 dark:bg-slate-700 rounded-xl w-full"></div>
        {/* Button 2 */}
        <div className="h-10 bg-gray-300 dark:bg-slate-700 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

export default PyqCardSkeleton;