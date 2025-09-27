import React from 'react';

const PdfPageSkeleton = () => {
  return (
    <div className="flex justify-center py-2 md:py-4">
      <div className="w-[95%] md:w-4/5 h-[120vh] bg-slate-600 rounded-lg animate-pulse"></div>
    </div>
  );
};

export default PdfPageSkeleton;