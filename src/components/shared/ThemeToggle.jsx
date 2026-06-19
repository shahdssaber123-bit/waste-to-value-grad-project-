import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const themes = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const active = themes.find((item) => item.key === theme) || themes[1];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-xl border-border/70 bg-background/90">
          <ActiveIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
          <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" title={`Resolved: ${resolvedTheme || 'dark'}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {themes.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.key} onClick={() => setTheme(item.key)} className="justify-between">
              <span className="flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </span>
              {theme === item.key && <span className="text-[10px] text-primary">Active</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
