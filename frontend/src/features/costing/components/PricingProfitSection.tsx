import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { CostCalculation, CostingFormValues } from '../types/costing';

interface PricingProfitSectionProps {
  calculation: CostCalculation;
  onChangeField: <K extends keyof CostingFormValues>(field: K, value: CostingFormValues[K]) => void;
}

const COMMON_PORTION_PRESETS = [
  { label: '1 ขีด (100g)', value: 100 },
  { label: 'กล่องมาตรฐาน (150g)', value: 150 },
  { label: 'กล่องใหญ่ (200g)', value: 200 },
  { label: 'กล่องจัมโบ้ (250g)', value: 250 },
  { label: 'ครึ่งกิโล (500g)', value: 500 },
  { label: '1 กิโลกรัม (1000g)', value: 1000 },
];

export const PricingProfitSection = React.memo(function PricingProfitSection({
  calculation,
  onChangeField,
}: PricingProfitSectionProps) {
  const { t } = useTranslation();

  const isHealthyMargin = calculation.grossProfitMarginPct >= 60;
  const breakEvenCount = Math.ceil(calculation.breakEvenPortions);

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100/80 text-blue-700">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.pricing_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.pricing_section.subtitle')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-6">
        {/* 1. Portioning Parameters */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-700">
            {t('costing.pricing_section.portion_weight')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PORTION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChangeField('portionWeightG', preset.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border ${
                  calculation.portionWeightG === preset.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="custom-portion" className="text-xs font-medium text-slate-600">
                {t('costing.pricing_section.custom_portion')}
              </Label>
              <div className="relative">
                <Input
                  id="custom-portion"
                  type="number"
                  min="1"
                  step="5"
                  value={calculation.portionWeightG || ''}
                  onChange={(e) => onChangeField('portionWeightG', parseFloat(e.target.value) || 150)}
                  className="text-xs sm:text-sm font-semibold pr-8 bg-white"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                {t('costing.pricing_section.total_portions')}
              </Label>
              <div className="h-9 px-3 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700">
                <span>{calculation.totalPortions.toFixed(1)}</span>
                <span className="text-xs text-slate-400">{t('common.items')}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                {t('costing.pricing_section.cost_per_portion')}
              </Label>
              <div className="h-9 px-3 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/50 text-xs sm:text-sm font-bold text-amber-800">
                <span>฿{calculation.costPerPortion.toFixed(2)}</span>
                <span className="text-xs text-amber-600/80">/{t('common.items')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Target Strategy & Recommendations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          {/* Target Food Cost Strategy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target-food-cost" className="text-xs font-semibold text-slate-700">
                {t('costing.pricing_section.target_food_cost')}
              </Label>
              <span className="text-xs font-bold text-indigo-600">
                {calculation.targetFoodCostPct}%
              </span>
            </div>
            <Input
              id="target-food-cost"
              type="number"
              min="10"
              max="90"
              step="1"
              value={calculation.targetFoodCostPct || ''}
              onChange={(e) => onChangeField('targetFoodCostPct', parseFloat(e.target.value) || 35)}
              className="text-xs h-8.5 bg-white font-medium"
            />
            <p className="text-[11px] text-slate-500 flex justify-between">
              <span>{t('costing.pricing_section.recommended_by_food_cost')}:</span>
              <strong className="text-indigo-700">
                ฿{calculation.recommendedPriceByFoodCost.toFixed(0)}
              </strong>
            </p>
          </div>

          {/* Target Gross Margin Strategy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target-margin" className="text-xs font-semibold text-slate-700">
                {t('costing.pricing_section.target_margin')}
              </Label>
              <span className="text-xs font-bold text-blue-600">
                {calculation.targetMarginPct}%
              </span>
            </div>
            <Input
              id="target-margin"
              type="number"
              min="10"
              max="90"
              step="1"
              value={calculation.targetMarginPct || ''}
              onChange={(e) => onChangeField('targetMarginPct', parseFloat(e.target.value) || 65)}
              className="text-xs h-8.5 bg-white font-medium"
            />
            <p className="text-[11px] text-slate-500 flex justify-between">
              <span>{t('costing.pricing_section.recommended_by_margin')}:</span>
              <strong className="text-blue-700">
                ฿{calculation.recommendedPriceByMargin.toFixed(0)}
              </strong>
            </p>
          </div>
        </div>

        {/* 3. Actual Price Input & Profit Metrics */}
        <div className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="actual-price" className="text-xs font-bold text-slate-900">
              {t('costing.pricing_section.actual_selling_price')}
            </Label>
            <div className="relative">
              <Input
                id="actual-price"
                type="number"
                min="1"
                step="5"
                value={calculation.actualPricePerPortion || ''}
                onChange={(e) => onChangeField('actualPricePerPortion', parseFloat(e.target.value) || 0)}
                className="text-base sm:text-lg font-bold text-orange-600 pr-10 border-orange-400 bg-orange-50/20"
                placeholder="120"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">บาท</span>
            </div>
          </div>

          {/* Profit Breakdown Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-slate-200 bg-white">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('costing.pricing_section.gross_profit_per_portion')}
              </span>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                ฿{calculation.grossProfitPerPortion.toFixed(2)}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('costing.pricing_section.actual_margin_pct')}
              </span>
              <p className={`text-base font-bold mt-0.5 ${isHealthyMargin ? 'text-emerald-700' : 'text-amber-700'}`}>
                {calculation.grossProfitMarginPct.toFixed(1)}%
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('costing.pricing_section.total_revenue')}
              </span >
              <p className="text-base font-bold text-slate-800 mt-0.5">
                ฿{calculation.totalBatchRevenue.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('costing.pricing_section.total_gross_profit')}
              </span>
              <p className="text-base font-bold text-purple-700 mt-0.5">
                ฿{calculation.totalBatchGrossProfit.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Break Even Advice */}
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-2 text-xs text-emerald-900">
            {isHealthyMargin ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span>
              {t('costing.pricing_section.break_even_hint', { count: breakEvenCount })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
