import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'slide-fade';
  duration?: number;
}

export function PageTransition({
  children,
  type = 'fade',
  duration = 300,
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mountChildren, setMountChildren] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleAnimationEnd = () => {
    if (!isVisible) {
      setMountChildren(false);
    }
  };

  const getAnimationStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transition: `all ${duration}ms ease`,
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    };

    switch (type) {
      case 'fade':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
        };
      case 'slide':
        return {
          ...baseStyle,
          transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
          opacity: isVisible ? 1 : 0,
        };
      case 'scale':
        return {
          ...baseStyle,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          opacity: isVisible ? 1 : 0,
        };
      case 'slide-fade':
        return {
          ...baseStyle,
          transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
          opacity: isVisible ? 1 : 0,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      style={getAnimationStyle()}
      onAnimationEnd={handleAnimationEnd}
    >
      {mountChildren ? children : null}
    </div>
  );
}

interface RouteTransitionProps {
  children: React.ReactNode;
  pathname?: string;
}

export function RouteTransition({ children, pathname }: RouteTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <PageTransition type="slide-fade" duration={300}>
      {children}
    </PageTransition>
  );
}
