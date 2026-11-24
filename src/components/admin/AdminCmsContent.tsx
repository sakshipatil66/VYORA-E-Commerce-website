import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Plus, Save, Send, Trash2 } from 'lucide-react';
import { AdminStoreCmsContent, StoreCmsContent, api } from '../../lib/api';

type CmsArea = 'about' | 'contact' | 'faq' | 'shipping' | 'returns' | 'privacy' | 'terms' | 'footer' | 'seo';
const areaItems: { id: CmsArea; label: string; group: 'Pages' | 'Policies' | 'Shared' }[] = [
  { id: 'about', label: 'About page', group: 'Pages' }, { id: 'contact', label: 'Contact details', group: 'Pages' }, { id: 'faq', label: 'FAQ', group: 'Pages' },
  { id: 'shipping', label: 'Shipping policy', group: 'Policies' }, { id: 'returns', label: 'Returns policy', group: 'Policies' }, { id: 'privacy', label: 'Privacy policy', group: 'Policies' }, { id: 'terms', label: 'Terms & conditions', group: 'Policies' },
  { id: 'footer', label: 'Footer & newsletter', group: 'Shared' }, { id: 'seo', label: 'SEO metadata', group: 'Shared' }
];
const fieldClass = 'mt-1.5 w-full rounded-xl border border-[#e8ddd5] bg-[#fffdfa] px-3 py-2.5 text-sm text-[#38272a] outline-none transition focus:border-[#9b6870] focus:ring-2 focus:ring-[#9b6870]/15';
const labelClass = 'block text-[10px] font-semibold uppercase tracking-[.12em] text-[#7c6a61]';
const field = (name: string, value: string, onChange: (value: string) => void, multiline = false, placeholder?: string) => <label key={name} className="block"><span className={labelClass}>{name}</span>{(multiline || /description|summary|body|answer/i.test(name)) ? <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${fieldClass} resize-y`}/> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={fieldClass}/>}</label>;

export const AdminCmsContent: React.FC = () => {
  const [record, setRecord] = useState<AdminStoreCmsContent | null>(null);
  const [draft, setDraft] = useState<StoreCmsContent | null>(null);
  const [area, setArea] = useState<CmsArea>('about');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = useMemo(() => Boolean(record && draft && JSON.stringify(draft) !== JSON.stringify(record.draft)), [record, draft]);
  const pendingPublish = Boolean(record && draft && JSON.stringify(draft) !== JSON.stringify(record.published));

  const reload = async () => {
    setLoading(true);
    try { const result = await api.adminCmsContent(); setRecord(result); setDraft(result.draft); setMessage(null); }
    catch (cause) { setMessage({ text: `Could not load CMS content: ${(cause as Error).message}`, error: true }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (section: keyof StoreCmsContent, key: string, value: unknown, _multiline?: boolean) => setDraft((current) => current ? ({ ...current, [section]: { ...(current[section] as object), [key]: value } }) : current);
  const updatePolicy = (key: string, value: string, _multiline?: boolean) => setDraft((current) => current ? ({ ...current, policies: { ...current.policies, [area as 'shipping' | 'returns' | 'privacy' | 'terms']: { ...current.policies[area as 'shipping' | 'returns' | 'privacy' | 'terms'], [key]: value } } }) : current);
  const save = async (publish: boolean) => {
    if (!draft) return;
    setSaving(true); setMessage(null);
    try {
      const result = await api.saveCmsContent(draft, publish);
      const next = { draft: result.draft, published: result.published, updatedAt: result.updatedAt };
      setRecord(next); setDraft(result.draft);
      setMessage({ text: publish ? 'Content published to the storefront.' : 'Draft saved. The published storefront is unchanged.' });
    } catch (cause) { setMessage({ text: `Could not save CMS content: ${(cause as Error).message}`, error: true }); }
    finally { setSaving(false); }
  };

  const isPolicy = ['shipping', 'returns', 'privacy', 'terms'].includes(area);
  const policy = isPolicy && draft ? draft.policies[area as 'shipping' | 'returns' | 'privacy' | 'terms'] : null;

  return <main className="space-y-5">
    <header className="rounded-[24px] bg-[#3c111a] px-5 py-6 text-white shadow-[0_12px_32px_rgba(49,13,23,.12)] sm:px-7"><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#dfc47f]">VYORA · Store voice</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-2xl sm:text-3xl">Content Management</h1><p className="mt-1 text-xs text-white/70">Edit the copy, service details and metadata connected to the storefront.</p></div><div className="flex items-center gap-2 text-[10px]"><span className={`rounded-full px-3 py-1.5 ${dirty ? 'bg-amber-100 text-amber-900' : 'bg-white/10 text-white/80'}`}>{dirty ? 'Unsaved changes' : pendingPublish ? 'Draft not published' : 'Published content'}</span></div></div></header>
    {message && <p role={message.error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-xs ${message.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
    {loading ? <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-[#eadfd5] bg-white text-sm text-[#806d63]"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading saved content…</div> : draft && <div className="grid min-w-0 gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
      <nav aria-label="CMS content areas" className="h-fit rounded-2xl border border-[#eadfd5] bg-white p-2 sm:p-3">{(['Pages','Policies','Shared'] as const).map((group) => <div key={group} className="mb-3 last:mb-0"><p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#a28351]">{group}</p>{areaItems.filter((item) => item.group === group).map((item) => <button key={item.id} type="button" onClick={() => setArea(item.id)} className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${area === item.id ? 'bg-[#f6edf0] text-[#5b112b]' : 'text-[#6f5c54] hover:bg-[#fcfaf7]'}`}>{item.label}</button>)}</div>)}</nav>
      <section className="min-w-0 rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#f0e8e1] pb-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#a28351]">Content editor</p><h2 className="mt-1 font-serif text-xl text-[#3d1821]">{areaItems.find((item) => item.id === area)?.label}</h2><p className="mt-1 text-[10px] text-[#927f75]">Edits stay in draft until you publish them.</p></div><div className="flex gap-2"><button type="button" disabled={saving || !dirty} onClick={() => void save(false)} className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd2c8] px-3 py-2 text-[10px] font-semibold text-[#5c4942] disabled:opacity-50"><Save className="h-3.5 w-3.5"/>{saving ? 'Saving…' : 'Save draft'}</button><button type="button" disabled={saving || !pendingPublish} onClick={() => void save(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{saving ? 'Publishing…' : 'Publish'}</button></div></div>
        {area === 'about' && <div className="grid gap-4 sm:grid-cols-2">{field('Eyebrow', draft.about.eyebrow, (value) => update('about','eyebrow',value))}{field('Page title', draft.about.title, (value) => update('about','title',value))}<div className="sm:col-span-2">{field('Introduction', draft.about.description, (value) => update('about','description',value), true)}</div>{field('Promise title', draft.about.promiseTitle, (value) => update('about','promiseTitle',value))}<div>{field('Promise description', draft.about.promiseDescription, (value) => update('about','promiseDescription',value,true))}</div><p className="sm:col-span-2 text-[10px] text-[#8a766c]">Brand philosophy and the timeline are managed in Story Builder. These fields update the About page header and promise panel.</p></div>}
        {area === 'contact' && <div className="grid gap-4 sm:grid-cols-2">{field('Eyebrow', draft.contact.eyebrow, (value) => update('contact','eyebrow',value))}{field('Page title', draft.contact.title, (value) => update('contact','title',value))}<div className="sm:col-span-2">{field('Description', draft.contact.description, (value) => update('contact','description',value,true))}</div>{field('Public email', draft.contact.email, (value) => update('contact','email',value))}{field('Opening hours', draft.contact.hours, (value) => update('contact','hours',value))}{field('Location', draft.contact.location, (value) => update('contact','location',value))}{field('Concierge panel title', draft.contact.conciergeTitle, (value) => update('contact','conciergeTitle',value))}<div className="sm:col-span-2">{field('Concierge description', draft.contact.conciergeDescription, (value) => update('contact','conciergeDescription',value,true))}</div></div>}
        {policy && <div className="space-y-4">{field('Policy title', policy.title, (value) => updatePolicy('title',value))}{field('Summary', policy.summary, (value) => updatePolicy('summary',value,true))}{field('Policy body', policy.body, (value) => updatePolicy('body',value,true), true, 'Use a blank line between paragraphs or sections.') }<p className="text-[10px] text-[#8a766c]">The storefront presents each paragraph from this text as a separate block.</p></div>}
        {area === 'footer' && <div className="grid gap-4 sm:grid-cols-2">{field('Brand description', draft.footer.description, (value) => update('footer','description',value,true))}{field('Public contact email', draft.footer.email, (value) => update('footer','email',value))}{field('Newsletter heading', draft.footer.newsletterTitle, (value) => update('footer','newsletterTitle',value))}{field('Newsletter description', draft.footer.newsletterDescription, (value) => update('footer','newsletterDescription',value,true))}<p className="sm:col-span-2 text-[10px] text-[#8a766c]">This edits the footer copy. Newsletter subscriber capture is not connected to a persistence service.</p></div>}
        {area === 'seo' && <div className="grid gap-4 sm:grid-cols-2">{field('Page title', draft.seo.title, (value) => update('seo','title',value))}{field('Search keywords', draft.seo.keywords, (value) => update('seo','keywords',value))}<div className="sm:col-span-2">{field('Search description', draft.seo.description, (value) => update('seo','description',value,true))}</div>{field('Open Graph title', draft.seo.ogTitle, (value) => update('seo','ogTitle',value))}<div>{field('Open Graph description', draft.seo.ogDescription, (value) => update('seo','ogDescription',value,true))}</div><p className="sm:col-span-2 text-[10px] text-[#8a766c]">These values update document title and description tags when published.</p></div>}
        {area === 'faq' && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{field('Eyebrow', draft.faq.eyebrow, (value) => update('faq','eyebrow',value))}{field('Page title', draft.faq.title, (value) => update('faq','title',value))}<div className="sm:col-span-2">{field('Introduction', draft.faq.description, (value) => update('faq','description',value,true))}</div></div><div className="flex items-center justify-between border-t border-[#f0e8e1] pt-4"><h3 className="font-serif text-lg text-[#3d1821]">Questions & answers</h3><button type="button" onClick={() => setDraft((current) => current ? ({ ...current, faq: { ...current.faq, items: [...current.faq.items, { category: '', question: '', answer: '' }] } }) : current)} className="inline-flex items-center gap-1 rounded-full border border-[#e8ddd5] px-3 py-2 text-[10px] font-semibold text-[#5b112b]"><Plus className="h-3.5 w-3.5"/>Add question</button></div><div className="space-y-3">{draft.faq.items.map((item, index) => <article key={index} className="grid gap-3 rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-3 sm:grid-cols-2"><div>{field('Category',item.category,(value) => setDraft((current) => current ? ({ ...current, faq: { ...current.faq, items: current.faq.items.map((entry,idx) => idx === index ? {...entry,category:value} : entry) } }) : current))}</div><div>{field('Question',item.question,(value) => setDraft((current) => current ? ({ ...current, faq: { ...current.faq, items: current.faq.items.map((entry,idx) => idx === index ? {...entry,question:value} : entry) } }) : current))}</div><div className="sm:col-span-2">{field('Answer',item.answer,(value) => setDraft((current) => current ? ({ ...current, faq: { ...current.faq, items: current.faq.items.map((entry,idx) => idx === index ? {...entry,answer:value} : entry) } }) : current),true)}</div><button type="button" onClick={() => setDraft((current) => current ? ({ ...current, faq: { ...current.faq, items: current.faq.items.filter((_,idx) => idx !== index) } }) : current)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700"><Trash2 className="h-3 w-3"/>Remove question</button></article>)}{draft.faq.items.length === 0 && <p className="rounded-xl border border-dashed border-[#ddd1c7] p-6 text-center text-xs text-[#8d7c72]">No custom FAQs yet. The storefront keeps its built-in answers until you publish entries.</p>}</div></div>}
      </section>
    </div>}
  </main>;
};
