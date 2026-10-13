import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { OperationCostItem } from '../types/costing';

interface OperationsCostSectionProps {
  operations: OperationCostItem[];
  totalCost: number;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<OperationCostItem>) => void;
  onRemove: (id: string) => void;
}

export const OperationsCostSection = React.memo(function OperationsCostSection({
  operations,
  totalCost,
  onAdd,
  onUpdate,
  onRemove,
}: OperationsCostSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-slate-200/80 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-700">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {t('costing.operations_section.title')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              {t('costing.operations_section.subtitle')}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="text-xs font-semibold h-8 border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('costing.operations_section.add_operation')}
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="pb-2 pr-2">{t('costing.operations_section.item_name')}</th>
                <th className="pb-2 px-2 text-right w-32">{t('costing.operations_section.rate')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.operations_section.usage')}</th>
                <th className="pb-2 px-2 text-right w-28">{t('costing.operations_section.total_cost')}</th>
                <th className="pb-2 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-2">
                    <Input
                      value={op.name}
                      onChange={(e) => onUpdate(op.id, { name: e.target.value })}
                      placeholder="เช่น ค่าแก๊ส LPG, ค่าไฟเตาอบ"
                      className="text-xs h-8.5 bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 w-32">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={op.rate || ''}
                      onChange={(e) => onUpdate(op.id, { rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="text-xs h-8.5 text-right font-medium bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 w-28">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={op.usage || ''}
                      onChange={(e) => onUpdate(op.id, { usage: parseFloat(e.target.value) || 0 })}
                      placeholder="1.0"
                      className="text-xs h-8.5 text-right font-medium bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-xs text-slate-800 w-28">
                    ฿{op.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 pl-2 text-center w-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(op.id)}
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
                  {t('costing.operations_section.subtotal')}:
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
