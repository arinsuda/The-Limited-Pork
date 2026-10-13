import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { IngredientRow } from './IngredientRow';
import type { IngredientCostItem } from '../types/costing';

interface IngredientsCostSectionProps {
  ingredients: IngredientCostItem[];
  totalCost: number;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<IngredientCostItem>) => void;
  onRemove: (id: string) => void;
}

export const IngredientsCostSection = React.memo(function IngredientsCostSection({
  ingredients,
  totalCost,
  onAdd,
  onUpdate,
  onRemove,
}: IngredientsCostSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100/80 text-orange-700">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.ingredients_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.ingredients_section.subtitle')}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="text-xs font-semibold h-8 border-orange-200 text-orange-700 hover:bg-orange-50 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('costing.ingredients_section.add_ingredient')}
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="pb-2 pr-2">{t('costing.ingredients_section.name')}</th>
                <th className="pb-2 px-2 text-right w-24">{t('costing.ingredients_section.quantity')}</th>
                <th className="pb-2 px-2 text-center w-20">{t('costing.ingredients_section.unit')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.ingredients_section.unit_price')}</th>
                <th className="pb-2 px-2 text-right w-24">{t('costing.ingredients_section.trim_loss')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.ingredients_section.total_cost')}</th>
                <th className="pb-2 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => (
                <IngredientRow
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={5} className="pt-3 text-right text-xs font-bold text-slate-700">
                  {t('costing.ingredients_section.subtotal')}:
                </td>
                <td className="pt-3 px-2 text-right text-sm font-bold text-orange-600">
                  ฿{totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
