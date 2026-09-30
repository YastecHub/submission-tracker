import AnnouncementContent from './AnnouncementContent';
import { categoryLabels, priorityLabels } from '../model/presentation';
import type {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementSection,
  BulletinAiOrganizationResponse,
  BulletinAiReviewField,
} from '../model/types';

interface Props {
  current: {
    title: string;
    summary: string;
    category: AnnouncementCategory;
    priority: AnnouncementPriority;
    sections: AnnouncementSection[];
  };
  response: BulletinAiOrganizationResponse;
  selectedFields: Set<BulletinAiReviewField>;
  selectedSectionIds: Set<string>;
  applied: boolean;
  onFieldChange: (field: BulletinAiReviewField, checked: boolean) => void;
  onSectionChange: (id: string, checked: boolean) => void;
  onApply: () => void;
  onDismiss: () => void;
}

function Evidence({ quotes }: { quotes: string[] }) {
  return (
    <details className="mt-2 text-xs text-dim">
      <summary className="cursor-pointer hover:text-muted">Show source evidence</summary>
      <div className="space-y-2 mt-2">
        {quotes.map((quote, index) => <blockquote key={index} className="border-l-2 border-[color:var(--nx-border)] pl-3">{quote}</blockquote>)}
      </div>
    </details>
  );
}

function Selection({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs font-medium ${disabled ? 'text-dim cursor-not-allowed' : 'text-accent cursor-pointer'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="accent-[color:var(--nx-accent)]" />
      {label}
    </label>
  );
}

export default function AiOrganizationReview({
  current,
  response,
  selectedFields,
  selectedSectionIds,
  applied,
  onFieldChange,
  onSectionChange,
  onApply,
  onDismiss,
}: Props) {
  const suggestion = response.suggestion;
  const selectableCount = selectedFields.size + selectedSectionIds.size;
  const currentSections = current.sections.filter((section) => section.body.trim());

  return (
    <section className="card-base p-4 sm:p-6 mb-6" aria-labelledby="assistant-review-heading">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">Assistant review</p>
          <h2 id="assistant-review-heading" className="text-xl font-semibold mt-1">Compare before accepting</h2>
          <p className="text-sm text-muted mt-1">Nothing here is saved or published automatically. Select only suggestions supported by the source.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onDismiss}>{applied ? 'Close review' : 'Dismiss'}</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={onApply} disabled={selectableCount === 0 || applied}>
            {applied ? 'Applied to draft' : 'Apply selected'}
          </button>
        </div>
      </div>

      <div className="alert-danger mb-5" role="note">
        <p className="font-semibold">Human verification required</p>
        <p className="mt-1">Check every name, date, amount and instruction against the original source. Official payment details remain controlled by the linked payment collection.</p>
      </div>

      {suggestion.warnings.length > 0 && (
        <div className="card-base bg-surface-2 p-4 mb-5">
          <h3 className="text-sm font-semibold">Warnings to resolve</h3>
          <ul className="mt-2 space-y-2 text-sm text-muted">
            {suggestion.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`} className="flex gap-2"><span aria-hidden="true">•</span><span>{warning.message}{warning.sourceQuote && <span className="block text-xs text-dim mt-1">Source: “{warning.sourceQuote}”</span>}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="border border-nx rounded-xl p-4 min-w-0">
          <p className="text-xs uppercase tracking-wider text-dim font-semibold">Current draft</p>
          <h3 className="text-lg font-semibold mt-3">{current.title || 'No title yet'}</h3>
          <p className="text-sm text-muted mt-2">{current.summary || 'No summary yet'}</p>
          <div className="flex gap-2 flex-wrap mt-3"><span className="badge">{categoryLabels[current.category]}</span><span className="badge">{priorityLabels[current.priority]}</span></div>
          <div className="divider my-4" />
          {currentSections.length > 0
            ? <AnnouncementContent document={{ version: 1, sections: currentSections }} />
            : <p className="text-sm text-dim">No current content.</p>}
        </div>

        <div className="border border-[color:var(--nx-accent)] rounded-xl p-4 min-w-0 bg-[color:var(--nx-accent-soft)]">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">Suggested organization</p>
          <div className="mt-3">
            <Selection checked={selectedFields.has('title')} disabled={applied} onChange={(checked) => onFieldChange('title', checked)} label="Use title" />
            <h3 className="text-lg font-semibold mt-1">{suggestion.title.value}</h3>
            <Evidence quotes={suggestion.title.sourceQuotes} />
          </div>
          <div className="mt-4">
            <Selection checked={selectedFields.has('summary')} disabled={applied} onChange={(checked) => onFieldChange('summary', checked)} label="Use summary" />
            <p className="text-sm text-muted mt-1">{suggestion.summary.value}</p>
            <Evidence quotes={suggestion.summary.sourceQuotes} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="card-base bg-surface p-3">
              <Selection checked={selectedFields.has('category')} disabled={applied} onChange={(checked) => onFieldChange('category', checked)} label="Use category" />
              <p className="text-sm font-semibold mt-2">{categoryLabels[suggestion.category.value]}</p>
              <p className="text-xs text-dim mt-1">{suggestion.category.reason}</p>
            </div>
            <div className="card-base bg-surface p-3">
              <Selection checked={selectedFields.has('priority')} disabled={applied} onChange={(checked) => onFieldChange('priority', checked)} label="Use priority" />
              <p className="text-sm font-semibold mt-2">{priorityLabels[suggestion.priority.value]}</p>
              <p className="text-xs text-dim mt-1">{suggestion.priority.reason}</p>
            </div>
          </div>
          <div className="divider my-4" />
          <h4 className="text-sm font-semibold mb-3">Suggested sections</h4>
          <p className="text-xs text-dim -mt-2 mb-3">Selected sections replace the current draft content when applied.</p>
          <div className="space-y-3">
            {suggestion.sections.map((section, index) => (
              <div key={section.id} className="card-base bg-surface p-3">
                <Selection checked={selectedSectionIds.has(section.id)} disabled={applied} onChange={(checked) => onSectionChange(section.id, checked)} label={`Use section ${index + 1}`} />
                {section.heading && <h5 className="font-semibold mt-2">{section.heading}</h5>}
                <p className="text-sm text-muted whitespace-pre-wrap mt-1">{section.body}</p>
                <Evidence quotes={section.sourceQuotes} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {suggestion.splitSuggestions.length > 0 && (
        <div className="mt-5 border border-nx rounded-xl p-4">
          <h3 className="text-sm font-semibold">This source may contain separate announcements</h3>
          <p className="text-xs text-dim mt-1">These are review prompts only; no additional drafts were created.</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {suggestion.splitSuggestions.map((split, index) => (
              <div key={index} className="bg-surface-2 border border-nx rounded-lg p-3">
                <p className="text-sm font-semibold">{split.title}</p>
                <p className="text-xs text-muted mt-1">{split.reason}</p>
                <blockquote className="text-xs text-dim border-l-2 border-[color:var(--nx-border)] pl-2 mt-2">{split.sourceQuote}</blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-dim mt-4">Suggestion record: {new Date(response.audit.createdAt).toLocaleString('en-GB')} · Review policy {response.audit.promptVersion}</p>
    </section>
  );
}
