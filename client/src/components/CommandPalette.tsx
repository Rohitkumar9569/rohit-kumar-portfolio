// src/components/CommandPalette.tsx

import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { scroller } from 'react-scroll';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, setOpen }) => {
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

  const scrollTo = (section: string) => {
    scroller.scrollTo(section, {
      duration: 800,
      delay: 0,
      smooth: 'easeInOutQuart',
    });
  };

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Menu" 
      // These classes style the dialog itself
      className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <Command.Input 
        placeholder="Type a command or search..."
        // These classes style the input field
        className="w-full p-4 bg-transparent focus:outline-none text-white border-b border-slate-700"
      />
      <Command.List 
        // These classes style the list container
        className="p-2 max-h-[300px] overflow-y-auto"
      >
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Navigation" 
          // These classes style the group heading
          className="px-2 py-1.5 text-xs font-medium text-slate-400"
        >
          <Command.Item onSelect={() => runCommand(() => scrollTo('hero'))}
            // These classes style each command item
            className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer"
          >Go to Home</Command.Item>
          <Command.Item onSelect={() => runCommand(() => scrollTo('about'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer">Go to About</Command.Item>
          <Command.Item onSelect={() => runCommand(() => scrollTo('skills'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer">Go to Skills</Command.Item>
          <Command.Item onSelect={() => runCommand(() => scrollTo('projects'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer">Go to Projects</Command.Item>
          <Command.Item onSelect={() => runCommand(() => scrollTo('contact'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer">Go to Contact</Command.Item>
        </Command.Group>

        <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-slate-400">
          <Command.Item onSelect={() => runCommand(() => alert('Downloading resume...'))} className="p-2 text-sm rounded-md aria-selected:bg-slate-700 cursor-pointer">Download Resume</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export default CommandPalette;