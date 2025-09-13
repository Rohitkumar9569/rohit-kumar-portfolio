// src/components/Footer.tsx

import React from 'react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { animateScroll as scroll } from 'react-scroll';
import Logo from './Logo'; // Import your Logo component

const Footer = () => {

  // This function will smoothly scroll the page to the top
  const scrollToTop = () => {
    scroll.scrollToTop({
      duration: 800,
      smooth: 'easeInOutQuart',
    });
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        
        {/* Copyright notice with your name */}
        <p className="text-slate-400 text-sm mb-4 md:mb-0">
          © 2025 Rohit Kumar. All Rights Reserved.
        </p>

        {/* Logo and Back to Top Button */}
        <div 
          className="mb-4 md:mb-0 cursor-pointer"
          onClick={scrollToTop}
          title="Back to Top"
        >
          <Logo />
        </div>

        {/* Social Media Links with enhanced hover effect */}
        <div className="flex space-x-6">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110">
            <FaGithub size={24} />
          </a>
          <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110">
            <FaLinkedin size={24} />
          </a>
          <a href="https://x.com/home" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110">
            <FaTwitter size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;