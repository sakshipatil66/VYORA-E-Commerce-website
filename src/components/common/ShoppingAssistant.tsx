import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { answerShoppingQuery } from '../../lib/catalogIntelligence';
import { ProductImage } from './ProductImage';

interface GuideMessage {
  id: string;
  role: 'assistant' | 'customer';
  text: string;
  productIds: string[];
}

const starterMessage: GuideMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Tell me what you are shopping for, set a budget, or ask for ideas based on your recent activity.',
  productIds: []
};

const quickPrompts = [
  'Find earrings under ₹5,000',
  'Recommend something like my recent views',
  'Compare Banarasi silk and Polki jewellery'
];

export const ShoppingAssistant: React.FC = () => {
  const {
    products,
    orders,
    recentlyViewedIds,
    wishlist,
    openProductDetail
  } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<GuideMessage[]>([starterMessage]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageSequence = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const sendQuery = (value: string) => {
    const prompt = value.trim().slice(0, 300);
    if (!prompt) return;
    const answer = answerShoppingQuery(prompt, products, {
      recentlyViewedIds,
      wishlistIds: wishlist,
      orders
    });
    const suffix = messageSequence.current++;
    const customerMessage: GuideMessage = {
      id: `customer-${suffix}`,
      role: 'customer',
      text: prompt,
      productIds: []
    };
    const guideMessage: GuideMessage = {
      id: `guide-${suffix}`,
      role: 'assistant',
      text: answer.message,
      productIds: answer.products.map((product) => product.id)
    };
    setMessages((current) => [
      ...current,
      customerMessage,
      guideMessage
    ].slice(-24));
    setQuery('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendQuery(query);
  };

  const resetConversation = () => setMessages([starterMessage]);

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          role="dialog"
          aria-label="VYORA Smart Guide"
          className="flex h-[min(70vh,38rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#d8c8b2] bg-[#fffdfa] shadow-[0_24px_70px_rgba(47,13,23,.26)]"
        >
          <header className="flex items-start justify-between gap-3 bg-[#4A0E17] px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 rounded-full border border-[#D4AF37]/60 bg-white/10 p-2 text-[#E7C879]"><Sparkles className="h-4 w-4"/></span>
              <div className="min-w-0">
                <h2 className="font-serif text-base">VYORA Smart Guide</h2>
                <p className="mt-0.5 text-[10px] leading-4 text-white/75">Rule-based catalogue matching · no generative AI connected</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={resetConversation} aria-label="Clear conversation" title="Clear conversation" className="rounded-full p-2 text-white/75 hover:bg-white/10 hover:text-white"><RotateCcw className="h-4 w-4"/></button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close shopping guide" className="rounded-full p-2 text-white/75 hover:bg-white/10 hover:text-white"><X className="h-4 w-4"/></button>
            </div>
          </header>

          <div ref={messageListRef} role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#fbf8f4] p-3.5">
            {messages.map((message) => (
              <article key={message.id} className={`max-w-[94%] ${message.role === 'customer' ? 'ml-auto' : 'mr-auto'}`}>
                <p className={`rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${message.role === 'customer' ? 'rounded-br-sm bg-[#5B112B] text-white' : 'rounded-bl-sm border border-[#eadfd5] bg-white text-[#4e3c36]'}`}>
                  {message.text}
                </p>
                {message.productIds.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.productIds.map((id) => products.find((product) => product.id === id)).filter((product) => product && product.isActive !== false).map((product) => (
                      <article key={product!.id} className="flex items-center gap-2.5 rounded-xl border border-[#eadfd5] bg-white p-2">
                        <ProductImage src={product!.primaryImage} alt={product!.name} category={product!.category} compact className="h-14 w-14 shrink-0 rounded-lg object-cover"/>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-[#40252a]">{product!.name}</p>
                          <p className="mt-0.5 truncate text-[9px] text-[#87766e]">{product!.brand} · {product!.category}</p>
                          <p className="mt-1 text-[11px] font-bold tabular-nums text-[#5B112B]">₹{product!.discountPrice.toLocaleString('en-IN')} <span className="font-normal text-[#927f75]">· {Number(product!.rating || 0).toFixed(1)} ★</span></p>
                        </div>
                        <button type="button" onClick={() => { setIsOpen(false); openProductDetail(product!.id); }} aria-label={`View ${product!.name}`} className="shrink-0 rounded-full border border-[#e7d8c3] p-2 text-[#7A1438] hover:bg-[#f8f0e7]"><ArrowUpRight className="h-4 w-4"/></button>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-[#eee5dc] bg-white px-3 py-2.5">
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => sendQuery(prompt)} className="rounded-full border border-[#eadfd5] px-2.5 py-1.5 text-[9px] leading-3 text-[#68484a] transition-colors hover:border-[#b9944b] hover:bg-[#fbf7ef]">{prompt}</button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#eadfd5] bg-white p-3">
            <label className="sr-only" htmlFor="vyora-guide-query">Ask the VYORA catalogue guide</label>
            <input id="vyora-guide-query" ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={300} placeholder="Ask about a product or budget…" className="min-w-0 flex-1 rounded-full border border-[#e7dcd2] bg-[#fbf8f5] px-3.5 py-2.5 text-xs text-[#36262a] outline-none placeholder:text-[#998b83] focus:border-[#9b7541]"/>
            <button type="submit" disabled={!query.trim()} aria-label="Send question" className="rounded-full bg-[#5B112B] p-2.5 text-white transition-colors hover:bg-[#741a38] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4"/></button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={isOpen ? 'Close VYORA Smart Guide' : 'Open VYORA Smart Guide'} className="flex items-center gap-2 rounded-full border border-[#d7b968] bg-[#4A0E17] px-4 py-3 text-xs font-semibold text-white shadow-[0_12px_32px_rgba(61,14,27,.25)] transition-transform hover:-translate-y-0.5 hover:bg-[#64172f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]">
        {isOpen ? <X className="h-4 w-4"/> : <MessageCircle className="h-4 w-4 text-[#E7C879]"/>}
        <span>{isOpen ? 'Close guide' : 'Ask VYORA'}</span>
      </button>
    </div>
  );
};
