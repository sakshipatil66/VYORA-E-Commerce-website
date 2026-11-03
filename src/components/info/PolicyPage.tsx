import React from 'react';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  MapPin,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatEstimatedDate, formatLocationLabel } from '../../data/locations';

export type PolicyType = 'shipping' | 'returns' | 'privacy' | 'terms';

interface PolicySection {
  heading: string;
  paragraphs: string[];
}

interface PolicyDocument {
  eyebrow: string;
  title: string;
  updatedAt: string;
  summary: string;
  sections: PolicySection[];
}

const POLICY_DOCUMENTS: Record<PolicyType, PolicyDocument> = {
  shipping: {
    eyebrow: 'Logistics & Insured Transit',
    title: 'Shipping and Delivery Policy',
    updatedAt: 'Effective April 2026',
    summary:
      'VYORA coordinates insured express air and surface dispatch from our central operations hub in Pune, Maharashtra, India and certified partner ateliers across India.',
    sections: [
      {
        heading: '01. Default Dispatch & Delivery Coverage',
        paragraphs: [
          'Our default marketplace shopping and priority dispatch hub is Pune, Maharashtra, India. Patrons may switch their preferred Indian city and state anytime using the Location Selector in the header, product detail page, shopping bag, or checkout.',
          'Every creation is quality-verified, sealed in tamper-evident archival packaging, and insured for 100% of invoice value until doorstep handover.'
        ]
      },
      {
        heading: '02. Shipping Charges & Complimentary Threshold',
        paragraphs: [
          'Orders valued at ₹999 or above qualify for complimentary insured shipping across serviceable Indian cities, including Pune, Maharashtra, India.',
          'Orders below ₹999 carry a flat ₹99 handling and insured courier fee displayed transparently prior to payment.'
        ]
      },
      {
        heading: '03. Estimated Transit Timelines',
        paragraphs: [
          'Priority deliveries within Pune, Maharashtra, India typically arrive within 1–2 business days for ready-to-ship catalog items.',
          'Major metro destinations (Mumbai, Bengaluru, New Delhi, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur) typically arrive within 2–4 business days via Blue Dart Priority Air or Delhivery Express.',
          'Handloom couture or custom-sized creations requiring finishing receive live milestone updates on the My Orders & Order Tracking page.'
        ]
      },
      {
        heading: '04. Cash on Delivery & Package Inspection',
        paragraphs: [
          'Cash on Delivery (COD) is supported on eligible orders across serviceable locations. If an outer parcel appears tampered with at the time of delivery, please decline handover and notify our Patron Concierge via the Contact Us page.'
        ]
      }
    ]
  },
  returns: {
    eyebrow: 'Patron Assurance & Exchanges',
    title: 'Returns and Refunds Policy',
    updatedAt: 'Effective April 2026',
    summary:
      'Shop across all 12 VYORA marketplace categories with confidence. Eligible items are backed by our 7-Day Effortless Doorstep Return & Exchange promise.',
    sections: [
      {
        heading: '01. 7-Day Return & Size Exchange Window',
        paragraphs: [
          'Most fashion, footwear, bags, home décor, accessories, stationery, and unopened lifestyle creations are eligible for return or size exchange within 7 calendar days from the date of delivery.',
          'Items must remain unused, unwashed, and accompanied by original Silk Mark / BIS 925 certificates, artisan tags, dust bags, and protective boxes.'
        ]
      },
      {
        heading: '02. Category-Specific Hygiene & Warranty Guidelines',
        paragraphs: [
          'Beauty, Ayurvedic skincare, attars, extraits de parfum, and gourmet pantry items are eligible for replacement or full refund if delivered damaged, leaked, or incorrect, provided original seals remain intact.',
          'Electronics, audio speakers, and smart wearables carry brand warranty coverage and 7-day replacement for verified manufacturing defects.'
        ]
      },
      {
        heading: '03. Complimentary Reverse Pickup',
        paragraphs: [
          'Once a return request is initiated from My Orders or through our Concierge Desk, we arrange complimentary reverse pickup across Pune, Maharashtra, India and serviceable Indian cities within 24–48 hours.'
        ]
      },
      {
        heading: '04. Refund Processing Timelines',
        paragraphs: [
          'Following quality verification at our returns center in Pune, Maharashtra, India, refunds for UPI, RuPay, Visa, Mastercard, and NetBanking orders are initiated within 48 business hours directly to the original payment source.',
          'For Cash on Delivery orders, patrons may choose instant bank transfer (NEFT/UPI) or VYORA Club store credit.'
        ]
      }
    ]
  },
  privacy: {
    eyebrow: 'Data Protection & Trust',
    title: 'Privacy Policy',
    updatedAt: 'Effective April 2026',
    summary:
      'VYORA respects your privacy and safeguards personal information collected while browsing, searching, saving wishlists, or completing orders from Pune, Maharashtra, India and across India.',
    sections: [
      {
        heading: '01. Information We Collect',
        paragraphs: [
          'We process only the details you voluntarily provide to fulfill your shopping experience — including your name, email address, selected city/state location (defaulting to Pune, Maharashtra, India), saved shipping details, wishlist items, and order history.',
          'We never use fake GPS tracking or access device location sensors without explicit user input; your delivery city is controlled solely through our transparent Location Selector.'
        ]
      },
      {
        heading: '02. How Your Information Is Used',
        paragraphs: [
          'Your details are used strictly to calculate accurate delivery timelines, process orders, dispatch tracking updates, apply Vyora Club rewards, and respond to concierge inquiries.',
          'Newsletter subscribers receive curated seasonal previews and privilege codes and may opt out at any time.'
        ]
      },
      {
        heading: '03. Payment Security & Encryption',
        paragraphs: [
          'All checkout sessions use 256-bit TLS encryption. Card numbers, UPI PINs, and NetBanking credentials are processed through PCI-DSS compliant payment gateways and are never stored in plain text by VYORA.'
        ]
      },
      {
        heading: '04. Your Privacy Choices & Contact',
        paragraphs: [
          'You can review, edit, or remove saved profile preferences and addresses directly in your Account Profile, or reach our privacy team at concierge@vyora.in (Pune, Maharashtra, India).'
        ]
      }
    ]
  },
  terms: {
    eyebrow: 'Marketplace Governance',
    title: 'Terms and Conditions',
    updatedAt: 'Effective April 2026',
    summary:
      'These Terms and Conditions govern your access to and purchases on the VYORA multi-category marketplace operated from Pune, Maharashtra, India.',
    sections: [
      {
        heading: '01. Authentic Multi-Category Marketplace',
        paragraphs: [
          'VYORA curates authentic creations across 12 departments — Fashion, Fine Jewellery, Beauty & Skincare, Electronics, Footwear, Home Décor, Bags, Toys, Books & Stationery, Mindful Fitness, Gourmet Pantry, and Royal Gifting.',
          'Handwoven textiles, natural gemstones, carved wood, and brassware exhibit subtle artisanal variations that are hallmarks of genuine handcrafted work rather than defects.'
        ]
      },
      {
        heading: '02. Pricing, Taxes & Promotional Codes',
        paragraphs: [
          'All product prices on VYORA are displayed in Indian Rupees (₹ INR) inclusive of applicable Goods and Services Tax (GST).',
          'Promotional coupons (such as FIRST500 or ROYAL1000) apply subject to minimum cart thresholds displayed on the Offers & Coupons page and cannot be combined with duplicate voucher codes on a single order.'
        ]
      },
      {
        heading: '03. Order Acceptance & Cancellation',
        paragraphs: [
          'An order confirmation ID is generated immediately upon checkout completion. Patrons may request order cancellation prior to dispatch through the Concierge Desk.',
          'In the rare event an artisan batch fails pre-dispatch inspection, VYORA will notify you promptly and issue a 100% refund.'
        ]
      },
      {
        heading: '04. Governing Law & Jurisdiction',
        paragraphs: [
          'These terms are governed by the laws of India, with primary marketplace administration in Pune, Maharashtra, India.'
        ]
      }
    ]
  }
};

