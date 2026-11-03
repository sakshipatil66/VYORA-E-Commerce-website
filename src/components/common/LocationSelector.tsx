import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Check, Truck, Search, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  SELECTABLE_INDIAN_LOCATIONS,
  DeliveryLocation,
  formatLocationLabel,
  formatEstimatedDate
} from '../../data/locations';

export const LocationSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { selectedLocation, setSelectedLocation, locationPickerSignal, addToast } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locationPickerSignal > 0 && !compact) {
      setIsOpen(true);
    }
  }, [locationPickerSignal, compact]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const filteredLocations = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return SELECTABLE_INDIAN_LOCATIONS;
    return SELECTABLE_INDIAN_LOCATIONS.filter((loc) =>
      formatLocationLabel(loc).toLowerCase().includes(q)
    );
  }, [filterQuery]);

  const handleChooseLocation = (loc: DeliveryLocation) => {
    setSelectedLocation(loc);
    addToast(`Shopping location set to ${formatLocationLabel(loc)}`);
    setFilterQuery('');
    setIsOpen(false);
  };

  const activeLabel = formatLocationLabel(selectedLocation);
  const estDate = formatEstimatedDate(selectedLocation.expressDays);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Change delivery location. Currently ${activeLabel}`}
        className={`group flex items-center gap-2 text-left rounded-lg border border-[#E5D9CE] bg-white/95 hover:bg-[#FAF3EC] hover:border-[#7A1438]/50 transition-all min-h-10 cursor-pointer ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5'
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center shrink-0">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="typo-meta text-[#8C6D58] leading-none font-medium flex items-center gap-1">
            <span>Location</span>
            <span className="text-emerald-700 font-semibold hidden sm:inline">
              · {selectedLocation.expressDays === 1 ? 'Est. Tomorrow' : `By ${estDate}`}
            </span>
          </p>
          <p className="typo-btn-sm font-bold text-[#380811] leading-tight mt-0.5 flex items-center gap-1 truncate max-w-[165px] sm:max-w-[215px]">
            <span className="truncate">{activeLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#7A1438] shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </p>
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed inset-x-3 top-24 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[390px] z-50 bg-white rounded-2xl shadow-2xl border border-[#E5D9CE] overflow-hidden animate-in fade-in duration-150">
          {/* Popover Header */}
          <div className="bg-gradient-to-r from-[#380811] to-[#5B112B] text-white px-4 py-3.5 flex items-start justify-between gap-3">
            <div>
              <p className="typo-eyebrow text-[#D4AF37]">
                Shopping & Delivery Location
              </p>
              <h3 className="typo-h3 text-white mt-0.5">
                Select Your Location
              </h3>
              <p className="typo-meta text-rose-100/85 mt-0.5">
                Active: {activeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close location selector"
              className="text-rose-200 hover:text-white p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3.5 max-h-[72vh] overflow-y-auto">
            {/* Search / Filter City */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#7A1438] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter city or state (e.g., Pune, Maharashtra)..."
                aria-label="Filter delivery cities"
                className="typo-input pl-9 pr-8"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear city filter"
                  className="absolute right-2.5 top-2.5 p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Locations List */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredLocations.length === 0 ? (
                <p className="typo-body-sm text-neutral-500 text-center py-4">
                  No configured city matches “{filterQuery}”. Try Pune, Mumbai, Bengaluru, or New Delhi.
                </p>
              ) : (
                filteredLocations.map((loc) => {
                  const label = formatLocationLabel(loc);
                  const active = selectedLocation.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleChooseLocation(loc)}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'border-[#7A1438] bg-[#FAF2EB]'
                          : 'border-[#EBE4DD] hover:border-[#D4AF37] hover:bg-[#FAF7F5]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="typo-body-sm font-semibold text-neutral-900 truncate">
                            {label}
                          </span>
                          {loc.isPune && (
                            <span className="typo-badge text-[#7A1438] bg-white px-2 py-0.5 rounded border border-[#E5D9CE]">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="typo-meta text-emerald-800 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {loc.expressLabel} · Est. {formatEstimatedDate(loc.expressDays)}
                          </span>
                        </p>
                      </div>
                      {active && <Check className="w-4 h-4 text-[#7A1438] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <p className="typo-meta text-neutral-500 pt-2 border-t border-[#F1E8E0]">
              Default shopping & delivery location: Pune, Maharashtra, India. Delivery estimates update automatically when you switch your city.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
