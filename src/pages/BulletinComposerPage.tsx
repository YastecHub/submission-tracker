import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AnnouncementContent from '../features/bulletin/components/AnnouncementContent';
import {
  archiveAdminAnnouncement,
  createAdminAnnouncement,
  getAdminAnnouncement,
  listBulletinPaymentOptions,
  publishAdminAnnouncement,
  updateAdminAnnouncement,
} from '../features/bulletin/api/bulletin';
import { categoryLabels, priorityLabels, sourceTypeLabels } from '../features/bulletin/model/presentation';
import type {
  AdminAnnouncement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementSection,
  AnnouncementSourceType,
  AnnouncementWriteInput,
  PaymentOption,
} from '../features/bulletin/model/types';
import { canEditAnnouncement, canPublishAnnouncement } from '../features/bulletin/model/permissions';

interface ComposerForm {
  title: string;
  summary: string;
  rawSource: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  sourceType: AnnouncementSourceType;
  contributorName: string;
  contributorCredit: string;
  isPinned: boolean;
  paymentEventId: string;
  sections: AnnouncementSection[];
  changeNote: string;
}

const newSection = (): AnnouncementSection => ({ id: crypto.randomUUID(), heading: null, body: '' });
const emptyForm = (): ComposerForm => ({
  title: '', summary: '', rawSource: '', category: 'general', priority: 'normal',
  sourceType: 'official_class', contributorName: '', contributorCredit: '', isPinned: false,
  paymentEventId: '', sections: [newSection()], changeNote: '',
});
const categories: AnnouncementCategory[] = ['general', 'academic', 'practical', 'finance', 'event', 'opportunity', 'emergency'];
const priorities: AnnouncementPriority[] = ['normal', 'important', 'urgent'];
const sourceTypes: AnnouncementSourceType[] = ['official_class', 'educational_contribution', 'lecturer_information', 'external_information'];

function errorMessage(error: unknown): string {
  return axios.isAxiosError(error) ? error.response?.data?.error ?? 'Unable to save this announcement.' : 'Unable to save this announcement.';
}

