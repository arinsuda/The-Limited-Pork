import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import type { IngredientCostItem } from '../types/costing';

interface IngredientRowProps {
  item: IngredientCostItem;
  onUpdate: (id: string, updates: Partial<IngredientCostItem>) => void;
  onRemove: (id: string) => void;
}

export const IngredientRow = React.memo(function IngredientRow({
  item,
  onUpdate,
  onRemove,
}: IngredientRowProps) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      {/* Name */}
      <td className="py-2.5 pr-2">
        <Input
          value={item.ingredientName}
          onChange={(e) => onUpdate(item.id, { ingredientName: e.target.value })}
          placeholder="ชื่อวัตถุดิบ"
          className="text-xs h-8.5 bg-white"
        />
      </td>

      {/* Quantity */}
      <td className="py-2.5 px-2 w-24">
        <Input
          type="number"
          min="0.001"
          step="any"
          value={item.quantity || ''}
          onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
          className="text-xs h-8.5 text-right font-medium bg-white"
        />
      </td>

      {/* Unit */}
      <td className="py-2.5 px-2 w-20">
        <Input
          value={item.unitName}
          onChange={(e) => onUpdate(item.id, { unitName: e.target.value })}
          placeholder="กก."
          className="text-xs h-8.5 text-center bg-white"
        />
      </td>

      {/* Unit Price */}
      <td className="py-2.5 px-2 w-28">
        <Input
          type="number"
          min="0"
          step="any"
          value={item.unitPrice || ''}
          onChange={(e) => onUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="text-xs h-8.5 text-right font-medium bg-white"
        />
      </td>

      {/* Trim Loss % */}
      <td className="py-2.5 px-2 w-24">
        <div className="relative">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={item.trimLossPct || ''}
            onChange={(e) => onUpdate(item.id, { trimLossPct: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="text-xs h-8.5 text-right pr-6 bg-white"
          />
          <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium">%</span>
        </div>
      </td>

      {/* Item Total Cost */}
      <td className="py-2.5 px-2 text-right font-bold text-xs text-slate-800 w-28">
        ฿{item.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
      </td>

      {/* Remove Button */}
      <td className="py-2.5 pl-2 text-center w-10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
});
