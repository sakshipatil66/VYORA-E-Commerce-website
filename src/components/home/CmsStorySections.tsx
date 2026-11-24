import React, { useEffect, useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import { api, StorefrontStorySection } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';

export const CmsStorySections: React.FC = () => {
  const [sections, setSections] = useState<StorefrontStorySection[]>([]);
  const { setActivePage, setSelectedCategory, setSelectedSubCategory } = useStore();

  useEffect(() => {
    let active = true;
    api.cmsContent().then(({ content }) => {
      if (active) setSections((content.storySections || []).filter((section) => section.active));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const visitCategory = (category: string) => {
    setSelectedCategory(category as CategoryId);
    setSelectedSubCategory(null);
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!sections.length) return null;

  return <div className="space-y-8 py-8 sm:space-y-12 sm:py-12">
    {sections.map((section) => <section key={section.id} className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {section.kind === 'testimonial' ? <figure className="relative overflow-hidden rounded-2xl border border-[#e9dfd6] bg-[#fbf7f2] px-6 py-10 text-center sm:px-12 sm:py-14"><Quote className="mx-auto h-6 w-6 text-[#bd9d63]"/><p className="mx-auto mt-4 max-w-3xl font-serif text-xl leading-relaxed text-[#401823] sm:text-3xl">“{section.description}”</p><figcaption className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8d6d4c]">{section.eyebrow || section.heading}</figcaption></figure> : <div className={`grid overflow-hidden rounded-2xl border border-[#e9dfd6] bg-white shadow-[0_8px_24px_rgba(47,20,20,.04)] ${section.image ? 'lg:grid-cols-2' : ''}`}>
        {section.image && <img src={section.image} alt={section.imageAlt || section.heading} loading="lazy" className="h-56 w-full object-cover sm:h-72 lg:h-full lg:min-h-[300px]"/>}
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          {section.eyebrow && <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#a28351]">{section.eyebrow}</p>}
          <h2 className="mt-2 font-serif text-2xl leading-tight text-[#3e171e] sm:text-3xl">{section.heading}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#76665f]">{section.description}</p>
          {section.ctaLabel && <button type="button" onClick={() => visitCategory(section.category || 'all')} className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#5b112b] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#42101f]">{section.ctaLabel}<ArrowRight className="h-3.5 w-3.5"/></button>}
        </div>
      </div>}
    </section>)}
  </div>;
};
