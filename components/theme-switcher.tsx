'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return (
    <Button
      variant="outline"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className="gap-2"
    >
      {isLight ? <Moon size={16}/> : <Sun size={16}/>}
      Toggle {isLight ? 'dark' : 'light'} mode
    </Button>
  );
} 