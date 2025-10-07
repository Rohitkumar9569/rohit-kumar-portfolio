import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink, scroller } from 'react-scroll';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Logo from './Logo';
import API from '../api';
import ThemeToggleButton from './ThemeToggleButton';

interface IExamLink {
  _id: string;
  shortName: string;
  slug: string;
}

const Navbar = () => {
  // --- State Management ---
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [studyHubExams, setStudyHubExams] = useState<IExamLink[]>([]);
  const [isStudyHubMobileOpen, setStudyHubMobileOpen] = useState(false);

  // --- Hooks ---
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await API.get('/api/exams');
        setStudyHubExams(response.data);
      } catch (error) {
        console.error("Failed to fetch exams for navbar:", error);
      }
    };

    fetchExams();
  }, []);

  // --- Side Effects for scroll behavior ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY + 120) setIsVisible(false);
        else if (currentScrollY < lastScrollY) setIsVisible(true);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionToScroll = params.get('scrollTo');
    if (sectionToScroll) {
      scroller.scrollTo(sectionToScroll, { duration: 800, delay: 100, smooth: 'easeInOutQuart', offset: -70 });
    }
  }, [location.search]);

  // --- Handlers ---
  const handleScrollTo = (section: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${section}`);
    } else {
      scroller.scrollTo(section, { duration: 800, delay: 0, smooth: 'easeInOutQuart', offset: -70 });
    }
  };

  const handleLogoClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
    setStudyHubMobileOpen(false);
  };

  const navLinks = [
    { type: 'scroll', to: 'about', label: 'About' },
    { type: 'scroll', to: 'skills', label: 'Skills' },
    { type: 'scroll', to: 'certifications', label: 'Certifications' },
    { type: 'scroll', to: 'projects', label: 'Projects' },
    { type: 'hybrid_dropdown', label: 'Study Hub', scrollTo: 'study-hub' },
    { type: 'scroll', to: 'contact', label: 'Contact' },
  ];

  const studyHubDropdownItems = studyHubExams.map(exam => ({
    to: `/study/${exam.slug}`,
    label: exam.shortName,
  }));
  
  // --- Dynamic classes using theme variables ---
  const headerClasses = isScrolled
    ? 'bg-background/80 backdrop-blur-sm border-b border-foreground/10' // Use a subtle border color that works in both modes
    : 'bg-transparent';
  const navVisibilityClass = !isVisible ? '-translate-y-full' : 'translate-y-0';

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${headerClasses} ${navVisibilityClass}`}>
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="cursor-pointer" onClick={handleLogoClick}><Logo /></div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <ul className="flex items-center space-x-8 text-foreground">
            {navLinks.map((link) => (
              <li key={link.label} className="relative group">
                {link.type === 'scroll' && (
                  <ScrollLink 
                    to={link.to!} 
                    href={`#${link.to!}`} 
                    spy={true} 
                    smooth={'easeInOutQuart'} 
                    offset={-70} 
                    duration={800} 
                    className="cursor-pointer font-semibold hover:text-[hsl(var(--accent))] transition-colors duration-300" // Use accent color on hover
                    activeClass={location.pathname === '/' ? 'active-link' : ''} 
                    onClick={() => handleScrollTo(link.to!)}
                  >
                    {link.label}
                  </ScrollLink>
                )}
                {link.type === 'hybrid_dropdown' && (
                  <>
                    <div className={`cursor-pointer font-semibold hover:text-[hsl(var(--accent))] transition-colors duration-300 flex items-center ${location.pathname.startsWith('/study') ? 'active-link' : ''}`}>
                       <ScrollLink to={link.scrollTo!} spy={true} smooth={'easeInOutQuart'} offset={-70} duration={800} activeClass={location.pathname === '/' ? 'active-link' : ''} onClick={() => handleScrollTo(link.scrollTo!)}>
                        {link.label}
                      </ScrollLink>
                      <ChevronDownIcon className="h-4 w-4 ml-1" />
                    </div>
                    {studyHubDropdownItems.length > 0 && (
                      // Apply enhanced shadow and rounded corners for a premium feel
                      <ul className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-card text-card-foreground pt-4 pb-2 rounded-lg shadow-xl shadow-foreground/50 min-w-[150px]">
                        {studyHubDropdownItems.map(item => (
                          <li key={item.to}>
                            <Link 
                              to={item.to} 
                              // Add a subtle background on hover and use accent color for active item
                              className={`block px-4 py-2 text-sm text-center transition-colors duration-200 hover:bg-foreground/5 ${location.pathname === item.to ? 'text-[hsl(var(--accent))] font-semibold' : ''}`}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <ThemeToggleButton />
        </div>
        
        {/* Mobile menu and toggle button */}
        <div className="md:hidden flex items-center space-x-3">
          <ThemeToggleButton />
          <button aria-label="Toggle navigation menu" onClick={toggleMobileMenu}>
            {isOpen 
              ? <XMarkIcon className="h-6 w-6 text-foreground" /> 
              : <Bars3Icon className="h-6 w-6 text-foreground" />
            }
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-t border-foreground/10">
          <ul className="flex flex-col items-center py-4 text-foreground text-lg">
            {navLinks.map((link) => (
              <li key={link.label} className="cursor-pointer w-full text-center py-2 transition-colors duration-200 hover:bg-foreground/5">
                {link.type === 'scroll' && <span onClick={() => handleScrollTo(link.to!)}>{link.label}</span>}
                {link.type === 'hybrid_dropdown' && (
                  <div>
                    <div onClick={() => setStudyHubMobileOpen(!isStudyHubMobileOpen)} className={`font-semibold flex items-center justify-center ${location.pathname.startsWith('/study') ? 'text-[hsl(var(--accent))]' : ''}`}>
                      <span>{link.label}</span>
                      <ChevronRightIcon className={`h-4 w-4 ml-2 transition-transform ${isStudyHubMobileOpen ? 'rotate-90' : ''}`} />
                    </div>
                    {isStudyHubMobileOpen && studyHubDropdownItems.length > 0 && (
                      <ul className="flex flex-col items-center mt-2 space-y-2 bg-primary w-full py-3">
                        {studyHubDropdownItems.map(exam => (
                          <li key={exam.to} className="w-full text-center py-1 transition-colors duration-200 hover:bg-foreground/5">
                            <Link 
                              to={exam.to} 
                              onClick={() => setIsOpen(false)} 
                              className={`${location.pathname === exam.to ? 'text-[hsl(var(--accent))] font-semibold' : ''}`}
                            >
                              {exam.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;