import { FOUNDER_NAME, FOUNDER_URL } from '@/lib/founder';
import { cn } from '@/lib/utils';

interface FounderCreditProps {
  className?: string;
  variant?: 'default' | 'compact' | 'prominent';
  showPortfolioLink?: boolean;
}

export const FounderCredit = ({
  className,
  variant = 'default',
  showPortfolioLink = true,
}: FounderCreditProps) => {
  const sizeClass =
    variant === 'compact' ? 'text-xs' : variant === 'prominent' ? 'text-sm' : 'text-xs';

  return (
    <footer
      className={cn('text-center text-muted-foreground safe-area-bottom', sizeClass, className)}
      aria-label="Founder credit"
    >
      <p>
        Founded by{' '}
        <a
          href={FOUNDER_URL}
          target="_blank"
          rel="author noopener noreferrer"
          className="text-foreground underline underline-offset-2 hover:text-primary font-medium"
          title={`${FOUNDER_NAME} — portfolio and projects`}
        >
          {FOUNDER_NAME}
        </a>
      </p>
      {showPortfolioLink && (
        <p className={variant === 'compact' ? 'mt-0.5' : 'mt-1'}>
          <a
            href={FOUNDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-2"
          >
            ruthwikreddy.live
          </a>
        </p>
      )}
    </footer>
  );
};
