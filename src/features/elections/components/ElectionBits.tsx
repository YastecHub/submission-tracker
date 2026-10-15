import { useState } from 'react';
import { STATUS_LABEL, STATUS_TONE, turnoutPercent } from '../model/election';
import type { ElectionStatus } from '../model/types';

export function StatusBadge({ status }: { status: ElectionStatus }) {
  return (
    <span className={`badge ${STATUS_TONE[status]} inline-flex items-center gap-1.5`}>
      {status === 'open' && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CandidateAvatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const dimension = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-lg';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  if (photoUrl && !broken) {
    return <img src={photoUrl} alt="" loading="lazy" onError={() => setBroken(true)} className={`${dimension} rounded-full object-cover bg-surface-2 border border-nx shrink-0`} />;
  }
  return (
    <span aria-hidden="true" className={`${dimension} rounded-full bg-[color:var(--nx-accent-soft)] text-accent font-semibold flex items-center justify-center shrink-0`}>
      {initials || '?'}
    </span>
  );
}

export function TurnoutBar({ voted, eligible, label = 'have voted' }: { voted: number; eligible: number; label?: string }) {
  const percent = turnoutPercent(voted, eligible);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted"><span className="font-semibold text-[color:var(--nx-text)] tabular-nums">{voted}</span> of <span className="tabular-nums">{eligible}</span> {label}</span>
        <span className="font-semibold tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 mt-2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Turnout">
        <div className="h-full rounded-full bg-[color:var(--nx-accent)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Manifesto({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 160;
  return (
    <div className="mt-2">
      <p className={`text-sm text-muted whitespace-pre-line ${open || !long ? '' : 'line-clamp-3'}`}>{text}</p>
      {long && (
        <button type="button" className="text-xs text-accent font-medium mt-1 min-h-8" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>
          {open ? 'Show less' : 'Read full manifesto'}
        </button>
      )}
    </div>
  );
}
