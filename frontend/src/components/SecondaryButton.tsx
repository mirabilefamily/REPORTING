import { useState } from 'react';

const SLATE_700 = '#334155';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export default function SecondaryButton({ icon, children, style, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...rest }: Props) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      {...rest}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setPressed(false); onMouseLeave?.(e); }}
      onMouseDown={(e) => { setPressed(true); onMouseDown?.(e); }}
      onMouseUp={(e) => { setPressed(false); onMouseUp?.(e); }}
      style={{
        height: 36, padding: '0 14px', borderRadius: 8,
        border: `1px solid ${hover ? '#CFCFD6' : '#DADAE0'}`,
        background: pressed ? SLATE_100 : (hover ? SLATE_50 : '#FFFFFF'),
        color: SLATE_700, fontSize: 13, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background-color 120ms, border-color 120ms',
        ...(style || {}),
      }}
    >
      {icon}
      {children}
    </button>
  );
}
