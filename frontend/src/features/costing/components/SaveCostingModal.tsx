import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

interface SaveCostingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  defaultNotes?: string;
  isSaving: boolean;
  onSave: (name: string, notes?: string) => Promise<void>;
}

export const SaveCostingModal = React.memo(function SaveCostingModal({
  open,
  onOpenChange,
  defaultName,
  defaultNotes,
  isSaving,
  onSave,
}: SaveCostingModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState(defaultNotes || '');

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setNotes(defaultNotes || '');
    }
  }, [open, defaultName, defaultNotes]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      await onSave(name.trim(), notes.trim() || undefined);
    },
    [name, notes, onSave],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileVariant="sheet" size="sm" className="sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Save className="h-4 w-4 text-orange-600" />
            {t('costing.save_modal.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="costing-name" className="text-xs font-semibold">
              {t('costing.save_modal.name_label')}
            </Label>
            <Input
              id="costing-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น หมูกรอบพรีเมียม Batch 10 กก."
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costing-notes" className="text-xs font-semibold">
              {t('costing.save_modal.notes_label')}
            </Label>
            <Textarea
              id="costing-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม เช่น ราคาหมูดิบตลาดสดยิ่งเจริญ ณ วันที่ 13 ต.ค."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs cursor-pointer"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !name.trim()}
              className="text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
