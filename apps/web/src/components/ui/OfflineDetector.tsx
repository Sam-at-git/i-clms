import React, { useState, useEffect } from 'react';

interface OfflineDetectorProps {
  children?: React.ReactNode;
}

export function OfflineDetector({ children }: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        style={{
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          backgroundColor: isOnline ? '#10b981' : '#ef4444',
          color: '#fff',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 10000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.3s ease',
        }}
      >
        <span style={{ marginRight: '8px' }}>{isOnline ? '✓' : '⚠️'}</span>
        {isOnline ? '网络已连接' : '网络连接已断开，请检查您的网络设置'}
      </div>
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

interface UseOnlineResult {
  isOnline: boolean;
}

export function useOnline(): UseOnlineResult {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
