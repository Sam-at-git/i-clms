import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

export function Loading({
  size = 'medium',
  type = 'spinner',
  text,
  fullscreen = false,
  className = '',
}: LoadingProps) {
  const sizes = {
    small: { spinner: 16, dots: 8, pulse: 24 },
    medium: { spinner: 32, dots: 12, pulse: 40 },
    large: { spinner: 48, dots: 16, pulse: 56 },
  };

  const renderSpinner = () => (
    <div
      style={{
        width: `${sizes[size].spinner}px`,
        height: `${sizes[size].spinner}px`,
        border: `3px solid #e5e7eb`,
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );

  const renderDots = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: `${sizes[size].dots}px`,
            height: `${sizes[size].dots}px`,
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      style={{
        width: `${sizes[size].pulse}px`,
        height: `${sizes[size].pulse}px`,
        backgroundColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );

  const renderSkeleton = () => (
    <div
      style={{
        width: '100%',
        height: size === 'small' ? '20px' : size === 'medium' ? '40px' : '60px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        animation: 'skeleton 1.5s ease-in-out infinite',
      }}
    />
  );

  const content = (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: text ? '12px' : 0,
        ...(fullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }),
      }}
    >
      {type === 'spinner' && renderSpinner()}
      {type === 'dots' && renderDots()}
      {type === 'pulse' && renderPulse()}
      {type === 'skeleton' && renderSkeleton()}
      {text && (
        <p
          style={{
            margin: 0,
            fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
            color: '#6b7280',
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  return (
    <>
      {content}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        @keyframes skeleton {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
