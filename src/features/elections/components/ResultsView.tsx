import { CandidateAvatar } from './ElectionBits';
import type { ElectionResults } from '../model/types';

/** Results per position, ranked from most votes to least. Shared by students and the committee. */
export default function ResultsView({ results }: { results: ElectionResults }) {
  return (
    <div className="space-y-4">
      {results.positions.map((position) => (
        <section key={position.positionId} className="card-base p-4 sm:p-5" aria-labelledby={`result-${position.positionId}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={`result-${position.positionId}`} className="font-semibold">{position.title}</h3>
            <span className="text-xs text-dim tabular-nums">{position.totalVotes} vote{position.totalVotes === 1 ? '' : 's'}</span>
          </div>
          {position.tie && (
            <p className="text-sm text-accent mt-2">{position.unopposed ? 'Yes and No are tied.' : 'Tie for first place. The electoral committee will settle it.'}</p>
          )}
          {position.unopposed ? (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <CandidateAvatar name={position.candidates[0].displayName} photoUrl={position.candidates[0].photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{position.candidates[0].displayName}</p>
                  <p className="text-xs text-dim">Unopposed: Yes / No vote</p>
                </div>
                {position.candidates[0].isWinner ? <span className="badge badge-success">Elected</span> : <span className="badge">Not elected</span>}
              </div>
              {[['Yes', position.yes ?? 0], ['No', position.no ?? 0]].map(([label, count]) => {
                const percent = position.totalVotes ? Math.round(((count as number) / position.totalVotes) * 1000) / 10 : 0;
                return (
                  <div key={label as string} className="mt-3">
                    <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums">{count} · {percent}%</span></div>
                    <div className="h-2 rounded-full bg-surface-2 mt-1 overflow-hidden"><div className={`h-full rounded-full ${label === 'Yes' ? 'bg-emerald-500' : 'bg-zinc-500'}`} style={{ width: `${percent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ol className="mt-3 space-y-3">
              {position.candidates.map((candidate) => (
                <li key={candidate.candidateId}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm text-dim tabular-nums text-right shrink-0">{candidate.rank}</span>
                    <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {candidate.displayName}
                        {candidate.nickname && <span className="text-dim font-normal"> ({candidate.nickname})</span>}
                      </p>
                      <div className="h-2 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${candidate.isWinner ? 'bg-emerald-500' : 'bg-[color:var(--nx-accent)] opacity-60'}`} style={{ width: `${candidate.percent}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{candidate.votes}</p>
                      <p className="text-[11px] text-dim tabular-nums">{candidate.percent}%</p>
                    </div>
                  </div>
                  {candidate.isWinner && <p className="text-xs text-emerald-400 font-medium mt-1 ml-[4.75rem]">Winner</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
