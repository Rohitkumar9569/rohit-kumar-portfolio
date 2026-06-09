const PageLoader = () => {
  return (
    <div className="premium-loader-shell flex min-h-screen w-full items-center justify-center" role="status" aria-label="Loading">
      <div className="premium-loader-ring relative h-16 w-16 rounded-full" aria-hidden="true">
        <span className="absolute inset-2 rounded-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default PageLoader;
