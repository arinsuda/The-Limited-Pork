import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Check,
  Plus,
  Loader2,
  ChevronsUpDown,
  X,
  Flame,
  Clock,
  Thermometer,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { cn } from '@/shared/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { toast } from 'sonner';

export interface StepTypeItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  usesTemperature?: boolean;
  usesDuration?: boolean;
  usesOrientation?: boolean;
  isRepeatable?: boolean;
}

interface StepTypeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  stepTypes: StepTypeItem[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function StepTypeCombobox({
  value,
  onChange,
  stepTypes,
  placeholder,
  className,
  disabled = false,
}: StepTypeComboboxProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected item
  const selectedStepType = useMemo(
    () => stepTypes.find((s) => s.id === value),
    [stepTypes, value],
  );

  // Filtered items
  const filteredStepTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stepTypes;
    return stepTypes.filter((s) => {
      const th = (s.nameTh || '').toLowerCase();
      const en = (s.nameEn || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      return th.includes(q) || en.includes(q) || code.includes(q);
    });
  }, [stepTypes, search]);

  // Check if search query matches an existing item exactly
  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return stepTypes.find(
      (s) =>
        (s.nameTh || '').trim().toLowerCase() === q ||
        (s.nameEn || '').trim().toLowerCase() === q,
    );
  }, [stepTypes, search]);

  const canCreate = search.trim().length > 0 && !exactMatch;

  // Mutation to create a new process step type
  const createMutation = useMutation({
    mutationFn: async (newName: string) => {
      const trimmed = newName.trim();
      const code = `STEP_${Date.now().toString(36).toUpperCase()}`;
      return http.post<StepTypeItem>('/process-step-types', {
        code,
        nameTh: trimmed,
        nameEn: trimmed,
        usesTemperature: true,
        usesDuration: true,
        usesOrientation: false,
        isRepeatable: false,
        paramSchema: [],
        sortOrder: stepTypes.length + 1,
        isActive: true,
      });
    },
    onSuccess: (newStep) => {
      queryClient.invalidateQueries({ queryKey: ['masterdata', 'step-types'] });
      onChange(newStep.id);
      setOpen(false);
      setSearch('');
      toast.success(
        t('recipes.step_type_created', 'เพิ่มขั้นตอน "{{name}}" สำเร็จ', {
          name: i18n.language === 'th' ? newStep.nameTh : newStep.nameEn,
        }),
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || t('common.error', 'เกิดข้อผิดพลาดในการสร้างขั้นตอนใหม่'));
    },
  });

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    if (!canCreate || createMutation.isPending) return;
    createMutation.mutate(search.trim());
  };

  // Keyboard navigation inside combobox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = filteredStepTypes.length + (canCreate ? 1 : 0);
      setActiveIndex((prev) => (prev + 1 < max ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const max = filteredStepTypes.length + (canCreate ? 1 : 0);
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : max - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = activeIndex >= 0 ? filteredStepTypes[activeIndex] : undefined;
      const firstItem = filteredStepTypes[0];
      if (activeItem) {
        handleSelect(activeItem.id);
      } else if (canCreate && (activeIndex === filteredStepTypes.length || filteredStepTypes.length === 0)) {
        handleCreate();
      } else if (filteredStepTypes.length === 1 && firstItem) {
        handleSelect(firstItem.id);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setActiveIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const displayName = selectedStepType
    ? i18n.language === 'th'
      ? selectedStepType.nameTh
      : selectedStepType.nameEn
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer text-left',
            !selectedStepType && 'text-slate-400 font-normal',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {selectedStepType ? (
              <>
                <Flame className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <span className="truncate">{displayName}</span>
              </>
            ) : (
              <span className="truncate">
                {placeholder || t('recipes.select_step_type', 'เลือกหรือค้นหาขั้นตอน...')}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(calc(100vw-2rem),360px)] p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden"
      >
        {/* Google-like Search Bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('recipes.search_step_placeholder', 'ค้นหาขั้นตอน... หรือพิมพ์เพื่อเพิ่มใหม่')}
            className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions List */}
        <div
          ref={listRef}
          className="max-h-56 overflow-y-auto overscroll-contain p-1 space-y-0.5 divide-y-0 text-xs"
        >
          {filteredStepTypes.length > 0 ? (
            filteredStepTypes.map((st, idx) => {
              const isSelected = st.id === value;
              const isActive = activeIndex === idx;
              const title = i18n.language === 'th' ? st.nameTh : st.nameEn;

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelect(st.id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-orange-50 font-semibold text-orange-900'
                      : isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Flame
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        isSelected ? 'text-orange-600' : 'text-slate-400',
                      )}
                    />
                    <span className="truncate">{title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {st.usesTemperature && (
                      <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        <Thermometer className="h-2.5 w-2.5 mr-0.5 text-amber-500" />
                        {t('recipes.temp_short', 'อุณหภูมิ')}
                      </span>
                    )}
                    {st.usesDuration && (
                      <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        <Clock className="h-2.5 w-2.5 mr-0.5 text-blue-500" />
                        {t('recipes.time_short', 'เวลา')}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-orange-600 shrink-0 ml-1" />
                    )}
                  </div>
                </div>
              );
            })
          ) : !canCreate ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {t('common.no_results', 'ไม่พบขั้นตอนที่ค้นหา')}
            </div>
          ) : null}
        </div>

        {/* "Add as new item" option if search does not match existing */}
        {canCreate && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-1.5">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-orange-700 bg-orange-100/70 hover:bg-orange-200/80 active:bg-orange-300/80 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-orange-500',
                activeIndex === filteredStepTypes.length && 'ring-2 ring-orange-500 bg-orange-200/80',
              )}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-orange-600" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="block truncate text-slate-900 font-bold">
                  + เพิ่ม &ldquo;<span className="text-orange-600">{search.trim()}</span>&rdquo; เป็นขั้นตอนใหม่
                </span>
                <span className="block text-[10px] text-slate-500 font-normal">
                  คลิกเพื่อบันทึกและนำไปใช้ในสูตรนี้ทันที
                </span>
              </div>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
