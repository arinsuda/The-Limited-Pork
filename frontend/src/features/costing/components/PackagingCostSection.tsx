import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { PackagingCostItem } from '../types/costing';

interface PackagingCostSectionProps {
  packaging: PackagingCostItem[];
  totalCost: number;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<PackagingCostItem>) => void;
  onRemove: (id: string) => void;
}

export const PackagingCostSection = React.memo(function PackagingCostSection({
  packaging,
  totalCost,
  onAdd,
  onUpdate,
  onRemove,
}: PackagingCostSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-700">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.packaging_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.packaging_section.subtitle')}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="text-xs font-semibold h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('costing.packaging_section.add_packaging')}
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="pb-2 pr-2">{t('costing.packaging_section.item_name')}</th>
                <th className="pb-2 px-2 text-right w-32">{t('costing.packaging_section.unit_price')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.packaging_section.quantity')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.packaging_section.total_cost')}</th>
                <th className="pb-2 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {packaging.map((pkg) => (
                <tr key={pkg.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-2">
                    <Input
                      value={pkg.name}
                      onChange={(e) => onUpdate(pkg.id, { name: e.target.value })}
                      placeholder="เช่น กล่องคราฟท์, ถ้วยน้ำจิ้ม, สติ๊กเกอร์"
                      className="text-xs h-8.5 bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 w-32">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={pkg.unitPrice || ''}
                      onChange={(e) => onUpdate(pkg.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="text-xs h-8.5 text-right font-medium bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 w-28">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={pkg.quantity || ''}
                      onChange={(e) => onUpdate(pkg.id, { quantity: parseFloat(e.target.value) || 0 })}
                      placeholder="1.0"
                      className="text-xs h-8.5 text-right font-medium bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-xs text-slate-800 w-28">
                    ฿{pkg.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 pl-2 text-center w-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(pkg.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="pt-3 text-right text-xs font-bold text-slate-700">
                  {t('costing.packaging_section.subtotal')}:
                </td>
                <td className="pt-3 px-2 text-right text-sm font-bold text-emerald-600">
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
