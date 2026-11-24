import React, { useEffect, useState } from 'react';
import { api, StoreCmsContent } from '../lib/api';

export const useCmsContent = () => {
  const [content, setContent] = useState<StoreCmsContent | null>(null);
  useEffect(() => {
    let active = true;
    api.cmsContent().then(({ content: saved }) => { if (active) setContent(saved); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return content;
};

export const CmsMetadata: React.FC = () => {
  const content = useCmsContent();
  useEffect(() => {
    if (!content) return;
    const seo = content.seo;
    if (seo.title.trim()) document.title = seo.title.trim();
    const setMeta = (key: 'name' | 'property', name: string, value: string) => {
      if (!value.trim()) return;
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${name}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(key, name); document.head.appendChild(tag); }
      tag.content = value.trim();
    };
    setMeta('name', 'description', seo.description);
    setMeta('name', 'keywords', seo.keywords);
    setMeta('property', 'og:title', seo.ogTitle || seo.title);
    setMeta('property', 'og:description', seo.ogDescription || seo.description);
  }, [content]);
  return null;
};
