import React from 'react';

const PageLoader = () => {
  return (
    <div
      // Background now supports both modes, using consistent theme colors
      className="flex justify-center items-center min-h-screen w-full 
    bg-slate-50 dark:bg-background"
    >
      {/* Spinner: Uses Cyan for the visible border and transparent for the top border,
        creating a high-contrast, professional loading animation in both themes.
      */}
      <div
        className="w-12 h-12 rounded-full animate-spin border-4 border-solid 
      border-cyan-500 dark:border-cyan-400 
        border-t-transparent"
      ></div>
    </div>
  );
};

export default PageLoader;