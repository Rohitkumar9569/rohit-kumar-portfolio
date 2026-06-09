import { useNavigate, useLocation } from 'react-router-dom';
import { scrollToPortfolioSection } from '../utils/lenisController';

export const useSectionNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSection = (section: string) => {
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${section}`);
      return;
    }

    scrollToPortfolioSection(section);
  };

  return navigateToSection;
};