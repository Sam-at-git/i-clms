import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export interface PasswordStrength {
  level: number; // 0-4
  label: string;
  color: string;
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { level: 0, label: '', color: '#e5e7eb' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasLowercase && hasUppercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  // Map score to level (0-4)
  const level = Math.min(Math.floor(score / 1.5), 4);

  const levels: Record<number, { label: string; color: string }> = {
    0: { label: '非常弱', color: '#ef4444' },
    1: { label: '弱', color: '#f97316' },
    2: { label: '中等', color: '#eab308' },
    3: { label: '强', color: '#84cc16' },
    4: { label: '非常强', color: '#22c55e' },
  };

  return {
    level,
    ...levels[level],
  };
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);

  if (password.length === 0) {
    return null;
  }

  const segments = Array.from({ length: 4 }, (_, i) => i < strength.level);

  return (
    <div style={styles.container}>
      <div style={styles.barContainer}>
        {segments.map((filled, i) => (
          <div
            key={i}
            style={{
              ...styles.segment,
              backgroundColor: filled ? strength.color : '#e5e7eb',
            }}
          />
        ))}
      </div>
      <span style={{ ...styles.label, color: strength.color }}>{strength.label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  barContainer: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  segment: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    transition: 'background-color 0.3s',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    minWidth: '60px',
    textAlign: 'right',
  },
};

export default PasswordStrengthIndicator;
