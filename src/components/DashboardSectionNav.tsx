import { Link } from 'react-router-dom';

export type DashboardSection = 'submissions' | 'payments' | 'ledger' | 'bulletin';

const sections: Array<{ id: DashboardSection; label: string; to: string }> = [
  { id: 'submissions', label: 'Submissions', to: '/dashboard?section=submissions' },
  { id: 'payments', label: 'Payments', to: '/dashboard?section=payments' },
  { id: 'ledger', label: 'Ledger', to: '/dashboard?section=ledger' },
  { id: 'bulletin', label: 'Bulletin', to: '/dashboard/bulletin' },
];

export default function DashboardSectionNav({
  active,
  counts = {},
}: {
  active: DashboardSection;
  counts?: Partial<Record<DashboardSection, number>>;
}) {
  return (
    <nav aria-label="Dashboard sections" className="flex gap-1 bg-surface-2 border border-nx rounded-lg p-1 mb-6 w-full sm:w-fit overflow-x-auto">
      {sections.map((section) => (
        <Link
          key={section.id}
          to={section.to}
          aria-current={active === section.id ? 'page' : undefined}
          className={`px-3 sm:px-4 py-2 min-h-11 text-sm font-medium rounded-md transition-colors flex items-center justify-center whitespace-nowrap ${
            active === section.id
              ? 'bg-surface text-[color:var(--nx-text)] border border-nx'
              : 'text-muted hover:text-[color:var(--nx-text)]'
          }`}
        >
          {section.label}
          {counts[section.id] !== undefined && <span className="ml-2 badge">{counts[section.id]}</span>}
        </Link>
      ))}
    </nav>
  );
}
