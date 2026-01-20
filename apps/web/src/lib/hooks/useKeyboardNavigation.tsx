import React, { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  enableEscape?: boolean;
  enableArrowKeys?: boolean;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  trapFocus?: boolean;
  scope?: HTMLElement | null;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enableEscape = true,
    enableArrowKeys = false,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    trapFocus = false,
    scope,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check if event is within scope
      if (scope && e.target instanceof Node && !scope.contains(e.target as Node)) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (enableEscape) {
            e.preventDefault();
            onEscape?.();
          }
          break;
        case 'ArrowUp':
          if (enableArrowKeys) {
            e.preventDefault();
            onArrowUp?.();
          }
          break;
        case 'ArrowDown':
          if (enableArrowKeys) {
            e.preventDefault();
            onArrowDown?.();
          }
          break;
        case 'ArrowLeft':
          if (enableArrowKeys) {
            e.preventDefault();
            onArrowLeft?.();
          }
          break;
        case 'ArrowRight':
          if (enableArrowKeys) {
            e.preventDefault();
            onArrowRight?.();
          }
          break;
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
      }
    },
    [
      enableEscape,
      enableArrowKeys,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onEnter,
      scope,
    ]
  );

  useEffect(() => {
    if (trapFocus && scope) {
      // Get all focusable elements
      const focusableElements = scope.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      scope.addEventListener('keydown', handleTabKey);

      // Focus first element when mounted
      firstElement?.focus();

      return () => {
        scope.removeEventListener('keydown', handleTabKey);
      };
    }
    return undefined;
  }, [trapFocus, scope]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    // Return any utility functions if needed
  };
}

interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, enabled = true, onEscape }: FocusTrapProps) {
  const scopeRef = React.useRef<HTMLDivElement>(null);

  useKeyboardNavigation({
    trapFocus: enabled,
    scope: scopeRef.current,
    onEscape,
  });

  return <div ref={scopeRef}>{children}</div>;
}
