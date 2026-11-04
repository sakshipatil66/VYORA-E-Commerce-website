import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'Authenticity & Craft',
    question: 'How do I know my Banarasi Saree or Polki Jewellery is 100% authentic?',
    answer: 'Every pure silk creation comes accompanied by an authorized Silk Mark of India certificate tag. All our fine silver and gold jewelry is hallmarked according to Bureau of Indian Standards (BIS) specifications, stamped with 925 or 22K hallmarks.'
  },
  {
    category: 'Shipping & Transit',
    question: 'What are your delivery timelines for Pune, Maharashtra, India and other cities?',
    answer: 'Orders for our default location in Pune, Maharashtra, India qualify for Priority Pune Dispatch (1–2 business days). Major metros across India (Mumbai, Bengaluru, New Delhi, Hyderabad, Chennai, Kolkata, Jaipur, Ahmedabad, Kochi) receive insured deliveries within 2 to 4 business days.'
  },
  {
    category: 'Payments & COD',
    question: 'How does Cash on Delivery (COD) work on high-value orders?',
    answer: 'We provide Cash on Delivery for orders across India up to ₹25,000. For orders above ₹999, there is zero COD handling charge. You can pay cash or scan the courier agent’s dynamic UPI QR code right at your doorstep.'
  },
  {
    category: 'Returns & Exchanges',
    question: 'What is your 7-Day return policy and how does doorstep reverse pickup work?',
    answer: 'If you are unsatisfied with sizing, color, or silhouette, initiate a return within 7 days of delivery. Blue Dart will conduct a free doorstep reverse pickup from your home. Once inspected, full refunds are issued to your original payment mode or UPI within 24 hours.'
  },
  {
    category: 'Custom Bridal Orders',
    question: 'Can I order custom blouse stitching or customized lehenga hemlines?',
    answer: 'Yes! Select "Custom Fit" on eligible bridal lehengas and sherwanis or contact our WhatsApp Concierge. Our in-house master tailors will take your precise measurements over video consultation and stitch to your exact specifications.'
  }
];

export const FAQPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
          <HelpCircle className="w-4 h-4" />
          <span>Knowledge Sanctuary</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-neutral-900 mt-1">
          Frequently Answered Questions
        </h1>
        <p className="text-xs text-neutral-500 mt-2">
          Everything you need to know about our artisan guilds, purity stamps, delivery, and payments.
        </p>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-[#EBE4DD] overflow-hidden shadow-2xs transition-all"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-[#FAF7F5] transition-colors"
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A1438] block mb-1">
                    {faq.category}
                  </span>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-neutral-900">
                    {faq.question}
                  </h3>
                </div>
                <div className="p-1 rounded-full bg-[#FAF7F5] text-neutral-500 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed font-light border-t border-[#F3ECE7]">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
