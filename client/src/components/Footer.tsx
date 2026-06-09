import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { animateScroll as scroll } from 'react-scroll';
import { useLocation } from 'react-router-dom';
import Logo from './Logo';
import { FaXTwitter } from 'react-icons/fa6';

const Footer = () => {
  const location = useLocation();
  const isPortfolioRoute = location.pathname === '/';

  const scrollToTop = () => {
    scroll.scrollToTop({
      duration: 800,
      smooth: 'easeInOutQuart',
    });
  };

  const footerClasses = isPortfolioRoute
    ? 'bg-slate-50 border-t border-slate-200/80 text-slate-900 dark:bg-slate-900 dark:border-slate-700/60 dark:text-slate-100'
    : 'bg-background border-t border-foreground/10';
  const mutedTextClasses = isPortfolioRoute
    ? 'text-slate-600 dark:text-slate-300'
    : 'text-foreground/70';
  const socialLinkClasses = isPortfolioRoute
    ? 'text-slate-600 hover:text-[hsl(var(--accent))] dark:text-slate-300 dark:hover:text-cyan-300 transition-all duration-300 transform hover:scale-110'
    : 'text-foreground/70 hover:text-[hsl(var(--accent))] transition-all duration-300 transform hover:scale-110';

  return (
    <footer className={footerClasses}>
      <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <p className={`${mutedTextClasses} text-sm mb-4 md:mb-0`}>
          &copy; 2025 Rohit Kumar. All Rights Reserved.
        </p>

        <button
          type="button"
          className="mb-4 md:mb-0 cursor-pointer order-first md:order-none"
          onClick={scrollToTop}
          title="Back to Top"
          aria-label="Back to top"
        >
          <Logo />
        </button>

        <div className="flex space-x-6">
          <a href="https://github.com/Rohitkumar9569" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer" className={socialLinkClasses}>
            <FaGithub size={24} />
          </a>
          <a href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer" className={socialLinkClasses}>
            <FaLinkedin size={24} />
          </a>
          <a href="https://x.com/RohitKumar7348" aria-label="Twitter Profile" target="_blank" rel="noopener noreferrer" className={socialLinkClasses}>
            <FaXTwitter size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
