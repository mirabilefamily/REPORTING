import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PopoverPortal from './PopoverPortal';

type Props = {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
  minWidth?: number;
  disabled?: boolean;
  testId?: string;
  renderOption?: (opt: string) => React.ReactNode;
};

const CORAL = '#FF6F61';
const SLATE_50 = '#FAFAFA';
const SLATE_200 = '#E5E5E7';
const SLATE_400 = '#9A9A9E';
const SLATE_500 = '#6E6E73';
const SLATE_700 = '#334155';
const INK = '#0A0A0B';

/**
 * Styled select that opens into a PopoverPortal menu — never clipped by card overflow.
 * Visual spec: ds-input shape (10px radius, 1px #E5E5E7, coral focus ring), ChevronDown trailing.
 */
export default function DsSelect({ value, options, onChange, placeholder = 'Select…', width, minWidth = 160, disabled, testId, renderOption }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="inline-flex items-center justify-between"
        style={{
          width,
          minWidth,
          height: 38,
          padding: '0 12px',
          gap: 10,
          background: '#FFFFFF',
          border: `1px solid ${open ? CORAL : SLATE_200}`,
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 500,
          color: value ? INK : SLATE_400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: open ? '0 0 0 2px rgba(255,111,97,0.25)' : 'none',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
          fontFamily: 'inherit',
          opacity: disabled ? 0.6 : 1,
        }}
        onMouseEnter={(e) => { if (!open && !disabled) { e.currentTarget.style.background = SLATE_50; e.currentTarget.style.borderColor = '#D4D4D8'; } }}
        onMouseLeave={(e) => { if (!open && !disabled) { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = SLATE_200; } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={testId}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
        <ChevronDown size={14} strokeWidth={2} style={{ color: SLATE_400, flexShrink: 0, transition: 'transform 160ms ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={btnRef} placement="bottom-start" minWidth={typeof minWidth === 'number' ? Math.max(minWidth, 180) : 180} padding={6} testId={testId ? `${testId}-menu` : undefined}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className="w-full flex items-center justify-between"
            style={{ height: 34, padding: '0 10px', background: 'transparent', color: opt === value ? INK : SLATE_700, fontSize: 13, fontWeight: opt === value ? 600 : 500, borderRadius: 6, textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            role="option"
            aria-selected={opt === value}
            data-testid={testId ? `${testId}-opt-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{renderOption ? renderOption(opt) : opt}</span>
            {opt === value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL, flexShrink: 0 }} />}
          </button>
        ))}
      </PopoverPortal>
    </>
  );
}

export { SLATE_500 as DS_MUTED };
