import React, { useState } from 'react';
import { Mail, MapPin, Clock, Send, CheckCircle2, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatLocationLabel } from '../../data/locations';

export const ContactPage: React.FC = () => {
  const { addToast, selectedLocation, requestLocationPicker } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Product / Order Assistance');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setIsSent(true);
    addToast('Your inquiry has been submitted to the Vyora Concierge.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
          Atelier Concierge
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 mt-1">
          We Are Here to Assist You
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-2">
          From bespoke multi-category consultations to consignment dispatch updates from Pune, Maharashtra, India, our concierge team is at your service.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Information (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EBE4DD] shadow-2xs space-y-6">
            <h3 className="font-serif text-lg font-bold text-neutral-900">
              Concierge & Location Details
            </h3>

            <div className="space-y-5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Primary Marketplace Location</h4>
                  <p className="text-[#4A0E17] font-semibold mt-0.5">
                    Pune, Maharashtra, India
                  </p>
                  <p className="text-neutral-500 mt-0.5 leading-relaxed">
                    Default shopping & priority dispatch center serving patrons across India.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Your Active Delivery Location</h4>
                  <p className="text-neutral-700 font-medium mt-0.5">
                    {formatLocationLabel(selectedLocation)}
                  </p>
                  <button
                    type="button"
                    onClick={requestLocationPicker}
                    className="text-[11px] font-semibold text-[#7A1438] hover:underline mt-1 cursor-pointer"
                  >
                    Change Delivery Location →
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Patron Care Email</h4>
                  <p className="text-neutral-500 mt-0.5">
                    Order assistance, returns & wedding collaborations
                  </p>
                  <p className="text-[#5B112B] font-mono font-semibold mt-1">concierge@vyora.in</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Concierge Hours</h4>
                  <p className="text-neutral-600 mt-0.5">
                    Monday – Sunday · 9:00 AM to 9:00 PM IST
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#4A0E17] text-white p-6 rounded-2xl border border-[#7A1438] space-y-2 text-xs">
            <h4 className="font-serif text-base font-bold text-[#D4AF37]">
              Bridal, Festive & Corporate Gifting Concierge
            </h4>
            <p className="text-rose-100/80 leading-relaxed font-light">
              Planning bespoke wedding favors, handloom couture ensembles, or luxury corporate hampers? Submit an inquiry and our curation desk in Pune, Maharashtra, India will prepare a tailored proposal.
            </p>
          </div>
        </div>

        {/* Message Form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] shadow-2xs">
          {isSent ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-neutral-900">Inquiry Received</h3>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                Thank you, {name}. A member of our atelier team in Pune, Maharashtra, India will respond to {email} within 2 business hours.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="py-2 px-5 text-xs font-semibold text-[#5B112B] bg-[#FAF2EB] rounded-md cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-neutral-900 mb-2">
                Send an Inquiry to the Atelier
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Meera Kapadia"
                    className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="meera@example.com"
                    className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Inquiry Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                >
                  <option value="Product / Order Assistance">Product / Order Assistance</option>
                  <option value="Bridal & Custom Sizing Consultation">
                    Bridal & Custom Sizing Consultation
                  </option>
                  <option value="Artisan Guild Sourcing Partnership">
                    Artisan Guild Sourcing Partnership
                  </option>
                  <option value="Returns & Exchanges">Returns & Exchanges</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Your Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can assist you..."
                  className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
