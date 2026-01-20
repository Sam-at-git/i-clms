import React from 'react';

interface RememberMeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function RememberMeCheckbox({ checked, onChange }: RememberMeCheckboxProps) {
  return (
    <label style={styles.container}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={styles.checkbox}
      />
      <span style={styles.label}>记住登录状态</span>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#1e3a5f',
  },
  label: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default RememberMeCheckbox;
