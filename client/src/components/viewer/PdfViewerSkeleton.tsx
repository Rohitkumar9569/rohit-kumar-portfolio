import React from 'react';

const PdfViewerSkeleton = () => {
  const isMobile = window.innerWidth < 768;

  return (
    <div className="h-screen w-screen bg-slate-800 flex flex-col md:flex-row overflow-hidden animate-pulse">
      {/* PDF Viewer Side Skeleton */}
      <div className="relative w-full md:w-3/5 h-full">
        {/* Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-slate-900/80 h-12 flex items-center justify-between px-2 sm:px-4">
          <div className="h-7 w-7 rounded-full bg-slate-700"></div>
          <div className="h-5 w-16 rounded bg-slate-700"></div>
          <div className="flex-grow flex justify-center items-center gap-2 text-white">
            <div className="h-7 w-16 rounded bg-slate-700 hidden sm:block"></div>
            <div className="h-5 w-px bg-slate-700 mx-1"></div>
            <div className="h-7 w-7 rounded-md bg-slate-700"></div>
            <div className="h-5 w-12 rounded bg-slate-700"></div>
            <div className="h-7 w-7 rounded-md bg-slate-700"></div>
            <div className="h-5 w-px bg-slate-700 mx-1"></div>
            <div className="h-7 w-7 rounded-md bg-slate-700"></div>
          </div>
          <div className="w-5 sm:w-6"></div>
        </div>

        {/* Page Content Skeleton */}
        <main className="h-full pt-12 flex justify-center bg-slate-700 overflow-hidden">
          <div className="w-[95%] md:w-4/5 h-[85%] mt-4 bg-slate-600 rounded-lg"></div>
        </main>
      </div>

      {/* Chat Interface Side Skeleton (Desktop only) */}
      {!isMobile && (
        <aside className="w-2/5 h-full bg-slate-900 border-l border-slate-700 p-4">
          <div className="h-6 w-1/3 rounded bg-slate-700 mb-6"></div>
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0"></div>
            <div className="h-16 w-3/4 rounded-lg bg-slate-800"></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-1/4 rounded-lg bg-slate-800"></div>
            <div className="h-8 w-2/5 rounded-lg bg-slate-800"></div>
            <div className="h-8 w-1/3 rounded-lg bg-slate-800"></div>
          </div>
          <div className="absolute bottom-4 right-4 w-[38%]">
             <div className="h-12 w-full rounded-lg bg-slate-800"></div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default PdfViewerSkeleton;