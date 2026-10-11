import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Flame, Plus, Check, Sparkles } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { StepType } from '../types/recipe-form';

interface StepAutocompleteInputProps {
  value: string; // The step title text
  stepTypeId?: string; // The selected step type ID
  stepTypes: StepType[];
  onChange: (title: string, stepTypeId: string, selectedType?: StepType | null) => void;
  placeholder?: string;
  className?: string;
}

export const StepAutocompleteInput = React.memo(function StepAutocompleteInput({
  value,
  stepTypeId,
  stepTypes,
  onChange,
  placeholder,
  className,
}: StepAutocompleteInputProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered matching step types based on user typed value
  const query = value.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return stepTypes;
    return stepTypes.filter((st) => {
      const th = (st.nameTh || '').toLowerCase();
      const en = (st.nameEn || '').toLowerCase();
      const code = (st.code || '').toLowerCase();
      return th.includes(query) || en.includes(query) || code.includes(query);
    });
  }, [stepTypes, query]);

  // Exact match check
  const exactMatch = useMemo(() => {
    if (!query) return null;
    return stepTypes.find(
      (st) =>
        (st.nameTh || '').trim().toLowerCase() === query ||
        (st.nameEn || '').trim().toLowerCase() === query,
    );
  }, [stepTypes, query]);

  const canCreateNew = query.length > 0 && !exactMatch;

  // Total selectable items (filtered items + optional "create new" action)
  const totalOptions = filtered.length + (canCreateNew ? 1 : 0);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const handleSelectExisting = useCallback(
    (st: StepType) => {
      const name = i18n.language === 'th' ? st.nameTh || st.nameEn : st.nameEn || st.nameTh;
      onChange(name, st.id, st);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [i18n.language, onChange],
  );

  const handleSelectNew = useCallback(
    (customTitle: string) => {
      onChange(customTitle.trim(), '', null);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalOptions ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelectExisting(filtered[highlightedIndex]!);
      } else if (canCreateNew && highlightedIndex === filtered.length) {
        handleSelectNew(value);
      } else if (canCreateNew) {
        handleSelectNew(value);
      } else if (filtered.length > 0) {
        handleSelectExisting(filtered[0]!);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const nextVal = e.target.value;
            // Check if user typed an exact existing match
            const match = stepTypes.find(
              (st) =>
                (st.nameTh || '').trim().toLowerCase() === nextVal.trim().toLowerCase() ||
                (st.nameEn || '').trim().toLowerCase() === nextVal.trim().toLowerCase(),
            );
            onChange(nextVal, match ? match.id : (stepTypeId || ''), match || null);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('recipes.step_search_placeholder')}
          className={cn(
            'w-full h-8 pl-8 pr-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900',
            'placeholder:text-slate-400 placeholder:font-normal',
            'focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all',
            className,
          )}
        />
      </div>

      {/* Google Search Style Autocomplete Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200/90 bg-white shadow-lg p-1.5 space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {filtered.length === 0 && !canCreateNew && (
            <div className="px-3 py-3 text-center text-xs text-slate-400">
              {t('recipes.unspecified')}
            </div>
          )}

          {filtered.map((st, idx) => {
            const isSelected = st.id === stepTypeId;
            const isHighlighted = idx === highlightedIndex;
            const label =
              i18n.language === 'th' ? st.nameTh || st.nameEn : st.nameEn || st.nameTh;

            return (
              <button
                key={st.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelectExisting(st)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer',
                  isHighlighted
                    ? 'bg-amber-50 text-amber-950 font-medium'
                    : isSelected
                      ? 'bg-slate-50 text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100/70',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{label}</span>
                  {st.code && (
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      ({st.code})
                    </span>
                  )}
                </div>

                {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
              </button>
            );
          })}

          {/* "+ ใช้ชื่อนี้เป็นขั้นตอนใหม่" option at bottom */}
          {canCreateNew && (
            <button
              type="button"
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              onClick={() => handleSelectNew(value)}
              className={cn(
                'w-full text-left px-2.5 py-2 mt-1 rounded-lg text-xs flex items-center gap-2 border-t border-slate-100 transition-colors cursor-pointer',
                highlightedIndex === filtered.length
                  ? 'bg-amber-100/80 text-amber-950 font-semibold'
                  : 'bg-amber-50/60 text-amber-900 hover:bg-amber-100/70',
              )}
            >
              <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-800 font-medium">
                    {t('recipes.step_use_new')}:
                  </span>
                  <span className="font-bold text-slate-900 truncate">
                    &quot;{value.trim()}&quot;
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-800 font-semibold px-1.5 py-0.2 rounded shrink-0">
                    {t('recipes.step_new_badge')}
                  </span>
                </div>
              </div>
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

StepAutocompleteInput.displayName = 'StepAutocompleteInput';
