import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  Coins,
  TrendingUp,
  Percent,
  Banknote,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import type { CostCalculation } from '../types/costing';

interface CostingSummaryCardsProps {
  calculation: CostCalculation;
}

export const CostingSummaryCards = React.memo(function CostingSummaryCards({
  calculation,
}: CostingSummaryCardsProps) {
  const { t } = useTranslation();

  const isGoodMargin = calculation.grossProfitMarginPct >= 60;
  const isHealthyFoodCost =
    calculation.actualFoodCostPct > 0 && calculation.actualFoodCostPct <= 35;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Cost per Cooked KG */}
      <Card className="border-orange-200/80 bg-gradient-to-br from-orange-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.cost_per_cooked_kg')}
            </span>
            <Scale className="h-4 w-4 text-orange-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            ฿{calculation.costPerCookedKg.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {t('costing.summary.yield_badge', { yield: calculation.yieldPct })}
          </p>
        </CardContent>
      </Card>

      {/* 2. Cost per Portion */}
      <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.cost_per_portion')}
            </span>
            <Coins className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            ฿{calculation.costPerPortion.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {calculation.portionWeightG}g / {t('common.items')}
          </p>
        </CardContent>
      </Card>

      {/* 3. Recommended Price */}
      <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.recommended_price')}
            </span>
            <Target className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-blue-700 tracking-tight">
            ฿{calculation.recommendedPriceByMargin.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-blue-600/80 line-clamp-1">
            {t('costing.summary.rec_margin_badge', { margin: calculation.targetMarginPct })}
          </p>
        </CardContent>
      </Card>

      {/* 4. Gross Margin % */}
      <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.margin_pct')}
            </span>
            <Percent className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isGoodMargin ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {calculation.grossProfitMarginPct.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {t('costing.summary.profit_portion', {
              profit: calculation.grossProfitPerPortion.toFixed(2),
            })}
          </p>
        </CardContent>
      </Card>

      {/* 5. Food Cost % */}
      <Card className="border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.food_cost_pct')}
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
          </div>
          <div
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isHealthyFoodCost ? 'text-indigo-700' : 'text-amber-700'
            }`}
          >
            {calculation.actualFoodCostPct.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {t('costing.summary.food_cost_target', { target: calculation.targetFoodCostPct })}
          </p>
        </CardContent>
      </Card>

      {/* 6. Total Batch Gross Profit */}
      <Card className="border-purple-200/80 bg-gradient-to-br from-purple-50/50 to-white shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium line-clamp-1">
              {t('costing.summary.batch_profit')}
            </span>
            <Banknote className="h-4 w-4 text-purple-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-purple-700 tracking-tight">
            ฿{calculation.totalBatchGrossProfit.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {t('costing.summary.break_even', { count: Math.ceil(calculation.breakEvenPortions) })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
});
