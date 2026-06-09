import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useSectionNavigation } from '../hooks/useSectionNavigation'; // Import the new hook
import { useAuth } from '../context/AuthContext';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, setOpen }) => {
  const navigateToSection = useSectionNavigation(); // Use the hook for smart navigation
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const itemClass = 'premium-command-item cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-bold transition aria-selected:-translate-y-0.5';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  useEffect(() => {
    const openPalette = () => setOpen(true);
    window.addEventListener('open-command-palette', openPalette);
    return () => window.removeEventListener('open-command-palette', openPalette);
  }, [setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const downloadResume = () => {
    const link = document.createElement('a');
    link.href = '/Rohit-Kumar-Resume.pdf';
    link.download = 'Rohit-Kumar-Resume.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
      className="premium-command-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-[1.65rem]"
    >
      <Command.Input 
        placeholder="Type a command or search..."
        className="premium-command-input w-full border-b bg-transparent p-4 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
      />
      <Command.List className="premium-command-list max-h-[320px] overflow-y-auto p-2">
        <Command.Empty className="rounded-2xl px-3 py-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">No results found.</Command.Empty>

        <Command.Group heading="Study Hub" className="premium-command-group px-2 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          <Command.Item onSelect={() => runCommand(() => navigate('/app'))} className={itemClass}>Open Study Home</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigate('/app/catalog'))} className={itemClass}>Open Catalog</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigate('/app/ask'))} className={itemClass}>Ask Study Hub</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigate('/app/library'))} className={itemClass}>Open Library</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigate('/app/contribute'))} className={itemClass}>Request Content</Command.Item>
          {isAdmin && (
            <Command.Item onSelect={() => runCommand(() => navigate('/admin'))} className={itemClass}>Open Admin Studio</Command.Item>
          )}
        </Command.Group>

        <Command.Group heading="Creator Desk" className="premium-command-group px-2 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          <Command.Item onSelect={() => runCommand(() => navigateToSection('about'))} className={itemClass}>Go to About</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('skills'))} className={itemClass}>Go to Skills</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('projects'))} className={itemClass}>Go to Projects</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('study-hub'))} className={itemClass}>Go to Study Hub section</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('contact'))} className={itemClass}>Go to Contact</Command.Item>
        </Command.Group>

        <Command.Group heading="Actions" className="premium-command-group px-2 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          <Command.Item onSelect={() => runCommand(downloadResume)} className={itemClass}>Download Resume</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export default CommandPalette;
