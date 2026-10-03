import { ReactNode } from 'react';

const INK = '#0F172A';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_200 = '#E2E8F0';

type PageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  testIdPrefix?: string;
  /** Set to false to suppress the hairline divider below the header. */
  divider?: boolean;
};

/**
 * Shared editorial page header used across Goorin REPORTING pages.
 * Compact type scale: 10px eyebrow / 28px H1 / 13px subtitle, with
 * right-side controls vertically centered against the left stack.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  testIdPrefix = 'page-header',
  divider = true,
}: PageHeaderProps) {
  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-6"
        data-testid={`${testIdPrefix}-report-header`}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ letterSpacing: '0.14em', color: SLATE_400, margin: 0 }}
            data-testid={`${testIdPrefix}-eyebrow`}
          >
            {eyebrow}
          </p>
          <h1
            className="font-semibold"
            style={{
              fontSize: 28,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: INK,
              margin: '4px 0 0',
            }}
            data-testid={`${testIdPrefix}-title`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="font-normal"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: SLATE_500,
                maxWidth: 640,
                margin: '4px 0 0',
              }}
              data-testid={`${testIdPrefix}-subtitle`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right && (
          <div className="shrink-0" data-testid={`${testIdPrefix}-right`}>
            {right}
          </div>
        )}
      </div>

      {divider && (
        <hr
          style={{
            margin: '20px 0',
            border: 'none',
            borderTop: `1px solid ${SLATE_200}`,
          }}
        />
      )}
    </>
  );
}
