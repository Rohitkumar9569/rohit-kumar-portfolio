const PageLoader = () => {
  return (
    <div className="premium-loader-shell flex min-h-[50vh] w-full items-center justify-center px-6" role="status" aria-label="Loading Study Hub">
      <div className="study-hub-launch-content text-center">
        <p className="study-hub-launch-eyebrow text-[0.62rem] font-black uppercase tracking-[0.42em] text-cyan-800/65 dark:text-cyan-300/70">
          Rohit Kumar
        </p>
        <h2 className="study-hub-launch-title mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-3xl">
          Study Hub
        </h2>
        <div className="study-hub-launch-line mx-auto mt-4 h-px w-28 bg-gradient-to-r from-transparent via-cyan-700/55 to-transparent dark:via-cyan-300/70" />
      </div>
      <span className="sr-only">Loading Study Hub</span>
    </div>
  );
};

export default PageLoader;
