import React, { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  theme: Theme;
  reducedMotion: boolean;
  screenReader: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  theme: 'light',
  reducedMotion: false,
  screenReader: false,
};

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-settings', JSON.stringify(updated));
    }

    // Apply to document
    applySettings(updated);
  };

  const applySettings = (prefs: AccessibilitySettings) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px',
    };
    root.style.fontSize = fontSizes[prefs.fontSize];

    // Theme
    root.setAttribute('data-theme', prefs.theme);

    // Reduced motion
    if (prefs.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
    }

    // Screen reader
    if (prefs.screenReader) {
      root.setAttribute('aria-live', 'polite');
    } else {
      root.removeAttribute('aria-live');
    }
  };

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      updateSettings({ reducedMotion: e.matches });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply settings on mount and when changed
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  return {
    settings,
    updateSettings,
    setFontSize: (fontSize: AccessibilitySettings['fontSize']) =>
      updateSettings({ fontSize }),
    setTheme: (theme: Theme) => updateSettings({ theme }),
    toggleReducedMotion: () => updateSettings({ reducedMotion: !settings.reducedMotion }),
    toggleScreenReader: () => updateSettings({ screenReader: !settings.screenReader }),
  };
}

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      style={{
        position: 'absolute' as const,
        top: '-40px',
        left: 0,
        padding: '8px 16px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 600,
        zIndex: 9999,
        transition: 'top 0.3s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-40px';
      }}
    >
      {children}
    </a>
  );
}

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: 'span' | 'div';
}

export function VisuallyHidden({ children, as = 'span' }: VisuallyHiddenProps) {
  const Tag = as;
  return (
    <Tag
      style={{
        position: 'absolute' as const,
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap' as const,
        border: 0,
      }}
    >
      {children}
    </Tag>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  role?: 'status' | 'alert';
  politeness?: 'polite' | 'assertive';
}

export function LiveRegion({
  children,
  role = 'status',
  politeness = 'polite',
}: LiveRegionProps) {
  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: 'absolute' as const,
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
