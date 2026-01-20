import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = rect.top - 40;
          left = rect.left + rect.width / 2 - 50;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - 50;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 12;
          left = rect.left - 120;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 12;
          left = rect.right + 8;
          break;
      }

      setPosition({ top, left });
    }
    setIsVisible(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      style={styles.container}
    >
      {children}
      {isVisible && (
        <div
          style={{
            ...styles.tooltip,
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'inline-block',
    position: 'relative',
  },
  tooltip: {
    position: 'fixed',
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    whiteSpace: 'nowrap' as const,
    zIndex: 1000,
    pointerEvents: 'none' as const,
  },
};

export default Tooltip;
