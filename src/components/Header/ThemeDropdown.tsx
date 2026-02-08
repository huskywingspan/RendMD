import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sun, Moon, Sparkles } from 'lucide-react';
import { useEditorStore, useIsDark } from '@/stores/editorStore';
import type { ThemeName } from '@/types';
import { cn } from '@/utils/cn';

interface ThemeOption {
  value: ThemeName;
  label: string;
  icon: typeof Sun;
  description: string;
}

const themeOptions: ThemeOption[] = [
  { value: 'dark-basic', label: 'Dark', icon: Moon, description: 'Classic dark theme' },
  { value: 'light-basic', label: 'Light', icon: Sun, description: 'Classic light theme' },
  { value: 'dark-glass', label: 'Dark Glass', icon: Sparkles, description: 'Modern dark with glass effects' },
  { value: 'light-glass', label: 'Light Glass', icon: Sparkles, description: 'Modern light with glass effects' },
];

export function ThemeDropdown(): JSX.Element {
  const { theme, setTheme, toggleDarkLight } = useEditorStore();
  const isDark = useIsDark();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const QuickToggleIcon = isDark ? Sun : Moon;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleThemeSelect = (newTheme: ThemeName) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center gap-0.5" ref={dropdownRef}>
      {/* Quick toggle button */}
      <button
        onClick={toggleDarkLight}
        className="p-1.5 rounded-l hover:bg-[var(--theme-bg-tertiary)] transition-colors"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <QuickToggleIcon size={18} className="text-[var(--theme-text-secondary)]" />
      </button>

      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded-r hover:bg-[var(--theme-bg-tertiary)] transition-colors",
          isOpen && "bg-[var(--theme-bg-tertiary)]"
        )}
        aria-label="Theme options"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <ChevronDown 
          size={14} 
          className={cn(
            "text-[var(--theme-text-secondary)] transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 w-48 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-lg z-50 py-1 overflow-hidden"
          role="listbox"
          aria-label="Select theme"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleThemeSelect(option.value)}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors",
                  isSelected 
                    ? "bg-[var(--theme-accent-primary)]/10 text-[var(--theme-accent-primary)]" 
                    : "hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-primary)]"
                )}
                role="option"
                aria-selected={isSelected}
              >
                <Icon size={16} className={isSelected ? "text-[var(--theme-accent-primary)]" : "text-[var(--theme-text-secondary)]"} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-[var(--theme-text-muted)]">{option.description}</div>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
