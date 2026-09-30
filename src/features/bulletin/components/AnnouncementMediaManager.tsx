import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  deleteAnnouncementMedia,
  updateAnnouncementMedia,
  uploadAnnouncementMedia,
} from '../api/bulletin';
import type {
  AdminAnnouncement,
  AnnouncementMedia,
  AnnouncementMediaMutationResponse,
  AnnouncementSection,
} from '../model/types';

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
  caption: string;
  sectionId: string;
}

interface EditableMedia extends AnnouncementMedia {
  captionText: string;
  sectionValue: string;
}

interface Props {
  announcement: AdminAnnouncement;
  sections: AnnouncementSection[];
  readOnly: boolean;
  formDirty: boolean;
  disabled: boolean;
  changeNote: string;
  onChanged: (result: AnnouncementMediaMutationResponse) => void;
  onBusyChange: (busy: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const MAX_IMAGES = 12;
const MAX_BATCH = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function message(error: unknown): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.error ?? 'Unable to update announcement images.'
    : 'Unable to update announcement images.';
}

function sectionLabel(section: AnnouncementSection, index: number): string {
  return `Section ${index + 1}${section.heading ? ` — ${section.heading}` : ''}`;
}

export default function AnnouncementMediaManager({
  announcement,
  sections,
  readOnly,
  formDirty,
  disabled,
  changeNote,
  onChanged,
  onBusyChange,
  onDirtyChange,
}: Props) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const pendingRef = useRef<PendingImage[]>([]);
  const [items, setItems] = useState<EditableMedia[]>([]);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (detailsDirty) return;
    setItems(announcement.media.map((media) => ({
      ...media,
      captionText: media.caption ?? '',
      sectionValue: media.sectionId ?? '',
    })));
    setConfirmDelete(null);
  }, [announcement.media, detailsDirty]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => () => {
    pendingRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);
  useEffect(() => onDirtyChange(pending.length > 0 || detailsDirty), [pending.length, detailsDirty, onDirtyChange]);

  const mutationsDisabled = readOnly || disabled || formDirty || busy;
  const detailsDisabled = mutationsDisabled || pending.length > 0;

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    setError('');
    const selected = Array.from(files);
    if (pending.length + selected.length > MAX_BATCH) {
      setError(`Upload no more than ${MAX_BATCH} images at once.`);
      return;
    }
    if (announcement.media.length + pending.length + selected.length > MAX_IMAGES) {
      setError(`An announcement can contain up to ${MAX_IMAGES} images.`);
      return;
    }
    if (selected.some((file) => !acceptedTypes.has(file.type))) {
      setError('Choose JPEG, PNG, WEBP or GIF images only.');
      return;
    }
    if (selected.some((file) => file.size > MAX_BYTES)) {
      setError('Each image must be under 5 MB.');
      return;
    }
    setPending((current) => [
      ...current,
      ...selected.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        altText: '',
        caption: '',
        sectionId: '',
      })),
    ]);
  }

  function updatePending(id: string, patch: Partial<PendingImage>) {
    setPending((current) => current.map((image) => image.id === id ? { ...image, ...patch } : image));
  }

  function removePending(id: string) {
    setPending((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  }

  async function upload() {
    if (mutationsDisabled || pending.length === 0) return;
    if (pending.some((image) => !image.altText.trim())) {
      setError('Add useful alt text for every image before uploading.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      pending.forEach((image) => form.append('images', image.file));
      form.append('expectedVersion', String(announcement.version));
      if (changeNote.trim()) form.append('changeNote', changeNote.trim());
      form.append('metadata', JSON.stringify(pending.map((image) => ({
        altText: image.altText,
        caption: image.caption,
        sectionId: image.sectionId || null,
      }))));
      const result = await uploadAnnouncementMedia(announcement.id, form);
      pending.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPending([]);
      onChanged(result);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  function updateItem(id: string, patch: Partial<EditableMedia>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setDetailsDirty(true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDetailsDirty(true);
  }

  async function saveDetails() {
    if (mutationsDisabled || !detailsDirty) return;
    if (items.some((item) => !item.altText.trim())) {
      setError('Add useful alt text for every image before saving.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await updateAnnouncementMedia(announcement.id, {
        expectedVersion: announcement.version,
        changeNote: changeNote.trim() || undefined,
        items: items.map((item) => ({
          id: item.id,
          altText: item.altText,
          caption: item.captionText,
          sectionId: item.sectionValue || null,
        })),
      });
      setDetailsDirty(false);
      onChanged(result);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (mutationsDisabled || detailsDirty) return;
    setBusy(true);
    setError('');
    try {
      const result = await deleteAnnouncementMedia(
        announcement.id,
        id,
        announcement.version,
        changeNote.trim() || undefined,
      );
      setConfirmDelete(null);
      setDetailsDirty(false);
      onChanged(result);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-base p-4 sm:p-6" aria-labelledby="media-heading">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 id="media-heading" className="text-lg font-semibold">Images</h2>
          <p className="text-sm text-muted mt-1">Upload up to {MAX_IMAGES} images, add alt text, arrange them and place them with article sections.</p>
        </div>
        <span className="badge shrink-0">{announcement.media.length}/{MAX_IMAGES}</span>
      </div>

      {formDirty && !readOnly && (
        <div className="card-base bg-surface-2 p-3 mt-4 text-sm text-muted">Save the current announcement changes before changing images.</div>
      )}
      {error && <div role="alert" className="alert-danger mt-4">{error}</div>}

      {!readOnly && (
        <div className="mt-5">
          <label className={`btn-secondary inline-flex w-full sm:w-auto justify-center ${mutationsDisabled || detailsDirty || announcement.media.length + pending.length >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            Choose images
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={mutationsDisabled || detailsDirty || announcement.media.length + pending.length >= MAX_IMAGES}
              onChange={(event) => { chooseFiles(event.target.files); event.target.value = ''; }}
            />
          </label>
          <p className="text-xs text-dim mt-2">JPEG, PNG, WEBP or GIF · 5 MB each · {MAX_BATCH} images per upload</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-5 space-y-4" aria-label="Images waiting to upload">
          <h3 className="text-sm font-semibold">Complete image details</h3>
          {pending.map((image, index) => (
            <div key={image.id} className="grid sm:grid-cols-[160px_1fr] gap-4 border border-nx rounded-xl p-3">
              <img src={image.previewUrl} alt="" className="w-full h-28 object-cover rounded-lg bg-surface-2" />
              <div className="space-y-3 min-w-0">
                <p className="text-xs text-dim truncate">{index + 1}. {image.file.name}</p>
                <div><label htmlFor={`pending-alt-${image.id}`} className="block text-xs font-medium text-muted mb-1">Alt text <span className="text-danger">*</span></label><input id={`pending-alt-${image.id}`} className="input-base" maxLength={240} required disabled={busy} value={image.altText} onChange={(event) => updatePending(image.id, { altText: event.target.value })} placeholder="Describe what students need to know from this image" /></div>
                <div><label htmlFor={`pending-caption-${image.id}`} className="block text-xs font-medium text-muted mb-1">Caption <span className="text-dim">(optional)</span></label><input id={`pending-caption-${image.id}`} className="input-base" maxLength={500} disabled={busy} value={image.caption} onChange={(event) => updatePending(image.id, { caption: event.target.value })} /></div>
                <div><label htmlFor={`pending-section-${image.id}`} className="block text-xs font-medium text-muted mb-1">Placement</label><select id={`pending-section-${image.id}`} className="input-base" disabled={busy} value={image.sectionId} onChange={(event) => updatePending(image.id, { sectionId: event.target.value })}><option value="">Before the article sections</option>{sections.map((section, sectionIndex) => <option key={section.id} value={section.id}>{sectionLabel(section, sectionIndex)}</option>)}</select></div>
                <button type="button" className="btn-ghost text-danger !px-0" disabled={busy} onClick={() => removePending(image.id)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-primary w-full sm:w-auto" disabled={mutationsDisabled} onClick={() => void upload()}>{busy ? 'Uploading…' : `Upload ${pending.length} image${pending.length === 1 ? '' : 's'}`}</button>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Uploaded images</h3>
            {!readOnly && <button type="button" className="btn-secondary !py-2 w-full sm:w-auto" disabled={detailsDisabled || !detailsDirty} onClick={() => void saveDetails()}>{busy ? 'Saving…' : 'Save image details'}</button>}
          </div>
          {items.map((item, index) => (
            <fieldset key={item.id} className="grid sm:grid-cols-[160px_1fr] gap-4 border border-nx rounded-xl p-3">
              <legend className="sr-only">Image {index + 1}</legend>
              <img src={item.thumbnailUrl} alt="" className="w-full h-28 object-cover rounded-lg bg-surface-2" />
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-dim">Image {index + 1} · {item.format.toUpperCase()} · {Math.max(1, Math.round(item.bytes / 1024))} KB</span>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost !px-2 !py-1" disabled={detailsDisabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move image ${index + 1} up`}>↑</button>
                      <button type="button" className="btn-ghost !px-2 !py-1" disabled={detailsDisabled || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move image ${index + 1} down`}>↓</button>
                    </div>
                  )}
                </div>
                <div><label htmlFor={`media-alt-${item.id}`} className="block text-xs font-medium text-muted mb-1">Alt text <span className="text-danger">*</span></label><input id={`media-alt-${item.id}`} className="input-base" maxLength={240} required disabled={detailsDisabled} value={item.altText} onChange={(event) => updateItem(item.id, { altText: event.target.value })} /></div>
                <div><label htmlFor={`media-caption-${item.id}`} className="block text-xs font-medium text-muted mb-1">Caption <span className="text-dim">(optional)</span></label><input id={`media-caption-${item.id}`} className="input-base" maxLength={500} disabled={detailsDisabled} value={item.captionText} onChange={(event) => updateItem(item.id, { captionText: event.target.value })} /></div>
                <div><label htmlFor={`media-section-${item.id}`} className="block text-xs font-medium text-muted mb-1">Placement</label><select id={`media-section-${item.id}`} className="input-base" disabled={detailsDisabled} value={item.sectionValue} onChange={(event) => updateItem(item.id, { sectionValue: event.target.value })}><option value="">Before the article sections</option>{sections.map((section, sectionIndex) => <option key={section.id} value={section.id}>{sectionLabel(section, sectionIndex)}</option>)}</select></div>
                {!readOnly && (confirmDelete === item.id ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted">Remove this image?</span><button type="button" className="btn-ghost text-danger" disabled={detailsDisabled} onClick={() => void remove(item.id)}>Remove</button><button type="button" className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button></div>
                ) : (
                  <button type="button" className="btn-ghost text-danger !px-0" disabled={detailsDisabled || detailsDirty} title={detailsDirty ? 'Save image details before removing an image' : undefined} onClick={() => setConfirmDelete(item.id)}>Remove image</button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {announcement.media.length === 0 && pending.length === 0 && (
        <p className="text-sm text-dim mt-5">No images added. Images are optional.</p>
      )}
    </section>
  );
}
