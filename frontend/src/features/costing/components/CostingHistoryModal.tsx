import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Loader2, Trash2, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useCostingsList, useDeleteCosting } from '../hooks/useCostingApi';
import type { CostCalculation } from '../types/costing';

interface CostingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CostCalculation) => void;
}

export const CostingHistoryModal = React.memo(function CostingHistoryModal({
  open,
  onOpenChange,
  onSelect,
}: CostingHistoryModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCostingsList(1, 50, search);
  const { mutateAsync: deleteCosting } = useDeleteCosting();

  const handleSelect = useCallback(
    (item: CostCalculation) => {
      onSelect(item);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, item: CostCalculation) => {
      e.stopPropagation();
      if (!window.confirm(t('costing.history_modal.delete_confirm', { name: item.name }))) {
        return;
      }
      try {
        await deleteCosting(item.id);
      } catch {
        // error handled by global toast
      }
    },
    [deleteCosting, t],
  );

  const items = data?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileVariant="sheet" size="md" className="sm:max-w-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-orange-600" />
            {t('costing.history_modal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="text-xs h-9 bg-white"
          />

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-orange-600" />
                {t('common.loading')}
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('costing.history_modal.no_history')}
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      {item.recipeName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-medium shrink-0">
                          {item.recipeName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>ต้นทุน: <strong>฿{item.costPerPortion.toFixed(2)}</strong>/กล่อง</span>
                      <span>ราคาขาย: <strong>฿{item.actualPricePerPortion.toFixed(0)}</strong></span>
                      <span className="text-emerald-700 font-semibold">
                        Margin: {item.grossProfitMarginPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, item)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="p-1 text-slate-300 group-hover:text-orange-600 transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
