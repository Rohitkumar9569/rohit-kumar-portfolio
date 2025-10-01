import { useNavigate, useLocation } from 'react-router-dom';
import { scroller } from 'react-scroll';

export const useSectionNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSection = (section: string) => {
    // If we're not on the homepage, navigate there first with a search parameter.
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${section}`);
    } else {
      // If we're already on the homepage, just scroll.
      scroller.scrollTo(section, {
        duration: 800,
        delay: 0,
        smooth: 'easeInOutQuart',
        offset: -70, // Your navbar offset
      });
    }
  };

  return navigateToSection;
};