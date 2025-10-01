import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink, scroller } from 'react-scroll';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Logo from './Logo';
import API from '../api';

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
  const [examsFetched, setExamsFetched] = useState(false);
  const [isStudyHubMobileOpen, setStudyHubMobileOpen] = useState(false);

  // --- Hooks ---
  const navigate = useNavigate();
  const location = useLocation();

  // --- Data Fetching ---
  const fetchExamsIfNeeded = async () => {
    if (!examsFetched) {
      try {
        const response = await API.get('/api/exams');
        setStudyHubExams(response.data);
        setExamsFetched(true);
      } catch (error) {
        console.error("Failed to fetch exams for navbar:", error);
      }
    }
  };

  // --- Side Effects for scroll behavior ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY + 50) setIsVisible(false);
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
      scroller.scrollTo('about', { duration: 800, delay: 0, smooth: 'easeInOutQuart', offset: -70 });
    }
  };

  const toggleMobileMenu = () => {
    if (!isOpen) fetchExamsIfNeeded();
    setIsOpen(!isOpen);
    setStudyHubMobileOpen(false);
  };

  // --- UI Structure ---
  const navLinks = [
    { type: 'scroll', to: 'about', label: 'About' },
    { type: 'scroll', to: 'skills', label: 'Skills' },
    { type: 'scroll', to: 'certifications', label: 'Certifications' },
    { type: 'scroll', to: 'projects', label: 'Projects' },
    { type: 'hybrid_dropdown', label: 'Study Hub', scrollTo: 'study-hub' },
    { type: 'scroll', to: 'contact', label: 'Contact' },
  ];

  // Dynamically create dropdown items and check for active state
  const studyHubDropdownItems = studyHubExams.map(exam => ({
    to: `/study/${exam.slug}`,
    label: exam.shortName,
  }));

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/80 backdrop-blur-sm border-b border-slate-800' : 'bg-transparent'} ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}>
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="cursor-pointer" onClick={handleLogoClick}><Logo /></div>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center space-x-8 text-slate-300">
          {navLinks.map((link) => (
            <li 
              key={link.label} 
              className="relative group"
              onMouseEnter={link.type === 'hybrid_dropdown' ? fetchExamsIfNeeded : undefined}
            >
              {link.type === 'scroll' && (
                <ScrollLink to={link.to!} href={`#${link.to!}`} spy={true} smooth={'easeInOutQuart'} offset={-70} duration={800} className="cursor-pointer font-semibold hover:text-cyan-400 transition-colors relative" activeClass={location.pathname === '/' ? 'active-link' : ''} onClick={() => handleScrollTo(link.to!)}>
                  {link.label}
                </ScrollLink>
              )}
              {link.type === 'hybrid_dropdown' && (
                <>
                  <div className={`cursor-pointer font-semibold hover:text-cyan-400 transition-colors flex items-center ${location.pathname.startsWith('/study') ? 'active-link' : ''}`}>
                    <ScrollLink to={link.scrollTo!} spy={true} smooth={'easeInOutQuart'} offset={-70} duration={800} activeClass={location.pathname === '/' ? 'active-link' : ''} onClick={() => handleScrollTo(link.scrollTo!)}>
                      {link.label}
                    </ScrollLink>
                    <ChevronDownIcon className="h-4 w-4 ml-1" />
                  </div>
                  {studyHubDropdownItems.length > 0 && (
                    <ul className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white pt-4 pb-2 rounded-b-md shadow-lg min-w-[150px]">
                      {studyHubDropdownItems.map(item => (
                        <li key={item.to}>
                          {/* CHANGE 2.1: Added active state class for desktop */}
                          <Link to={item.to} className={`block px-4 py-2 text-sm text-center hover:bg-slate-700 ${location.pathname === item.to ? 'text-cyan-400 font-semibold' : ''}`}>
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
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button aria-label="Toggle navigation menu" onClick={toggleMobileMenu}>
            {isOpen ? <XMarkIcon className="h-6 w-6 text-white" /> : <Bars3Icon className="h-6 w-6 text-white" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-900">
          <ul className="flex flex-col items-center space-y-4 py-4 text-white">
            {navLinks.map((link) => (
              <li key={link.label} className="cursor-pointer w-full text-center">
                {link.type === 'scroll' && <span onClick={() => handleScrollTo(link.to!)}>{link.label}</span>}
                {link.type === 'hybrid_dropdown' && (
                  <div>
                    <div 
                      onClick={() => setStudyHubMobileOpen(!isStudyHubMobileOpen)} 
                      className={`font-semibold flex items-center justify-center py-2 ${location.pathname.startsWith('/study') ? 'text-cyan-400' : ''}`}
                    >
                      <span>{link.label}</span>
                      <ChevronRightIcon className={`h-4 w-4 ml-2 transition-transform ${isStudyHubMobileOpen ? 'rotate-90' : ''}`} />
                    </div>
                    {isStudyHubMobileOpen && studyHubDropdownItems.length > 0 && (
                      <ul className="flex flex-col items-center mt-2 space-y-3 bg-slate-800/50 w-full py-3">
                        {/* CHANGE 1: "Study Hub Home" link is removed */}
                        {studyHubDropdownItems.map(exam => (
                          <li key={exam.to}>
                            {/* CHANGE 2.2: Added active state class for mobile */}
                            <Link to={exam.to} onClick={() => setIsOpen(false)} className={`${location.pathname === exam.to ? 'text-cyan-400 font-semibold' : ''}`}>
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