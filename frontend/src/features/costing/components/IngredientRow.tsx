import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import type { IngredientCostItem } from '../types/costing';
import type { MasterDataUnit } from '../hooks/useCostingApi';

interface IngredientRowProps {
  item: IngredientCostItem;
  units?: MasterDataUnit[];
  onUpdate: (id: string, updates: Partial<IngredientCostItem>) => void;
  onRemove: (id: string) => void;
}

export const IngredientRow = React.memo(function IngredientRow({
  item,
  units = [],
  onUpdate,
  onRemove,
}: IngredientRowProps) {
  const { t, i18n } = useTranslation();
  const isThai = i18n.language === 'th';

  const handleUnitChange = (val: string) => {
    const found = units.find((u) => u.id === val || u.symbol === val || u.code === val || u.nameTh === val);
    if (found) {
      onUpdate(item.id, {
        unitId: found.id,
        unitName: found.symbol || (isThai ? found.nameTh : found.nameEn),
      });
    } else {
      onUpdate(item.id, { unitName: val });
    }
  };

  // Determine current select value
  const selectedUnitValue = item.unitId || (units.find((u) => u.symbol === item.unitName || u.nameTh === item.unitName)?.id) || item.unitName;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      {/* Name */}
      <td className="py-2.5 pr-2">
        <Input
          value={item.ingredientName}
          onChange={(e) => onUpdate(item.id, { ingredientName: e.target.value })}
          placeholder={t('costing.ingredients_section.name')}
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

      {/* Unit Selector from Database Master Data */}
      <td className="py-2.5 px-2 w-28">
        <select
          value={selectedUnitValue}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="w-full text-xs h-8.5 px-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium text-slate-800 cursor-pointer"
        >
          {/* Custom option if item has a unit not in the master list */}
          {item.unitName && !units.some((u) => u.id === item.unitId || u.symbol === item.unitName || u.nameTh === item.unitName) && (
            <option value={item.unitName}>{item.unitName}</option>
          )}

          {units.length > 0 ? (
            units.map((u) => {
              const label = u.symbol ? `${u.symbol} (${isThai ? u.nameTh : u.nameEn})` : (isThai ? u.nameTh : u.nameEn);
              return (
                <option key={u.id} value={u.id}>
                  {label}
                </option>
              );
            })
          ) : (
            <option value={item.unitName || 'กก.'}>{item.unitName || 'กก.'}</option>
          )}
        </select>
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
