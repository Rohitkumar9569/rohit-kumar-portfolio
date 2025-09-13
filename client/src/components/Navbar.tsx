import React, { useState, useEffect } from 'react';
import { Link as ScrollLink, scroller } from 'react-scroll';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import Logo from './Logo';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Existing logic for background change on scroll
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // New logic for hiding navbar based on scroll speed (on mobile)
      if (window.innerWidth < 768) {
        // Calculate scroll speed
        const scrollDifference = window.scrollY - lastScrollY;

        if (scrollDifference > 120) { // Hides on fast scroll down
          setIsVisible(false);
        } else if (scrollDifference < -10) { // Shows on scroll up
          setIsVisible(true);
        }
      } else {
        // On desktop, the navbar should always be visible
        setIsVisible(true);
      }

      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollTo = (section: string) => {
    setIsOpen(false);
    scroller.scrollTo(section, {
      duration: 800,
      delay: 0,
      smooth: 'easeInOutQuart',
      offset: -80,
    });
  };

  const navLinks = [
    { to: 'about', label: 'About' },
    { to: 'skills', label: 'Skills' },
    { to: 'certifications', label: 'Certifications' },
    { to: 'projects', label: 'Projects' },
    { to: 'contact', label: 'Contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-slate-900/80 backdrop-blur-sm border-b border-slate-800' : 'bg-transparent'
      } ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => scrollTo('about')}>
          <Logo />
        </div>

        <ul className="hidden md:flex items-center space-x-8 text-slate-300">
          {navLinks.map((link) => (
            <li key={link.to}>
              <ScrollLink
                to={link.to}
                spy={true}
                smooth={'easeInOutQuart'}
                offset={-70}
                duration={800}
                className="cursor-pointer font-semibold hover:text-cyan-400 transition-colors relative"
                activeClass="active-link"
              >
                {link.label}
              </ScrollLink>
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
              <li key={link.to} className="cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => scrollTo(link.to)}>
                {link.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;