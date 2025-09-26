import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink, scroller } from 'react-scroll';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import Logo from './Logo';
import axios from 'axios';

interface IExamLink {
  _id: string;
  shortName: string;
  slug: string;
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [studyHubExams, setStudyHubExams] = useState<IExamLink[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchExamsForNav = async () => {
      try {
        const response = await axios.get('/api/exams');
        setStudyHubExams(response.data);
      } catch (error) {
        console.error("Failed to fetch exams for navbar:", error);
      }
    };
    fetchExamsForNav();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY + 120) setIsVisible(false);
        else if (currentScrollY < lastScrollY - 10) setIsVisible(true);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionToScroll = params.get('scrollTo');
    if (sectionToScroll) {
      scroller.scrollTo(sectionToScroll, { duration: 800, delay: 100, smooth: 'easeInOutQuart', offset: -70 });
    }
  }, [location.search]);

  // This function is where we make the change
  const handleScrollTo = (section: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${section}`);
    } else {
      scroller.scrollTo(section, { 
        duration: 800, 
        delay: 0, 
        smooth: 'easeInOutQuart', 
        offset: -70 // <-- THE FIX: Changed from -80 to -70
      });
    }
  };

  const handleLogoClick = () => {
    if (location.pathname !== '/') navigate('/');
    else handleScrollTo('about');
  };

  const navLinks = [
    { type: 'scroll', to: 'about', label: 'About' },
    { type: 'scroll', to: 'skills', label: 'Skills' },
    { type: 'scroll', to: 'certifications', label: 'Certifications' },
    { type: 'scroll', to: 'projects', label: 'Projects' },
    {
      type: 'hybrid_dropdown',
      label: 'Study Hub',
      scrollTo: 'study-hub',
      items: studyHubExams.map(exam => ({
        type: 'route',
        to: `/study/${exam.slug}`,
        label: exam.shortName,
      }))
    },
    { type: 'scroll', to: 'contact', label: 'Contact' },
  ];

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/80 backdrop-blur-sm border-b border-slate-800' : 'bg-transparent'} ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}>
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="cursor-pointer" onClick={handleLogoClick}>
          <Logo />
        </div>

        <ul className="hidden md:flex items-center space-x-8 text-slate-300">
          {navLinks.map((link) => (
            <li key={link.label} className="relative group">
              {link.type === 'scroll' && (
                <ScrollLink 
                  to={link.to!} 
                  spy={true} 
                  smooth={'easeInOutQuart'} 
                  offset={-70} 
                  duration={800} 
                  className="cursor-pointer font-semibold hover:text-cyan-400 transition-colors relative" 
                  activeClass={location.pathname === '/' ? 'active-link' : ''}
                  onClick={() => handleScrollTo(link.to!)}
                >
                  {link.label}
                </ScrollLink>
              )}
              {link.type === 'hybrid_dropdown' && (
                <div onClick={() => handleScrollTo(link.scrollTo!)}>
                  <ScrollLink 
                    to={link.scrollTo!} 
                    spy={true} 
                    smooth={'easeInOutQuart'} 
                    offset={-70} 
                    duration={800} 
                    activeClass={location.pathname === '/' ? 'active-link' : ''} 
                    className="cursor-pointer"
                  >
                    <div className={`font-semibold hover:text-cyan-400 transition-colors flex items-center ${
                      location.pathname.startsWith('/study') ? 'active-link' : ''
                    }`}>
                      {link.label}
                      <ChevronDownIcon className="h-4 w-4 ml-1" />
                    </div>
                    {link.items && link.items.length > 0 && (
                       <ul className="absolute top-full left-0 hidden group-hover:block bg-slate-800 text-white pt-4 pb-2 rounded-b-md shadow-lg min-w-[100px]">
                       {link.items?.map(item => (
                         <li key={item.to} onClick={(e) => e.stopPropagation()}>
                           <Link to={item.to!} className="block px-4 py-2 text-sm hover:bg-slate-700">
                             {item.label}
                           </Link>
                         </li>
                       ))}
                     </ul>
                    )}
                  </ScrollLink>
                </div>
              )}
            </li>
          ))}
        </ul>
        
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <XMarkIcon className="h-6 w-6 text-white" /> : <Bars3Icon className="h-6 w-6 text-white" />}
          </button>
        </div>
      </nav>

      {isOpen && (
         <div className="md:hidden bg-slate-900">
         <ul className="flex flex-col items-center space-y-4 py-4 text-white">
           {navLinks.map((link) => (
             <li key={link.label} className="cursor-pointer">
               {(link.type === 'scroll') && 
                 <span onClick={() => handleScrollTo(link.to!)}>{link.label}</span>
               }
               {link.type === 'hybrid_dropdown' && (
                 <div className={`${location.pathname.startsWith('/study') ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>
                   <span onClick={() => handleScrollTo(link.scrollTo!)} className="font-semibold">{link.label}</span>
                   {link.items && link.items.length > 0 && (
                     <ul className="flex flex-col items-center mt-2 space-y-2">
                     {link.items?.map(item => (
                       <li key={item.to}>
                         <Link to={item.to!} onClick={() => setIsOpen(false)}>{item.label}</Link>
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