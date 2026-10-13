import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { CostCalculation, CostingFormValues } from '../types/costing';

interface YieldAndShrinkageSectionProps {
  calculation: CostCalculation;
  onChangeField: <K extends keyof CostingFormValues>(field: K, value: CostingFormValues[K]) => void;
}

export const YieldAndShrinkageSection = React.memo(function YieldAndShrinkageSection({
  calculation,
  onChangeField,
}: YieldAndShrinkageSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100/80 text-orange-700">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.yield_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.yield_section.subtitle')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Raw Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="raw-weight" className="text-xs font-semibold text-slate-700">
              {t('costing.yield_section.raw_weight')}
            </Label>
            <div className="relative">
              <Input
                id="raw-weight"
                type="number"
                min="0.1"
                step="0.1"
                value={calculation.rawWeightKg || ''}
                onChange={(e) => onChangeField('rawWeightKg', parseFloat(e.target.value) || 0)}
                className="text-xs sm:text-sm font-semibold pr-10"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">กก.</span>
            </div>
          </div>

          {/* Cooked Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="cooked-weight" className="text-xs font-semibold text-slate-700">
              {t('costing.yield_section.cooked_weight')}
            </Label>
            <div className="relative">
              <Input
                id="cooked-weight"
                type="number"
                min="0.1"
                step="0.1"
                value={calculation.cookedWeightKg || ''}
                onChange={(e) => onChangeField('cookedWeightKg', parseFloat(e.target.value) || 0)}
                className="text-xs sm:text-sm font-semibold pr-10 border-orange-300 bg-orange-50/20"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">กก.</span>
            </div>
          </div>

          {/* Yield % (Auto-derived or override) */}
          <div className="space-y-1.5">
            <Label htmlFor="yield-pct" className="text-xs font-semibold text-slate-700">
              {t('costing.yield_section.yield_pct')}
            </Label>
            <div className="relative">
              <Input
                id="yield-pct"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={calculation.yieldPct || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onChangeField('yieldPct', val);
                  if (calculation.rawWeightKg > 0) {
                    onChangeField('cookedWeightKg', (calculation.rawWeightKg * val) / 100);
                  }
                }}
                className="text-xs sm:text-sm font-bold text-emerald-700 pr-8"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">%</span>
            </div>
          </div>

          {/* Shrinkage % */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              {t('costing.yield_section.shrinkage_pct')}
            </Label>
            <div className="h-9 px-3 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-600">
              <span>{calculation.shrinkagePct.toFixed(1)}</span>
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>

          {/* Wastage Buffer % */}
          <div className="space-y-1.5">
            <Label htmlFor="wastage-pct" className="text-xs font-semibold text-slate-700">
              {t('costing.yield_section.wastage_pct')}
            </Label>
            <div className="relative">
              <Input
                id="wastage-pct"
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={calculation.wastagePct ?? 3}
                onChange={(e) => onChangeField('wastagePct', parseFloat(e.target.value) || 0)}
                className="text-xs sm:text-sm font-semibold pr-8"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">%</span>
            </div>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold">{t('costing.yield_section.yield_tip_title')}</span>:{' '}
            <span>{t('costing.yield_section.yield_hint')}</span>
            {calculation.yieldPct < 50 && (
              <p className="text-red-700 font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('costing.yield_section.yield_low_warning')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
