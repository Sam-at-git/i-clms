import React from 'react';
import { useBreakpoints } from '../../lib/hooks/useBreakpoints';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
}

export function ResponsiveContainer({
  children,
  breakpoint = 'md',
  mobile,
  tablet,
  desktop,
}: ResponsiveContainerProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();

  if (isMobile && mobile) {
    return <>{mobile}</>;
  }

  if (isTablet && tablet) {
    return <>{tablet}</>;
  }

  if (isDesktop && desktop) {
    return <>{desktop}</>;
  }

  return <>{children}</>;
}

interface GridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
  padding?: number | string;
}

export function Grid({ children, cols = {}, gap = 16, padding = 0 }: GridProps) {
  const { currentBreakpoint, isMobile } = useBreakpoints();

  // Determine column count based on breakpoint
  const getCols = () => {
    if (isMobile && cols.xs) return cols.xs;
    if (currentBreakpoint === 'sm' && cols.sm) return cols.sm;
    if (currentBreakpoint === 'md' && cols.md) return cols.md;
    if (currentBreakpoint === 'lg' && cols.lg) return cols.lg;
    if (currentBreakpoint === 'xl' && cols.xl) return cols.xl;
    if (currentBreakpoint === '2xl' && cols.xl) return cols.xl;
    return cols.md || 3; // default
  };

  const columnCount = getCols();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        padding: typeof padding === 'number' ? `${padding}px` : padding,
      }}
    >
      {children}
    </div>
  );
}

interface HideProps {
  children: React.ReactNode;
  below?: 'sm' | 'md' | 'lg' | 'xl';
  above?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Hide({ children, below, above }: HideProps) {
  const { currentBreakpoint, isMobile, isTablet, isDesktop } = useBreakpoints();

  const shouldHide = () => {
    const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

    if (below) {
      const belowIndex = breakpointOrder.indexOf(below);
      return currentIndex < belowIndex;
    }

    if (above) {
      const aboveIndex = breakpointOrder.indexOf(above);
      return currentIndex > aboveIndex;
    }

    return false;
  };

  if (shouldHide()) {
    return null;
  }

  return <>{children}</>;
}

interface ShowProps {
  children: React.ReactNode;
  above?: 'sm' | 'md' | 'lg' | 'xl';
  below?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Show({ children, above, below }: ShowProps) {
  const { currentBreakpoint } = useBreakpoints();

  const shouldShow = () => {
    const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

    if (above) {
      const aboveIndex = breakpointOrder.indexOf(above);
      return currentIndex > aboveIndex;
    }

    if (below) {
      const belowIndex = breakpointOrder.indexOf(below);
      return currentIndex < belowIndex;
    }

    return true;
  };

  if (!shouldShow()) {
    return null;
  }

  return <>{children}</>;
}

interface ResponsiveTextProps {
  children: React.ReactNode;
  xs?: string | number;
  sm?: string | number;
  md?: string | number;
  lg?: string | number;
  xl?: string | number;
}

export function ResponsiveText({ children, xs, sm, md, lg, xl }: ResponsiveTextProps) {
  const { currentBreakpoint, isMobile, isTablet, isDesktop } = useBreakpoints();

  const getFontSize = () => {
    if (isMobile && xs) return xs;
    if (currentBreakpoint === 'sm' && sm) return sm;
    if (currentBreakpoint === 'md' && md) return md;
    if (currentBreakpoint === 'lg' && lg) return lg;
    if (currentBreakpoint === 'xl' && xl) return xl;
    return md || 16; // default
  };

  return (
    <span
      style={{
        fontSize: typeof getFontSize() === 'number' ? `${getFontSize()}px` : getFontSize(),
      }}
    >
      {children}
    </span>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileMenu({ isOpen, onClose, children }: MobileMenuProps) {
  const { isMobile } = useBreakpoints();

  if (!isMobile) {
    return <>{children}</>;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '80%',
          maxWidth: '300px',
          backgroundColor: '#fff',
          zIndex: 9999,
          overflowY: 'auto' as const,
          padding: '20px',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute' as const,
            top: '16px',
            right: '16px',
            fontSize: '24px',
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="关闭菜单"
        >
          ✕
        </button>
        {children}
      </div>
    </>
  );
}
