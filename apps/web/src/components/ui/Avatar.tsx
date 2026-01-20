import { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'small' | 'medium' | 'large';
  children?: ReactNode;
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'medium',
  children,
}: AvatarProps) {
  const getSize = (): number => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const getInitials = (): string => {
    if (fallback) return fallback.substring(0, 2).toUpperCase();
    if (alt) return alt.substring(0, 2).toUpperCase();
    return '?';
  };

  return (
    <div
      style={{
        ...styles.avatar,
        width: `${getSize()}px`,
        height: `${getSize()}px`,
        fontSize: `${getSize() / 2.5}px`,
      }}
    >
      {src ? (
        <img src={src} alt={alt} style={styles.image} />
      ) : children ? (
        <div style={styles.children}>{children}</div>
      ) : (
        <span style={styles.initials}>{getInitials()}</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  avatar: {
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontWeight: 500,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  children: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    textTransform: 'uppercase' as const,
  },
};

export default Avatar;
