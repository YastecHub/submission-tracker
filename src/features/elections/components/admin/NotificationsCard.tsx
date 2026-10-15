import { useState } from 'react';
import ConfirmModal from '../../../../components/ConfirmModal';
import { useToast } from '../../../../context/ToastContext';
import { remindNonVoters } from '../../api/elections';
import { useAction } from '../../hooks/useAction';
import { useNow } from '../../hooks/useNow';
import { formatTime } from '../../model/election';
import type { AdminElection, ElectionNotice } from '../../model/types';

const NOTICE_LABEL: Record<string, string> = {
  opened: '"Voting is open"',
  'closing-60': '"1 hour left" (to students who hadn\'t voted)',
  'closing-15': '"15 minutes left" (to students who hadn\'t voted)',
  reminder: 'Reminder to students who hadn\'t voted',
  results: '"Results are out"',
};

function reach(notice: ElectionNotice): string {
  const phones = `${notice.pushQueued} phone${notice.pushQueued === 1 ? '' : 's'}`;
  return notice.emailsSent ? `${phones} and ${notice.emailsSent} email${notice.emailsSent === 1 ? '' : 's'}` : phones;
}

/** What students have been told, and the committee's "remind people who haven't voted" button. */
export default function NotificationsCard({ election, role, onChange }: { election: AdminElection; role: string; onChange: (next: AdminElection) => void }) {
  const isCommittee = role === 'electoral_committee';
  const { toast } = useToast();
  const { busy, run } = useAction();
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const notVoted = Math.max(0, election.counts.registered - election.counts.voted);
  const nextReminderAt = election.reminderAvailableAt ? new Date(election.reminderAvailableAt).getTime() : 0;
  const waitForNext = nextReminderAt > now;

  async function remind() {
    setConfirming(false);
    const next = await run('remind', () => remindNonVoters(election.id));
    if (!next) return;
    onChange(next);
    const sent = next.notifications.find((notice) => notice.kind === 'reminder');
    toast(sent && sent.pushQueued > 0 ? `Reminder sent to ${reach(sent)}.` : 'Reminder sent, but nobody who still has to vote has notifications on.', 'success');
  }

  return (
    <div className="card-base p-5 space-y-3">
      <h2 className="font-semibold">Notifications</h2>
      {election.isTest ? (
        <p className="text-sm text-muted">Test elections don&apos;t send notifications, so the whole class isn&apos;t pinged during a rehearsal.</p>
      ) : (
        <p className="text-sm text-muted">
          Students with notifications on get a ping when voting opens, 1 hour and 15 minutes before closing (only those who haven&apos;t voted), and when results are published.
          When voting opens, students without notifications get an email instead.
        </p>
      )}

      {election.notifications.length > 0 && (
        <ul className="divide-y divide-[color:var(--nx-border)] text-sm">
          {election.notifications.map((notice) => (
            <li key={`${notice.kind}-${notice.at}`} className="py-2 flex flex-wrap justify-between gap-x-3">
              <span>{NOTICE_LABEL[notice.kind] ?? notice.kind}{notice.sentBy ? ` · by ${notice.sentBy}` : ''}</span>
              <span className="text-dim">{formatTime(notice.at)} · {reach(notice)}</span>
            </li>
          ))}
        </ul>
      )}

      {isCommittee && !election.isTest && election.status === 'open' && (
        <div className="pt-2 border-t border-nx space-y-1.5">
          <button type="button" className="btn-secondary" disabled={busy !== null || waitForNext || notVoted === 0} onClick={() => setConfirming(true)}>
            {busy === 'remind' ? 'Sending…' : "Remind people who haven't voted"}
          </button>
          <p className="text-xs text-dim">
            {notVoted === 0 ? 'Everyone registered has voted.'
              : waitForNext ? `A reminder just went out. The next one is possible at ${formatTime(new Date(nextReminderAt).toISOString())}.`
                : `${notVoted} registered student${notVoted === 1 ? " hasn't" : "s haven't"} voted yet. Only those with notifications on are reached. At most once every 30 minutes.`}
          </p>
        </div>
      )}

      {confirming && (
        <ConfirmModal
          title="Send a reminder?"
          message="Everyone who hasn't voted yet and has notifications on gets: “You haven't voted yet. Tap to vote now.” Students who already voted are not disturbed."
          confirmLabel="Send reminder"
          variant="warning"
          loading={busy !== null}
          onConfirm={() => void remind()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
