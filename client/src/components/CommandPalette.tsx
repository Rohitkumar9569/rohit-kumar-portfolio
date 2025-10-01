import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useSectionNavigation } from '../hooks/useSectionNavigation'; // Import the new hook

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, setOpen }) => {
  const navigateToSection = useSectionNavigation(); // Use the hook for smart navigation

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

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
      className="z-50 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <Command.Input 
        placeholder="Type a command or search..."
        className="w-full p-4 bg-transparent focus:outline-none text-white border-b border-slate-700"
      />
      <Command.List className="p-2 max-h-[300px] overflow-y-auto">
        <Command.Empty className="p-2 text-sm text-slate-400">No results found.</Command.Empty>

        <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-slate-400">
          <Command.Item onSelect={() => runCommand(() => navigateToSection('about'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Go to About</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('skills'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Go to Skills</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('projects'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Go to Projects</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('study-hub'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Go to Study Hub</Command.Item>
          <Command.Item onSelect={() => runCommand(() => navigateToSection('contact'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Go to Contact</Command.Item>
        </Command.Group>

        <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-slate-400">
          <Command.Item onSelect={() => runCommand(() => alert('Downloading resume...'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer text-slate-200">Download Resume</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export default CommandPalette;