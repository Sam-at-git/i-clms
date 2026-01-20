interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const getSkeletonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      backgroundColor: '#e5e7eb',
      animation: 'pulse 1.5s ease-in-out infinite',
    };

    if (variant === 'circular') {
      return {
        ...base,
        width: width || '40px',
        height: height || '40px',
        borderRadius: '50%',
      };
    }

    if (variant === 'rectangular') {
      return {
        ...base,
        width: width || '100%',
        height: height || '80px',
        borderRadius: '4px',
      };
    }

    // text (default)
    return {
      ...base,
      width: width || '100%',
      height: height || '16px',
      borderRadius: '4px',
    };
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={getSkeletonStyle()} />
      ))}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </>
  );
}

export default Skeleton;
