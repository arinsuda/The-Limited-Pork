import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, Info } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { Unit } from '../types/recipe-form';

interface RecipeBatchSizeSectionProps {
  specifyPorkQuantity: boolean;
  onToggleSpecifyPork: (checked: boolean) => void;
  inputQuantity: number | '';
  setInputQuantity: (v: number | '') => void;
  inputUnitId: string;
  setInputUnitId: (v: string) => void;
  expectedOutputQuantity: number | '';
  setExpectedOutputQuantity: (v: number | '') => void;
  expectedOutputUnitId: string;
  setExpectedOutputUnitId: (v: string) => void;
  units: Unit[];
}

export const RecipeBatchSizeSection = React.memo(function RecipeBatchSizeSection({
  specifyPorkQuantity,
  onToggleSpecifyPork,
  inputQuantity,
  setInputQuantity,
  inputUnitId,
  setInputUnitId,
  expectedOutputQuantity,
  setExpectedOutputQuantity,
  expectedOutputUnitId,
  setExpectedOutputUnitId,
  units,
}: RecipeBatchSizeSectionProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-none">
              {t('recipes.batch_size_section')}
            </h4>
          </div>
        </div>

        {/* Checkbox Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors w-fit">
          <input
            type="checkbox"
            checked={specifyPorkQuantity}
            onChange={(e) => onToggleSpecifyPork(e.target.checked)}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
          />
          <span>
            {specifyPorkQuantity
              ? t('recipes.specify_pork_quantity')
              : t('recipes.unspecified_pork_quantity')}
          </span>
        </label>
      </div>

      {specifyPorkQuantity ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="space-y-1 min-w-0">
            <Label className="text-xs truncate block">{t('recipes.input_quantity')}</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="1"
              value={inputQuantity}
              onChange={(e) => setInputQuantity(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="space-y-1 min-w-0">
            <Label className="text-xs truncate block">{t('recipes.initial_unit')}</Label>
            <select
              className="w-full min-w-0 max-w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs truncate focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={inputUnitId}
              onChange={(e) => setInputUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.symbol} ({i18n.language === 'th' ? u.nameTh : u.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 min-w-0">
            <Label className="text-xs truncate block">{t('recipes.expected_output')}</Label>
            <Input
              type="number"
              step="1"
              placeholder="650"
              value={expectedOutputQuantity}
              onChange={(e) =>
                setExpectedOutputQuantity(e.target.value ? Number(e.target.value) : '')
              }
            />
          </div>
          <div className="space-y-1 min-w-0">
            <Label className="text-xs truncate block">{t('recipes.target_unit')}</Label>
            <select
              className="w-full min-w-0 max-w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs truncate focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={expectedOutputUnitId}
              onChange={(e) => setExpectedOutputUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.symbol} ({i18n.language === 'th' ? u.nameTh : u.nameEn})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">{t('recipes.online_recipe_mode_title')}</p>
            <p className="text-amber-800/90 mt-0.5 leading-relaxed">
              {t('recipes.online_recipe_mode_desc')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

RecipeBatchSizeSection.displayName = 'RecipeBatchSizeSection';
