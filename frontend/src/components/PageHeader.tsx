import { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  /** Reserved for future opt-in use. Not rendered. */
  subtitle?: ReactNode;
  /** Channel tabs (dark pill toggle). */
  channels?: readonly string[];
  activeChannel?: string;
  onChannelChange?: (c: string) => void;
  /** Date pill slot. */
  dateControl?: ReactNode;
  /** Escape hatch for pages with custom secondary controls (year tabs, etc.). */
  right?: ReactNode;
  testIdPrefix?: string;
  divider?: boolean;
};

export default function PageHeader({
  title,
  channels,
  activeChannel,
  onChannelChange,
  dateControl,
  right,
  testIdPrefix = 'page-header',
  divider = true,
}: PageHeaderProps) {
  const hasChannels = channels && channels.length > 0 && activeChannel !== undefined && onChannelChange;
  const hasRight = hasChannels || dateControl || right;

  return (
    <>
      <div className="ph-root" data-testid={`${testIdPrefix}-report-header`}>
        <div className="ph-top-row">
          <h1 className="ph-title" data-testid={`${testIdPrefix}-title`}>{title}</h1>

          {hasRight && (
            <div className="ph-right" data-testid={`${testIdPrefix}-right`}>
              {hasChannels && (
                <div className="ph-channels" role="tablist">
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
                        {c}
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
      </div>

      {divider && <hr className="ph-divider" />}
    </>
  );
}
