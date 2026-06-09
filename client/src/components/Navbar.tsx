import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink, scroller } from 'react-scroll';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, Squares2X2Icon } from '@heroicons/react/24/solid';
import Logo from './Logo';
import API from '../api';
import ThemeToggleButton from './ThemeToggleButton';

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
  const [isStudyHubMobileOpen, setStudyHubMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await API.get('/api/exams');
        setStudyHubExams(response.data);
      } catch (error) {
        console.error('Failed to fetch exams for navbar:', error);
      }
    };

    fetchExams();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      setIsVisible(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionToScroll = params.get('scrollTo');
    if (sectionToScroll) {
      scroller.scrollTo(sectionToScroll, { duration: 420, delay: 60, smooth: 'easeOutQuad', offset: -70 });
    }
  }, [location.search]);

  const handleScrollTo = (section: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${section}`);
    } else {
      scroller.scrollTo(section, { duration: 420, delay: 0, smooth: 'easeOutQuad', offset: -70 });
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

  const studyHubDropdownItems = studyHubExams.map((exam) => ({
    to: `/study/${exam.slug}`,
    label: exam.shortName,
  }));
  const fallbackStudyHubDropdownItems = [
    { to: '/study/gate', label: 'GATE' },
    { to: '/study/upsc', label: 'UPSC' },
    { to: '/study/ssc', label: 'SSC' },
    { to: '/study/railway', label: 'Railway' },
  ];
  const visibleStudyHubDropdownItems = studyHubDropdownItems.length > 0
    ? studyHubDropdownItems
    : fallbackStudyHubDropdownItems;

  const isAppRoute = location.pathname.startsWith('/app');
  const isPortfolioRoute = location.pathname === '/';
  const navLinkClasses =
    'relative cursor-pointer font-semibold transition-colors duration-300 hover:text-[hsl(var(--accent))] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-[hsl(var(--accent))] after:transition-transform after:duration-300 hover:after:scale-x-100';
  const appLinkToneClasses = isAppRoute
    ? 'border-cyan-400/60 bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
    : 'border-cyan-400/35 bg-cyan-500/10 text-cyan-700 shadow-lg shadow-cyan-500/10 hover:-translate-y-0.5 hover:border-cyan-400/70 hover:bg-cyan-500 hover:text-white hover:shadow-cyan-500/25 dark:text-cyan-200';
  const appLinkBaseClasses = `group/app inline-flex items-center gap-2 rounded-full border font-black transition-all duration-300 ${
    isAppRoute
      ? 'hover:shadow-cyan-500/40'
      : 'dark:hover:text-white'
  }`;
  const desktopAppLinkClasses = `${appLinkBaseClasses} ${appLinkToneClasses} h-10 px-4 text-sm`;
  const mobileMenuAppLinkClasses = `${appLinkBaseClasses} ${appLinkToneClasses} h-11 px-4 text-sm`;

  const hasSolidNavSurface = isScrolled || isOpen;
  const headerClasses = hasSolidNavSurface
    ? isPortfolioRoute
      ? 'bg-slate-50/90 backdrop-blur-2xl backdrop-saturate-150 border-b border-slate-200/70 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.55)] dark:bg-slate-900/90 dark:border-slate-700/50 dark:shadow-black/25'
      : 'bg-background/90 backdrop-blur-2xl backdrop-saturate-150 border-b border-foreground/10 shadow-lg shadow-slate-950/5 dark:shadow-black/20'
    : isPortfolioRoute
      ? 'bg-slate-50/35 backdrop-blur-md backdrop-saturate-125 dark:bg-slate-900/35'
      : 'bg-background/25 backdrop-blur-md';
  const dropdownSurfaceClasses = isPortfolioRoute
    ? 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 text-slate-900 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-black/35'
    : 'overflow-hidden rounded-2xl border border-foreground/10 bg-card/95 p-2 text-card-foreground shadow-2xl shadow-foreground/25 backdrop-blur-xl';
  const mobileMenuSurfaceClasses = isPortfolioRoute
    ? 'border-t border-slate-200/75 bg-slate-50/95 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-slate-700/60 dark:bg-slate-900/95 dark:shadow-black/30'
    : 'bg-background border-t border-foreground/10';
  const mobileActionCardClasses = isPortfolioRoute
    ? 'mx-6 mt-4 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-xl shadow-cyan-500/10 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-800/90'
    : 'mx-6 mt-4 rounded-2xl border border-foreground/10 bg-card/90 p-3 shadow-xl shadow-cyan-500/10 backdrop-blur-xl';
  const mobileModePillClasses = isPortfolioRoute
    ? 'flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 dark:border-slate-700/60 dark:bg-slate-900/70'
    : 'flex items-center gap-2 rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5';
  const hamburgerButtonClasses = isPortfolioRoute
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/75 bg-white/80 text-slate-900 shadow-lg shadow-cyan-500/10 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:text-[hsl(var(--accent))] hover:shadow-cyan-500/20 dark:border-slate-700/55 dark:bg-slate-800/80 dark:text-slate-100'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-card/75 text-foreground shadow-lg shadow-cyan-500/10 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:text-[hsl(var(--accent))] hover:shadow-cyan-500/20';
  const mobileNavListClasses = isPortfolioRoute
    ? 'flex flex-col items-center py-4 text-lg text-slate-900 dark:text-slate-100'
    : 'flex flex-col items-center py-4 text-foreground text-lg';
  const mobileStudyListClasses = isPortfolioRoute
    ? 'flex flex-col items-center mt-2 space-y-2 bg-white/70 w-full py-3 dark:bg-slate-800/70'
    : 'flex flex-col items-center mt-2 space-y-2 bg-primary w-full py-3';
  const navVisibilityClass = 'translate-y-0';

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${headerClasses} ${navVisibilityClass}`}>
      <nav className="container mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 lg:grid-cols-[10rem_minmax(0,1fr)_10rem]">
        <button type="button" className="cursor-pointer justify-self-start" onClick={handleLogoClick} aria-label="Go to homepage">
          <Logo />
        </button>

        <div className="hidden min-w-0 justify-center lg:flex">
          <ul className="flex items-center gap-4 text-sm text-foreground lg:gap-7 lg:text-base xl:gap-9">
            {navLinks.map((link) => (
              <li key={link.label} className="relative group">
                {link.type === 'scroll' && (
                  <ScrollLink
                    to={link.to!}
                    href={`#${link.to!}`}
                    spy={true}
                    smooth="easeInOutQuart"
                    offset={-70}
                    duration={800}
                    className={navLinkClasses}
                    activeClass={location.pathname === '/' ? 'active-link' : ''}
                    onClick={() => handleScrollTo(link.to!)}
                  >
                    {link.label}
                  </ScrollLink>
                )}
                {link.type === 'hybrid_dropdown' && (
                  <>
                    <div className={`${navLinkClasses} flex items-center ${location.pathname.startsWith('/study') ? 'active-link' : ''}`}>
                      <ScrollLink
                        to={link.scrollTo!}
                        spy={true}
                        smooth="easeInOutQuart"
                        offset={-70}
                        duration={800}
                        activeClass={location.pathname === '/' ? 'active-link' : ''}
                        onClick={() => handleScrollTo(link.scrollTo!)}
                      >
                        {link.label}
                      </ScrollLink>
                      <ChevronDownIcon className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:rotate-180" />
                    </div>
                    <div className="absolute left-1/2 top-full hidden min-w-[230px] -translate-x-1/2 pt-4 group-hover:block group-focus-within:block">
                      <div className={dropdownSurfaceClasses}>
                        <div className="px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Study Hub</p>
                          <p className="mt-1 text-xs font-semibold text-foreground/55">Exam shortcuts</p>
                        </div>
                        <ul className="space-y-1">
                          {visibleStudyHubDropdownItems.map((item) => (
                            <li key={item.to}>
                              <Link
                                to={item.to}
                                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition hover:bg-foreground/5 hover:text-[hsl(var(--accent))] ${location.pathname === item.to ? 'bg-cyan-500/10 text-[hsl(var(--accent))]' : ''}`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 border-t border-foreground/10 pt-2">
                          <Link
                            to="/app"
                            className="flex items-center justify-center rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                          >
                            Open App
                          </Link>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center justify-end gap-4 lg:flex">
          <Link to="/app" className={desktopAppLinkClasses} aria-current={isAppRoute ? 'page' : undefined}>
            <Squares2X2Icon className="h-4 w-4 transition-transform duration-300 group-hover/app:rotate-6" />
            <span>App</span>
          </Link>
          <ThemeToggleButton />
        </div>

        <div className="col-start-3 flex items-center justify-end lg:hidden">
          <button
            aria-label="Toggle navigation menu"
            onClick={toggleMobileMenu}
            className={hamburgerButtonClasses}
          >
            {isOpen
              ? <XMarkIcon className="h-5 w-5" />
              : <Bars3Icon className="h-5 w-5" />
            }
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className={`${mobileMenuSurfaceClasses} lg:hidden`}>
          <div className={mobileActionCardClasses}>
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/app"
                onClick={() => setIsOpen(false)}
                className={mobileMenuAppLinkClasses}
                aria-current={isAppRoute ? 'page' : undefined}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span>App</span>
              </Link>
              <div className={mobileModePillClasses}>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/55">Mode</span>
                <ThemeToggleButton />
              </div>
            </div>
          </div>
          <ul className={mobileNavListClasses}>
            {navLinks.map((link) => (
              <li key={link.label} className="cursor-pointer w-full text-center py-2 transition-colors duration-200 hover:bg-foreground/5">
                {link.type === 'scroll' && <span onClick={() => handleScrollTo(link.to!)}>{link.label}</span>}
                {link.type === 'hybrid_dropdown' && (
                  <div>
                    <div onClick={() => setStudyHubMobileOpen(!isStudyHubMobileOpen)} className={`font-semibold flex items-center justify-center ${location.pathname.startsWith('/study') ? 'text-[hsl(var(--accent))]' : ''}`}>
                      <span>{link.label}</span>
                      <ChevronRightIcon className={`h-4 w-4 ml-2 transition-transform ${isStudyHubMobileOpen ? 'rotate-90' : ''}`} />
                    </div>
                    {isStudyHubMobileOpen && (
                      <ul className={mobileStudyListClasses}>
                        {visibleStudyHubDropdownItems.map((exam) => (
                          <li key={exam.to} className="w-full text-center py-1 transition-colors duration-200 hover:bg-foreground/5">
                            <Link
                              to={exam.to}
                              onClick={() => setIsOpen(false)}
                              className={location.pathname === exam.to ? 'text-[hsl(var(--accent))] font-semibold' : ''}
                            >
                              {exam.label}
                            </Link>
                          </li>
                        ))}
                        <li className="w-full px-6 pt-2">
                          <Link
                            to="/app"
                            onClick={() => setIsOpen(false)}
                            className="mx-auto flex max-w-xs items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-700"
                          >
                            Open Study App
                          </Link>
                        </li>
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
