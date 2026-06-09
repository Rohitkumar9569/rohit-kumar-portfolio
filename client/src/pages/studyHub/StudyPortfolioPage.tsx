import { useLayoutEffect } from 'react';
import PortfolioPage from '../PortfolioPage';

const getStudyMainScroller = () => (
  typeof document === 'undefined' ? null : document.getElementById('study-main-content')
);

const StudyPortfolioPage = () => {
  useLayoutEffect(() => {
    const resetScroll = () => {
      const mainScroller = getStudyMainScroller();

      if (mainScroller) {
        mainScroller.scrollTop = 0;
        mainScroller.scrollLeft = 0;
      }

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    resetScroll();

    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      resetScroll();
      secondFrameId = window.requestAnimationFrame(resetScroll);
    });
    const timerId = window.setTimeout(resetScroll, 180);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="study-portfolio-embed portfolio-root-shell w-full max-w-full min-w-0 overflow-x-clip">
      <PortfolioPage />
    </div>
  );
};

export default StudyPortfolioPage;
