import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Utensils, Plus, Trash2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { SauceCostItem } from '../types/costing';

interface SaucesCostSectionProps {
  sauces: SauceCostItem[];
  totalCost: number;
  onAdd: (preset?: Partial<SauceCostItem>) => void;
  onUpdate: (id: string, updates: Partial<SauceCostItem>) => void;
  onRemove: (id: string) => void;
}

export const SaucesCostSection = React.memo(function SaucesCostSection({
  sauces,
  totalCost,
  onAdd,
  onUpdate,
  onRemove,
}: SaucesCostSectionProps) {
  const { t } = useTranslation();

  const handleAddPreset = (name: string, portionSize: string, unitCost: number) => {
    onAdd({
      name,
      portionSize,
      unitCost,
      quantity: 40,
    });
  };

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-700">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.sauces_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.sauces_section.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAdd()}
            className="text-xs font-semibold h-8 border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('costing.sauces_section.add_sauce')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Quick Add Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/50">
          <span className="text-[11px] font-semibold text-amber-800 flex items-center mr-1">
            <Sparkles className="h-3 w-3 mr-1 text-amber-600" />
            {t('costing.sauces_section.quick_add')}:
          </span>
          <button
            type="button"
            onClick={() =>
              handleAddPreset(t('costing.sauces_section.sauce_sweet_soy'), '30 ml', 2.5)
            }
            className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors cursor-pointer"
          >
            + {t('costing.sauces_section.sauce_sweet_soy')} (฿2.50)
          </button>
          <button
            type="button"
            onClick={() =>
              handleAddPreset(t('costing.sauces_section.sauce_seafood'), '30 ml', 3.2)
            }
            className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors cursor-pointer"
          >
            + {t('costing.sauces_section.sauce_seafood')} (฿3.20)
          </button>
          <button
            type="button"
            onClick={() =>
              handleAddPreset(t('costing.sauces_section.sauce_jaew'), '30 ml', 2.0)
            }
            className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors cursor-pointer"
          >
            + {t('costing.sauces_section.sauce_jaew')} (฿2.00)
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="pb-2 pr-2">{t('costing.sauces_section.item_name')}</th>
                <th className="pb-2 px-2 w-32">{t('costing.sauces_section.portion_size')}</th>
                <th className="pb-2 px-2 text-right w-32">{t('costing.sauces_section.unit_cost')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.sauces_section.quantity')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.sauces_section.total_cost')}</th>
                <th className="pb-2 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sauces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                    {t('costing.sauces_section.subtitle')}
                  </td>
                </tr>
              ) : (
                sauces.map((sauce) => (
                  <tr key={sauce.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2.5 pr-2">
                      <Input
                        value={sauce.name}
                        onChange={(e) => onUpdate(sauce.id, { name: e.target.value })}
                        placeholder="เช่น น้ำจิ้มซีอิ๊วดำหวาน, น้ำจิ้มซีฟู้ดมะนาวสด"
                        className="text-xs h-8.5 bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-2 w-32">
                      <Input
                        value={sauce.portionSize || ''}
                        onChange={(e) => onUpdate(sauce.id, { portionSize: e.target.value })}
                        placeholder="30 ml"
                        className="text-xs h-8.5 bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-2 w-32">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={sauce.unitCost || ''}
                        onChange={(e) =>
                          onUpdate(sauce.id, { unitCost: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="text-xs h-8.5 text-right font-medium bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-2 w-28">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={sauce.quantity || ''}
                        onChange={(e) =>
                          onUpdate(sauce.id, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="1.0"
                        className="text-xs h-8.5 text-right font-medium bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-xs text-slate-800 w-28">
                      ฿{sauce.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 pl-2 text-center w-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(sauce.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={4} className="pt-3 text-right text-xs font-bold text-slate-700">
                  {t('costing.sauces_section.subtotal')}:
                </td>
                <td className="pt-3 px-2 text-right text-sm font-bold text-amber-600">
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
