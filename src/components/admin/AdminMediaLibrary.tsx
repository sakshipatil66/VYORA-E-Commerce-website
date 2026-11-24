import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Grid2X2, ImagePlus, List, LoaderCircle, Search, Trash2, Upload, X } from 'lucide-react';
import { AdminMediaAsset, api } from '../../lib/api';

const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const uploadAccept = '.jpg,.jpeg,.png,.webp,.avif';
const controlClass = 'w-full rounded-xl border border-[#e8ddd5] bg-white px-3 py-2.5 text-sm text-[#38272a] outline-none focus:border-[#9b6870] focus:ring-2 focus:ring-[#9b6870]/15';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

const validateClientFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const type = file.type || ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' } as Record<string, string>)[extension || ''];
  if (!supportedTypes.includes(type)) return 'Choose a JPG, PNG, WebP, or AVIF image.';
  if (file.size > 10 * 1024 * 1024) return 'Images must be 10 MB or smaller.';
  return '';
};

const formatBytes = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export const MediaPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AdminMediaAsset) => void;
}> = ({ open, onClose, onSelect }) => {
  const [assets, setAssets] = useState<AdminMediaAsset[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    try { setAssets((await api.adminMedia()).assets); setError(''); }
    catch (cause) { setError((cause as Error).message || 'Could not load the media library.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) void reload(); }, [open]);

  const filtered = useMemo(() => assets.filter((asset) => asset.originalName.toLowerCase().includes(query.toLowerCase())), [assets, query]);
  const upload = async (file?: File) => {
    if (!file) return;
    const validation = validateClientFile(file);
    if (validation) { setError(validation); return; }
    setUploading(true); setProgress(0); setError('');
    try {
      const { asset } = await api.uploadMedia(file, setProgress);
      setAssets((current) => [asset, ...current]);
      onSelect(asset);
      onClose();
    } catch (cause) { setError((cause as Error).message || 'Image upload failed.'); }
    finally { setUploading(false); }
  };
  if (!open) return null;

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1d0810]/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-[#eadcc5] bg-[#fcfaf7] shadow-2xl">
      <header className="flex items-center justify-between gap-3 bg-[#3c111a] px-5 py-4 text-white sm:px-7"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#dfc47f]">VYORA · Asset collection</p><h2 id="media-picker-title" className="mt-1 font-serif text-xl">Choose an image</h2></div><button type="button" onClick={onClose} aria-label="Close media library" className="rounded-full border border-white/20 p-2 text-white/80 hover:bg-white/10"><X className="h-4 w-4"/></button></header>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#eadfd5] bg-white p-4 sm:p-5"><label className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8479]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file names" className={`${controlClass} pl-9`}/></label><input ref={fileRef} hidden type="file" accept={uploadAccept} onChange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/><button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${buttonClass} bg-[#5b112b] text-white`}><Upload className="h-4 w-4"/>{uploading ? `Uploading ${progress}%` : 'Upload image'}</button></div>
      {uploading && <div className="h-1.5 bg-[#eee5dc]"><div className="h-full bg-[#c7a65f] transition-[width]" style={{ width: `${progress}%` }}/></div>}
      {error && <p role="alert" className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 sm:mx-5">{error}</p>}
      <div className="min-h-[260px] flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-[#806d63]"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading your images…</div> : filtered.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#decfc2] bg-white px-5 text-center"><ImagePlus className="h-8 w-8 text-[#b69764]"/><p className="mt-3 font-serif text-lg text-[#45202b]">{assets.length ? 'No matching images' : 'Your library is ready'}</p><p className="mt-1 text-xs text-[#88766d]">{assets.length ? 'Try another filename.' : 'Upload a JPG, PNG, WebP, or AVIF to begin.'}</p></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{filtered.map((asset) => <button key={asset.id} type="button" onClick={() => onSelect(asset)} className="group overflow-hidden rounded-2xl border border-[#eadfd5] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#b69764] hover:shadow-lg"><div className="aspect-[4/3] overflow-hidden bg-[#f4eee8]"><img src={asset.url} alt={asset.altText || asset.originalName} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"/></div><div className="p-2.5"><p className="truncate text-[10px] font-semibold text-[#44222c]">{asset.originalName}</p><p className="mt-1 text-[9px] text-[#8d7c72]">{asset.width} × {asset.height} · {formatBytes(asset.sizeBytes)}</p></div></button>)}</div>}
      </div>
    </div>
  </div>;
};

export const MediaImageField: React.FC<{
  label: string;
  value: string;
  altText?: string;
  onChange: (url: string, altText: string) => void;
  optional?: boolean;
}> = ({ label, value, altText = '', onChange, optional = false }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = async (file?: File) => {
    if (!file) return;
    const validation = validateClientFile(file);
    if (validation) { setError(validation); return; }
    setUploading(true); setProgress(0); setError('');
    try { const { asset } = await api.uploadMedia(file, setProgress); onChange(asset.url, asset.altText); }
    catch (cause) { setError((cause as Error).message || 'Image upload failed.'); }
    finally { setUploading(false); }
  };
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#7c6a61]">{label}{optional ? ' · optional' : ''}</span><div className="flex gap-1"><input ref={inputRef} hidden type="file" accept={uploadAccept} onChange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/><button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="rounded-full border border-[#e8ddd5] px-2.5 py-1.5 text-[9px] font-semibold text-[#5b112b]">{uploading ? `Uploading ${progress}%` : value ? 'Replace' : 'Upload'}</button><button type="button" onClick={() => setPickerOpen(true)} className="rounded-full border border-[#e8ddd5] px-2.5 py-1.5 text-[9px] font-semibold text-[#5b112b]">Choose image</button>{value && <button type="button" onClick={() => onChange('', '')} className="rounded-full border border-[#eed9dc] px-2.5 py-1.5 text-[9px] font-semibold text-rose-700">Remove</button>}</div></div>
    {uploading && <div className="h-1 overflow-hidden rounded-full bg-[#eee5dc]"><div className="h-full bg-[#c7a65f] transition-[width]" style={{ width: `${progress}%` }}/></div>}{error && <p role="alert" className="text-[10px] text-rose-700">{error}</p>}
    {value && <div className="flex items-center gap-3 rounded-xl border border-[#eadfd5] bg-white p-2"><img src={value} alt={altText} className="h-14 w-16 rounded-lg bg-[#f4eee8] object-cover"/><span className="min-w-0 flex-1 truncate text-[10px] text-[#74635a]">{value}</span></div>}
    <input value={value} onChange={(event) => onChange(event.target.value, altText)} placeholder="Paste an existing image URL" className="w-full rounded-xl border border-[#e8ddd5] bg-[#fffdfa] px-3 py-2 text-[10px] text-[#38272a] outline-none focus:border-[#9b6870]"/>
    <input value={altText} onChange={(event) => onChange(value, event.target.value)} maxLength={500} placeholder="Image alt text for accessibility" aria-label={`${label} alt text`} className="w-full rounded-xl border border-[#e8ddd5] bg-[#fffdfa] px-3 py-2 text-[10px] text-[#38272a] outline-none focus:border-[#9b6870]"/>
    <MediaPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(asset) => { onChange(asset.url, asset.altText); setPickerOpen(false); }}/>
  </div>;
};

export const AdminMediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<AdminMediaAsset[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [altDraft, setAltDraft] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const selected = assets.find((asset) => asset.id === selectedId) || null;

  const reload = async (preferId = selectedId) => {
    setLoading(true);
    try {
      const result = await api.adminMedia(); setAssets(result.assets);
      const next = result.assets.find((asset) => asset.id === preferId) || result.assets[0] || null;
      setSelectedId(next?.id || ''); setAltDraft(next?.altText || ''); setError('');
    } catch (cause) { setError((cause as Error).message || 'Could not load the media library.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(''); }, []);
  const filtered = useMemo(() => {
    const next = assets.filter((asset) => asset.originalName.toLowerCase().includes(query.toLowerCase()) && (mimeFilter === 'all' || asset.mimeType === mimeFilter));
    return next.sort((a, b) => sort === 'name' ? a.originalName.localeCompare(b.originalName) : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }, [assets, query, mimeFilter, sort]);
  const uploadFile = async (file: File | undefined, replace = false) => {
    if (!file) return;
    const validation = validateClientFile(file); if (validation) { setError(validation); return; }
    setUploading(true); setProgress(0); setError(''); setNotice('');
    try {
      const result = replace && selected ? await api.replaceMedia(selected.id, file, setProgress) : await api.uploadMedia(file, setProgress);
      setAssets((current) => [result.asset, ...current.filter((asset) => asset.id !== result.asset.id)]);
      setSelectedId(result.asset.id); setAltDraft(result.asset.altText); setNotice(replace ? 'Image replaced. Existing references still use this image.' : 'Image uploaded to the library.');
    } catch (cause) { setError((cause as Error).message || 'Image upload failed.'); }
    finally { setUploading(false); }
  };
  const saveAlt = async () => {
    if (!selected) return;
    try { const { asset } = await api.updateMediaAlt(selected.id, altDraft); setAssets((current) => current.map((item) => item.id === asset.id ? asset : item)); setNotice('Alt text saved.'); setError(''); }
    catch (cause) { setError((cause as Error).message || 'Could not save alt text.'); }
  };
  const remove = async () => {
    if (!selected) return;
    if (selected.usage.length) { setError(`This image is used in ${selected.usage.join('; ')}. Replace or remove those references first.`); return; }
    if (!window.confirm(`Delete ${selected.originalName} from the media library? This cannot be undone.`)) return;
    try { await api.deleteMedia(selected.id); setAssets((current) => current.filter((item) => item.id !== selected.id)); setSelectedId(''); setAltDraft(''); setNotice('Image deleted.'); setError(''); }
    catch (cause) { setError((cause as Error).message || 'Could not delete this image.'); void reload(); }
  };
  const copyUrl = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(new URL(selected.url, window.location.origin).toString()); setNotice('Image URL copied.');
  };

  return <main className="space-y-5">
    <header className="rounded-[24px] bg-[#3c111a] px-5 py-6 text-white shadow-[0_12px_32px_rgba(49,13,23,.12)] sm:px-7"><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#dfc47f]">VYORA · Visual assets</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-2xl sm:text-3xl">Media Library</h1><p className="mt-1 text-xs text-white/70">A durable, searchable home for your campaign and editorial images.</p></div><div><input ref={fileRef} hidden type="file" accept={uploadAccept} onChange={(event) => { void uploadFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/><button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${buttonClass} bg-[#d7bd7d] text-[#3c111a]`}><Upload className="h-4 w-4"/>{uploading ? `Uploading ${progress}%` : 'Upload images'}</button></div></div></header>
    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-xs ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}
    {uploading && <div className="rounded-xl border border-[#eadfd5] bg-white p-3"><div className="mb-2 flex justify-between text-[10px] text-[#6f5c54]"><span>Saving image to the media store</span><span>{progress}%</span></div><div className="h-1.5 rounded-full bg-[#eee5dc]"><div className="h-full rounded-full bg-[#b89756] transition-[width]" style={{ width: `${progress}%` }}/></div></div>}
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-2xl border border-[#eadfd5] bg-white p-3 sm:p-4"><div className="mb-4 flex flex-wrap items-center gap-2"><label className="relative min-w-[170px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8479]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename" className={`${controlClass} pl-9`}/></label><select value={mimeFilter} onChange={(event) => setMimeFilter(event.target.value)} aria-label="Filter image type" className="rounded-xl border border-[#e8ddd5] bg-white px-3 py-2.5 text-xs"><option value="all">All image types</option>{supportedTypes.map((type) => <option key={type} value={type}>{type.replace('image/','').toUpperCase()}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort images" className="rounded-xl border border-[#e8ddd5] bg-white px-3 py-2.5 text-xs"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Filename</option></select><div className="flex rounded-xl border border-[#e8ddd5] p-1"><button type="button" aria-label="Grid view" onClick={() => setView('grid')} className={`rounded-lg p-2 ${view === 'grid' ? 'bg-[#f4edf0] text-[#5b112b]' : 'text-[#7f6c62]'}`}><Grid2X2 className="h-4 w-4"/></button><button type="button" aria-label="List view" onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-[#f4edf0] text-[#5b112b]' : 'text-[#7f6c62]'}`}><List className="h-4 w-4"/></button></div></div>
        {loading ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#806d63]"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading media…</div> : filtered.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#decfc2] bg-[#fdfaf7] px-5 text-center"><ImagePlus className="h-9 w-9 text-[#b69764]"/><h2 className="mt-3 font-serif text-xl text-[#45202b]">{assets.length ? 'No images match your search' : 'Build your visual collection'}</h2><p className="mt-1 max-w-sm text-xs leading-5 text-[#88766d]">{assets.length ? 'Try another name or image type.' : 'Upload campaign, editorial, and brand imagery. Assets are stored with the project database.'}</p>{!assets.length && <button type="button" onClick={() => fileRef.current?.click()} className={`${buttonClass} mt-4 bg-[#5b112b] text-white`}><Upload className="h-4 w-4"/>Choose an image</button>}</div> : view === 'grid' ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{filtered.map((asset) => <button key={asset.id} type="button" onClick={() => { setSelectedId(asset.id); setAltDraft(asset.altText); }} className={`overflow-hidden rounded-2xl border text-left transition hover:shadow-md ${selectedId === asset.id ? 'border-[#b69764] ring-2 ring-[#b69764]/20' : 'border-[#eadfd5]'}`}><div className="aspect-[4/3] bg-[#f4eee8]"><img src={asset.url} alt={asset.altText || asset.originalName} loading="lazy" className="h-full w-full object-cover"/></div><div className="p-2.5"><p className="truncate text-[10px] font-semibold text-[#44222c]">{asset.originalName}</p><p className="mt-1 text-[9px] text-[#8d7c72]">{formatBytes(asset.sizeBytes)} · {asset.width}×{asset.height}</p></div></button>)}</div> : <div className="divide-y divide-[#f0e8e1]">{filtered.map((asset) => <button key={asset.id} type="button" onClick={() => { setSelectedId(asset.id); setAltDraft(asset.altText); }} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${selectedId === asset.id ? 'bg-[#f8f2ed]' : 'hover:bg-[#fcfaf7]'}`}><img src={asset.url} alt={asset.altText || asset.originalName} className="h-14 w-20 rounded-lg bg-[#f4eee8] object-cover"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#44222c]">{asset.originalName}</span><span className="mt-1 block text-[10px] text-[#8d7c72]">{asset.mimeType} · {formatBytes(asset.sizeBytes)} · {asset.width}×{asset.height}</span></span><span className="text-[10px] text-[#8d7c72]">{new Date(asset.createdAt).toLocaleDateString()}</span></button>)}</div>}
      </div>
      <aside className="h-fit rounded-2xl border border-[#eadfd5] bg-[#fdfaf7] p-4 sm:p-5">{selected ? <><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#a28351]">Image details</p><button type="button" onClick={() => setPreviewOpen(true)} className="text-[10px] font-semibold text-[#5b112b]">Preview</button></div><button type="button" onClick={() => setPreviewOpen(true)} className="mt-3 block aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#f1e9e1]"><img src={selected.url} alt={selected.altText || selected.originalName} className="h-full w-full object-contain"/></button><p className="mt-3 break-all text-xs font-semibold text-[#44222c]">{selected.originalName}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[#78665d]"><div><dt>Format</dt><dd className="font-semibold text-[#44222c]">{selected.mimeType.split('/')[1].toUpperCase()}</dd></div><div><dt>File size</dt><dd className="font-semibold text-[#44222c]">{formatBytes(selected.sizeBytes)}</dd></div><div><dt>Dimensions</dt><dd className="font-semibold text-[#44222c]">{selected.width} × {selected.height}px</dd></div><div><dt>Uploaded</dt><dd className="font-semibold text-[#44222c]">{new Date(selected.createdAt).toLocaleDateString()}</dd></div></dl><label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-[#78665d]">Alt text<textarea rows={3} maxLength={500} value={altDraft} onChange={(event) => setAltDraft(event.target.value)} className={`${controlClass} mt-1.5 resize-y`} placeholder="Describe the image for assistive technology"/></label><button type="button" onClick={() => void saveAlt()} className={`${buttonClass} mt-2 w-full border border-[#ded1c6] text-[#5b112b]`}><Check className="h-3.5 w-3.5"/>Save alt text</button><div className="mt-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#a28351]">Used in</p>{selected.usage.length ? <ul className="mt-1 space-y-1 text-[10px] text-[#6f5c54]">{selected.usage.map((item) => <li key={item}>· {item}</li>)}</ul> : <p className="mt-1 text-[10px] text-[#8d7c72]">Not currently referenced.</p>}</div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void copyUrl()} className={`${buttonClass} border border-[#ded1c6] px-2 text-[#5b112b]`}><Copy className="h-3.5 w-3.5"/>Copy URL</button><input ref={replaceRef} hidden type="file" accept={uploadAccept} onChange={(event) => { void uploadFile(event.currentTarget.files?.[0], true); event.currentTarget.value = ''; }}/><button type="button" disabled={uploading} onClick={() => replaceRef.current?.click()} className={`${buttonClass} border border-[#ded1c6] px-2 text-[#5b112b]`}>{uploading ? `Replace ${progress}%` : 'Replace image'}</button></div><button type="button" onClick={() => void remove()} className={`${buttonClass} mt-2 w-full border border-rose-200 text-rose-700`}><Trash2 className="h-3.5 w-3.5"/>Delete image</button></> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><ImagePlus className="h-8 w-8 text-[#b69764]"/><p className="mt-3 font-serif text-lg text-[#45202b]">Select an image</p><p className="mt-1 text-[10px] leading-5 text-[#88766d]">Image details and reference status appear here.</p></div>}</aside>
    </section>
    {previewOpen && selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[130] flex items-center justify-center bg-[#1d0810]/80 p-4" onClick={() => setPreviewOpen(false)}><div className="relative max-h-[92vh] max-w-6xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 text-[#4a1a26]"><X className="h-4 w-4"/></button><img src={selected.url} alt={selected.altText || selected.originalName} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"/><p className="mt-2 text-center text-xs text-white">{selected.originalName} · {selected.width} × {selected.height}</p></div></div>}
  </main>;
};
