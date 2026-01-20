import { ReactNode } from 'react';

interface CommentProps {
  author: string;
  avatar?: string;
  content: string;
  timestamp?: string;
  actions?: ReactNode;
}

export function Comment({ author, avatar, content, timestamp, actions }: CommentProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.authorInfo}>
          <div style={styles.avatar}>{avatar || author.charAt(0)}</div>
          <div>
            <div style={styles.author}>{author}</div>
            {timestamp && <div style={styles.timestamp}>{timestamp}</div>}
          </div>
        </div>
      </div>
      <div style={styles.content}>{content}</div>
      {actions && <div style={styles.actions}>{actions}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
  },
  header: {
    marginBottom: '8px',
  },
  authorInfo: {
    display: 'flex',
    gap: '12px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  author: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  content: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    marginLeft: '44px',
  },
  actions: {
    marginTop: '12px',
    marginLeft: '44px',
    display: 'flex',
    gap: '16px',
  },
};

export default Comment;
