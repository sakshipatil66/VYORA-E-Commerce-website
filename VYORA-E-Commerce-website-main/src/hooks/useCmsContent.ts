import { useEffect, useState } from 'react';
import { api, StoreCmsContent } from '../lib/api';

export const useCmsContent = () => {
  const [content, setContent] = useState<StoreCmsContent | null>(null);

  useEffect(() => {
    let active = true;

    api.cmsContent()
      .then((response) => {
        if (!active) return;

        setContent(response.content);

        const seo = response.content.seo;
        if (seo?.title) document.title = seo.title;

        const setMeta = (selector: string, attribute: string, value?: string) => {
          if (!value) return;
          let element = document.querySelector<HTMLMetaElement>(selector);
          if (!element) {
            element = document.createElement('meta');
            if (attribute === 'name') element.name = selector.match(/name="([^"]+)"/)?.[1] || '';
            else element.setAttribute(attribute, selector.match(/property="([^"]+)"/)?.[1] || '');
            document.head.appendChild(element);
          }
          element.content = value;
        };

        setMeta('meta[name="description"]', 'name', seo?.description);
        setMeta('meta[name="keywords"]', 'name', seo?.keywords);
        setMeta('meta[property="og:title"]', 'property', seo?.ogTitle);
        setMeta('meta[property="og:description"]', 'property', seo?.ogDescription);
      })
      .catch((error) => {
        console.error('Could not load VYORA CMS content:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  return content;
};