export default function BulletinComposerPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcement, setAnnouncement] = useState<AdminAnnouncement | null>(null);
  const [form, setForm] = useState<ComposerForm>(emptyForm);
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'archive' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listBulletinPaymentOptions(controller.signal).then(setPayments).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    const controller = new AbortController();
    setLoading(true);
    getAdminAnnouncement(id, controller.signal)
      .then((data) => {
        setAnnouncement(data);
        setForm({
          title: data.title,
          summary: data.summary,
          rawSource: data.rawSource ?? '',
          category: data.category,
          priority: data.priority,
          sourceType: data.sourceType,
          contributorName: data.contributorName ?? '',
          contributorCredit: data.contributorCredit ?? '',
          isPinned: data.isPinned,
          paymentEventId: data.paymentEventId ?? '',
          sections: data.content.sections,
          changeNote: '',
        });
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, isNew]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const canPublish = useMemo(() => {
    return canPublishAnnouncement(user?.role, form.category);
  }, [user, form.category]);
  const canEdit = !announcement || canEditAnnouncement(user, announcement);
  const readOnly = !canEdit;

  function change<K extends keyof ComposerForm>(key: K, value: ComposerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function changeSection(index: number, patch: Partial<AnnouncementSection>) {
    change('sections', form.sections.map((section, position) => position === index ? { ...section, ...patch } : section));
  }

  function payload(version?: number): AnnouncementWriteInput {
    return {
      title: form.title,
      summary: form.summary,
      rawSource: form.rawSource,
      category: form.category,
      priority: form.priority,
      sourceType: form.sourceType,
      contributorName: form.contributorName,
      contributorCredit: form.contributorCredit,
      isPinned: form.isPinned,
      paymentEventId: form.category === 'finance' ? form.paymentEventId : '',
      content: { version: 1, sections: form.sections },
      expectedVersion: version,
      changeNote: form.changeNote,
    };
  }

  async function save(showToast = true): Promise<AdminAnnouncement | null> {
    setSaving(true);
    setError('');
    try {
      const saved = announcement
        ? await updateAdminAnnouncement(announcement.id, payload(announcement.version))
        : await createAdminAnnouncement(payload());
      setAnnouncement(saved);
      setDirty(false);
      if (!announcement) navigate(`/dashboard/bulletin/${saved.id}`, { replace: true });
      if (showToast) toast(saved.status === 'published' ? 'Announcement updated.' : 'Draft saved.', 'success');
      return saved;
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast(message, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function runAction() {
    if (!pendingAction) return;
    setSaving(true);
    setError('');
    try {
      if (pendingAction === 'archive') {
        if (!announcement) return;
        const archived = await archiveAdminAnnouncement(announcement.id, announcement.version);
        setAnnouncement(archived);
        setDirty(false);
        toast('Announcement archived.', 'success');
      } else {
        let current = announcement;
        if (!current || dirty) current = await save(false);
        if (!current) return;
        const published = await publishAdminAnnouncement(current.id, current.version, form.changeNote || undefined);
        setAnnouncement(published);
        setDirty(false);
        toast('Announcement published to Nexium Bulletin.', 'success');
      }
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  }

  if (loading) return <div className="page-base"><Navbar /><main className="max-w-5xl mx-auto px-4 py-8"><div className="card-base h-96 animate-pulse" /></main></div>;

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
          <div>
            <Link to="/dashboard/bulletin" className="text-sm text-muted hover:text-accent">← Back to Bulletin management</Link>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <h1 className="text-3xl font-semibold tracking-tight">{announcement ? 'Edit announcement' : 'Create announcement'}</h1>
              {announcement && <span className={`badge ${announcement.status === 'published' ? 'badge-success' : announcement.status === 'draft' ? 'badge-accent' : ''}`}>{announcement.status}</span>}
              {dirty && <span className="badge">Unsaved changes</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && <button type="button" onClick={() => void save()} disabled={saving} className="btn-secondary">{saving ? 'Saving…' : 'Save'}</button>}
            {(!announcement || announcement.status === 'draft') && (
              <button type="button" onClick={() => setPendingAction('publish')} disabled={saving || !canPublish} className="btn-primary" title={!canPublish ? 'Your role can save this draft but cannot publish this category.' : undefined}>Publish</button>
            )}
            {announcement?.status === 'published' && canPublish && <button type="button" onClick={() => setPendingAction('archive')} disabled={saving} className="btn-ghost text-danger">Archive</button>}
          </div>
        </div>

        {!canPublish && (!announcement || announcement.status === 'draft') && (
          <div className="card-base p-4 mb-5 text-sm text-muted">You can prepare and save this draft. A {form.category === 'finance' ? 'Financial Secretary' : 'Class Representative'} must review and publish it.</div>
        )}
        {error && <div role="alert" className="alert-danger mb-5">{error}</div>}
        {readOnly && <div className="card-base p-4 mb-5 text-sm text-muted">{announcement?.status === 'archived' ? 'This announcement is archived and retained as a read-only record.' : 'You have view-only access to this announcement.'}</div>}

        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] gap-6 items-start">
          <div className="space-y-5">
            <section className="card-base p-5 sm:p-6" aria-labelledby="source-heading">
              <h2 id="source-heading" className="text-lg font-semibold mb-1">Source material</h2>
              <p className="text-sm text-muted mb-4">Keep the original messages or notes here. Students never see this field.</p>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider" htmlFor="raw-source">Raw source</label>
              <textarea id="raw-source" rows={7} className="input-base" value={form.rawSource} disabled={readOnly} onChange={(event) => change('rawSource', event.target.value)} placeholder="Paste WhatsApp messages, notes or the original announcement…" />
            </section>

            <section className="card-base p-5 sm:p-6" aria-labelledby="basics-heading">
              <h2 id="basics-heading" className="text-lg font-semibold mb-4">Student-facing details</h2>
              <div className="space-y-4">
                <div><label htmlFor="announcement-title" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Title</label><input id="announcement-title" className="input-base" maxLength={180} required value={form.title} disabled={readOnly} onChange={(event) => change('title', event.target.value)} /></div>
                <div><label htmlFor="announcement-summary" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Summary</label><textarea id="announcement-summary" className="input-base" rows={3} maxLength={500} required value={form.summary} disabled={readOnly} onChange={(event) => change('summary', event.target.value)} /><p className="text-xs text-dim mt-1 text-right">{form.summary.length}/500</p></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label htmlFor="announcement-category" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Category</label><select id="announcement-category" className="input-base" value={form.category} disabled={readOnly} onChange={(event) => change('category', event.target.value as AnnouncementCategory)}>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></div>
                  <div><label htmlFor="announcement-priority" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Priority</label><select id="announcement-priority" className="input-base" value={form.priority} disabled={readOnly} onChange={(event) => change('priority', event.target.value as AnnouncementPriority)}>{priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1 accent-[color:var(--nx-accent)]" checked={form.isPinned} disabled={readOnly} onChange={(event) => change('isPinned', event.target.checked)} /><span><span className="text-sm font-medium">Pin this announcement</span><span className="block text-xs text-dim mt-0.5">Pinned posts stay above the chronological feed.</span></span></label>
              </div>
            </section>

            <section className="card-base p-5 sm:p-6" aria-labelledby="content-heading">
              <div className="flex items-start justify-between gap-3 mb-4"><div><h2 id="content-heading" className="text-lg font-semibold">Content sections</h2><p className="text-sm text-muted mt-1">Use blank lines for paragraphs and “-” at the start of each line for a bullet list.</p></div>{!readOnly && <button type="button" className="btn-secondary !py-2 shrink-0" onClick={() => change('sections', [...form.sections, newSection()])} disabled={form.sections.length >= 20}>Add section</button>}</div>
              <div className="space-y-4">
                {form.sections.map((section, index) => (
                  <fieldset key={section.id} className="border border-nx rounded-xl p-4">
                    <legend className="px-2 text-xs uppercase tracking-wider text-dim">Section {index + 1}</legend>
                    <label htmlFor={`section-heading-${section.id}`} className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Heading <span className="normal-case font-normal text-dim">(optional)</span></label>
                    <input id={`section-heading-${section.id}`} className="input-base mb-3" maxLength={120} value={section.heading ?? ''} disabled={readOnly} onChange={(event) => changeSection(index, { heading: event.target.value || null })} />
                    <label htmlFor={`section-body-${section.id}`} className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Content</label>
                    <textarea id={`section-body-${section.id}`} className="input-base" rows={8} maxLength={10000} required value={section.body} disabled={readOnly} onChange={(event) => changeSection(index, { body: event.target.value })} />
                    {!readOnly && form.sections.length > 1 && <button type="button" className="btn-ghost text-danger mt-2" onClick={() => change('sections', form.sections.filter((_, position) => position !== index))}>Remove section</button>}
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="card-base p-5 sm:p-6" aria-labelledby="credit-heading">
              <h2 id="credit-heading" className="text-lg font-semibold mb-4">Source and contributor credit</h2>
              <div className="space-y-4">
                <div><label htmlFor="source-type" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Source type</label><select id="source-type" className="input-base" value={form.sourceType} disabled={readOnly} onChange={(event) => change('sourceType', event.target.value as AnnouncementSourceType)}>{sourceTypes.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceTypeLabels[sourceType]}</option>)}</select></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label htmlFor="contributor-name" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Contributor name</label><input id="contributor-name" className="input-base" value={form.contributorName} disabled={readOnly} onChange={(event) => change('contributorName', event.target.value)} /></div>
                  <div><label htmlFor="contributor-credit" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Contributor role / credit</label><input id="contributor-credit" className="input-base" value={form.contributorCredit} disabled={readOnly} onChange={(event) => change('contributorCredit', event.target.value)} /></div>
                </div>
                {form.category === 'finance' && (
                  <div><label htmlFor="payment-event" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Related official payment <span className="normal-case font-normal text-dim">(optional)</span></label><select id="payment-event" className="input-base" value={form.paymentEventId} disabled={readOnly} onChange={(event) => change('paymentEventId', event.target.value)}><option value="">No related payment</option>{payments.map((payment) => <option key={payment.id} value={payment.id}>{payment.title} · ₦{Number(payment.amount).toLocaleString('en-NG')}</option>)}</select><p className="text-xs text-dim mt-1">Payment amount, deadline and link come directly from the payment collection.</p></div>
                )}
                {announcement?.status === 'published' && !readOnly && <div><label htmlFor="change-note" className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Update note <span className="normal-case font-normal text-dim">(optional)</span></label><input id="change-note" className="input-base" maxLength={300} value={form.changeNote} onChange={(event) => change('changeNote', event.target.value)} placeholder="What changed in this version?" /></div>}
              </div>
            </section>
          </div>

          <aside className="card-base p-5 lg:sticky lg:top-20" aria-labelledby="preview-heading">
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">Student preview</p>
            <h2 id="preview-heading" className="text-2xl font-semibold tracking-tight mt-2">{form.title || 'Announcement title'}</h2>
            <p className="text-sm text-muted mt-3 leading-6">{form.summary || 'The announcement summary will appear here.'}</p>
            <div className="divider my-5" />
            {form.sections.every((section) => !section.body.trim()) ? <p className="text-sm text-dim">Add content to preview the article.</p> : <AnnouncementContent document={{ version: 1, sections: form.sections.filter((section) => section.body.trim()) }} />}
          </aside>
        </div>
      </main>

      {pendingAction && (
        <ConfirmModal
          title={pendingAction === 'publish' ? 'Publish to Nexium Bulletin?' : 'Archive announcement?'}
          message={pendingAction === 'publish' ? 'Students will be able to read this announcement immediately. Confirm every name, date and financial detail first.' : 'The announcement will leave the active student feed but remain in the archive.'}
          confirmLabel={pendingAction === 'publish' ? 'Publish now' : 'Archive'}
          variant={pendingAction === 'publish' ? 'warning' : 'danger'}
          loading={saving}
          onConfirm={runAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
