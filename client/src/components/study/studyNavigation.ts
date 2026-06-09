import {
  BookOpenIcon as BookOpenOutlineIcon,
  Cog6ToothIcon as Cog6ToothOutlineIcon,
  CloudArrowUpIcon as CloudArrowUpOutlineIcon,
  HomeIcon as HomeOutlineIcon,
  SparklesIcon as SparklesOutlineIcon,
  Squares2X2Icon as Squares2X2OutlineIcon,
  UserCircleIcon as UserCircleOutlineIcon,
} from '@heroicons/react/24/outline';
import {
  BookOpenIcon as BookOpenSolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  CloudArrowUpIcon as CloudArrowUpSolidIcon,
  HomeIcon as HomeSolidIcon,
  SparklesIcon as SparklesSolidIcon,
  Squares2X2Icon as Squares2X2SolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
} from '@heroicons/react/24/solid';

export const studyNavItems = [
  { label: 'Home', to: '/app', icon: HomeOutlineIcon, activeIcon: HomeSolidIcon, end: true },
  { label: 'Catalog', to: '/app/catalog', icon: Squares2X2OutlineIcon, activeIcon: Squares2X2SolidIcon },
  { label: 'Ask', to: '/app/ask', icon: SparklesOutlineIcon, activeIcon: SparklesSolidIcon },
  { label: 'Library', to: '/app/library', icon: BookOpenOutlineIcon, activeIcon: BookOpenSolidIcon },
];

export const drawerItems = [
  { label: 'Profile', to: '/app/profile', icon: Cog6ToothOutlineIcon, activeIcon: Cog6ToothSolidIcon },
  { label: 'Request Content', to: '/app/contribute', icon: CloudArrowUpOutlineIcon, activeIcon: CloudArrowUpSolidIcon },
  { label: 'Creator Desk', to: '/app/portfolio', icon: UserCircleOutlineIcon, activeIcon: UserCircleSolidIcon },
];
