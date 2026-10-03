import { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Convenience: text-only underline-active channel tabs. */
  channels?: readonly string[];
  activeChannel?: string;
  onChannelChange?: (c: string) => void;
  /** Slot for a date-range chip (reuses DateRangePicker component). */
  dateControl?: ReactNode;
  /** Escape hatch for pages with custom right-side controls (year tabs, export). */
  right?: ReactNode;
  testIdPrefix?: string;
  divider?: boolean;
};

/**
 * Shared editorial page header — Linear/Stripe-flavored text-first layout.
 * Typography: 10.5px eyebrow, 30px title, 13.5px subtitle, 10/6 vertical rhythm.
 * Right block: underline-active channel tabs + hairline date pill, no outer pill container.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  channels,
  activeChannel,
  onChannelChange,
  dateControl,
  right,
  testIdPrefix = 'page-header',
  divider = true,
}: PageHeaderProps) {
  const parts = eyebrow.split(/\s*·\s*/);
  const hasChannels = channels && channels.length > 0 && activeChannel !== undefined && onChannelChange;

  return (
    <>
      <div
        className="ph-root flex flex-wrap items-end justify-between"
        style={{ gap: 20 }}
        data-testid={`${testIdPrefix}-report-header`}
      >
        {/* LEFT — eyebrow / title / subtitle */}
        <div className="min-w-0 flex-1">
          <p
            className="uppercase"
            style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: '#9A9A9E', letterSpacing: '0.12em' }}
            data-testid={`${testIdPrefix}-eyebrow`}
          >
            {parts.map((p, i) => (
              <span key={i}>
                {i > 0 && <span style={{ opacity: 0.6, margin: '0 6px' }}>·</span>}
                {p}
              </span>
            ))}
          </p>
          <h1
            style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.015em', color: '#0A0A0B' }}
            data-testid={`${testIdPrefix}-title`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#6E6E73', maxWidth: '56ch' }}
              data-testid={`${testIdPrefix}-subtitle`}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* RIGHT — channel tabs + divider + date, or custom right */}
        {(hasChannels || dateControl || right) && (
          <div
            className="ph-right flex items-center shrink-0"
            style={{ gap: 0 }}
            data-testid={`${testIdPrefix}-right`}
          >
            {hasChannels && (
              <div className="ph-channels flex items-center" style={{ gap: 4 }} role="tablist">
                {channels!.map((c) => {
                  const active = c === activeChannel;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onChannelChange!(c)}
                      className="ph-tab"
                      data-active={active}
                      data-testid={`${testIdPrefix}-tab-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                    >
                      <span>{c}</span>
                      <span className="ph-tab-underline" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}

            {hasChannels && dateControl && <span className="ph-vdivider" aria-hidden="true" />}

            {dateControl}

            {right}
          </div>
        )}
      </div>

      {divider && <hr style={{ margin: '20px 0 28px', border: 'none', borderTop: '1px solid #EDEDEF' }} />}
    </>
  );
}
