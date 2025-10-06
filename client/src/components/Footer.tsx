import React from 'react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { animateScroll as scroll } from 'react-scroll';
import Logo from './Logo';

const Footer = () => {
  // This function will smoothly scroll the page to the top
  const scrollToTop = () => {
    scroll.scrollToTop({
      duration: 800,
      smooth: 'easeInOutQuart',
    });
  };

  return (
    // --- FIX: Changed bg-primary to bg-background for consistency ---
    <footer className="bg-background border-t border-foreground/10">
      <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        
        <p className="text-foreground/70 text-sm mb-4 md:mb-0">
          © 2025 Rohit Kumar. All Rights Reserved.
        </p>

        <div 
          className="mb-4 md:mb-0 cursor-pointer order-first md:order-none"
          onClick={scrollToTop}
          title="Back to Top"
        >
          <Logo />
        </div>

        <div className="flex space-x-6">
          <a href="https://github.com/Rohitkumar9569" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-[hsl(var(--accent))] transition-all duration-300 transform hover:scale-110">
            <FaGithub size={24} />
          </a>
          <a href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-[hsl(var(--accent))] transition-all duration-300 transform hover:scale-110">
            <FaLinkedin size={24} />
          </a>
          <a href="https://x.com/home" aria-label="Twitter Profile" target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-[hsl(var(--accent))] transition-all duration-300 transform hover:scale-110">
            <FaTwitter size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;