const POLICY_TABS: { id: PolicyType; label: string; icon: React.ReactNode }[] = [
  { id: 'shipping', label: 'Shipping & Delivery', icon: <Truck className="w-3.5 h-3.5" /> },
  { id: 'returns', label: 'Returns & Refunds', icon: <RotateCcw className="w-3.5 h-3.5" /> },
  { id: 'privacy', label: 'Privacy Policy', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'terms', label: 'Terms & Conditions', icon: <FileText className="w-3.5 h-3.5" /> }
];

export const PolicyPage: React.FC<{ policyType: PolicyType }> = ({ policyType }) => {
  const { setActivePage, openCategoryPage, selectedLocation, requestLocationPicker } = useStore();
  const doc = POLICY_DOCUMENTS[policyType] || POLICY_DOCUMENTS.shipping;
  const locationLabel = formatLocationLabel(selectedLocation);
  const estDate = formatEstimatedDate(selectedLocation.expressDays);

  const switchPolicy = (next: PolicyType) => {
    setActivePage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="vyora-container vyora-page max-w-5xl space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 typo-meta text-neutral-500">
        <button
          type="button"
          onClick={() => setActivePage('home')}
          className="hover:text-[#7A1438] transition-colors cursor-pointer"
        >
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span className="text-[#7A1438] font-semibold">{doc.title}</span>
      </nav>

      {/* Policy Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#E6DBD1] pb-4">
        {POLICY_TABS.map((tab) => {
          const isCurrent = tab.id === policyType;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchPolicy(tab.id)}
              className={`min-h-10 inline-flex items-center gap-2 py-2 px-4 rounded-full typo-btn-sm whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-[#4A0E17] text-white shadow-2xs'
                  : 'bg-white hover:bg-[#F3ECE7] text-neutral-700 border border-[#E5D9CE]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#26060D] via-[#4A0E17] to-[#65122F] text-white p-6 sm:p-10 border border-[#D4AF37]/30 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 typo-eyebrow text-[#D4AF37]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {doc.eyebrow}
          </span>
          <span className="typo-meta normal-case tracking-normal text-rose-200/80">{doc.updatedAt}</span>
        </div>

        <h1 className="typo-h1 text-white">
          {doc.title}
        </h1>
        <p className="typo-body text-rose-100/90 max-w-3xl">
          {doc.summary}
        </p>

        {/* Active Pune / Selected Location Bar */}
        <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 typo-body-sm">
          <div className="flex items-start sm:items-center gap-2 text-rose-100">
            <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Active Delivery Location: <strong className="text-white">{locationLabel}</strong> · Est. Priority Arrival by{' '}
              <strong className="text-[#D4AF37]">{estDate}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={requestLocationPicker}
            className="min-h-9 py-1.5 px-4 rounded-full bg-white/15 hover:bg-white/25 text-white typo-btn-sm transition-colors cursor-pointer"
          >
            Change Location
          </button>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="bg-white rounded-2xl border border-[#EBE4DD] p-6 sm:p-10 shadow-2xs divide-y divide-[#F1E8E0]">
        {doc.sections.map((sec, idx) => (
          <div key={sec.heading} className={idx === 0 ? 'pb-6 space-y-3' : 'py-6 space-y-3'}>
            <h2 className="typo-h3 text-neutral-900">
              {sec.heading}
            </h2>
            {sec.paragraphs.map((p, pIdx) => (
              <p key={pIdx} className="typo-body text-neutral-600">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* Helpful Footer CTA */}
      <div className="rounded-2xl bg-[#F6EFE9] border border-[#E5D9CE] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="typo-h3 text-neutral-900">
            Have a question for our Pune Concierge Desk?
          </h3>
          <p className="typo-body-sm text-neutral-600">
            Reach out to VYORA Customer Support in Pune, Maharashtra, India or browse our interactive FAQ guide.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActivePage('contact');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="min-h-11 py-2.5 px-5 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn transition-colors cursor-pointer"
          >
            Contact Support
          </button>
          <button
            type="button"
            onClick={() => openCategoryPage('all', null)}
            className="min-h-11 inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full bg-white hover:bg-[#FAF2EB] text-[#4A0E17] border border-[#D8C7B8] typo-btn transition-colors cursor-pointer"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
