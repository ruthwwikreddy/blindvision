import { ChevronRight, type LucideIcon } from 'lucide-react';

interface SettingsRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: string;
  onClick: () => void;
}

export const SettingsRow = ({ icon: Icon, title, description, meta, onClick }: SettingsRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="bv-surface w-full text-left p-4 rounded-2xl shadow-none hover:border-foreground/30 transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-foreground/20 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        {meta && <p className="text-sm text-foreground/80 mt-1">{meta}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
    </div>
  </button>
);
