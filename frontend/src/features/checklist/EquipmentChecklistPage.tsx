import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Scale,
  Thermometer,
  Flame,
  Archive,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ChefHat,
  Trash2,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { useConfirm } from '@/shared/ui/confirm-modal';
import { toast } from 'sonner';

export interface EquipmentItem {
  id: string;
  category: 'MEASUREMENT' | 'PREP' | 'FRYING' | 'STORAGE';
  titleTh: string;
  titleEn: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEEDED' | 'ORDERED' | 'READY';
  specsTh: string;
  specsEn: string;
  qcReasonTh: string;
  qcReasonEn: string;
  estimatedPrice: string;
  notes?: string;
}


const LOCAL_STORAGE_KEY = 'mookrob_equipment_checklist_v1';
const PRE_COOK_STORAGE_KEY = 'mookrob_precook_checklist_v1';

export function EquipmentChecklistPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { confirm } = useConfirm();
  const isThai = i18n.language === 'th';

  const [activeTab, setActiveTab] = useState<'procurement' | 'pre_cook' | 'why_needed'>('procurement');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Equipment Form State
  const [newItem, setNewItem] = useState<Partial<EquipmentItem>>({
    category: 'MEASUREMENT',
    priority: 'HIGH',
    status: 'NEEDED',
    titleTh: '',
    titleEn: '',
    specsTh: '',
    specsEn: '',
    qcReasonTh: '',
    qcReasonEn: '',
    estimatedPrice: '',
    notes: '',
  });

  // Query Settings from Backend
  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['settings', 'equipment.checklist'],
    queryFn: async () => {
      try {
        const res = await http.get('/settings/public');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Find setting record for equipment.checklist
  const checklistSetting = useMemo(() => {
    return settings.find((s) => s.key === 'equipment.checklist');
  }, [settings]);

  // Read items from Setting or fallback to LocalStorage / empty array
  const initialItems = useMemo((): EquipmentItem[] => {
    if (checklistSetting && Array.isArray(checklistSetting.value)) {
      return checklistSetting.value;
    }
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }, [checklistSetting]);

  const [items, setItems] = useState<EquipmentItem[]>(initialItems);

  // Sync with backend setting when loaded or refreshed
  useEffect(() => {
    if (checklistSetting && Array.isArray(checklistSetting.value)) {
      setItems(checklistSetting.value);
    }
  }, [checklistSetting]);

  // Pre-cook checklist state
  const [preCookChecks, setPreCookChecks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PRE_COOK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleTogglePreCook = (id: string) => {
    setPreCookChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(PRE_COOK_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleResetPreCook = () => {
    setPreCookChecks({});
    localStorage.removeItem(PRE_COOK_STORAGE_KEY);
    toast.success(t('checklist.pre_cook.reset_btn'));
  };

  // Persist items Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedItems: EquipmentItem[]) => {
      // Save locally first
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedItems));
      // Save to backend if permitted and setting exists
      if (hasPermission('settings.write') && checklistSetting) {
        await http.put(`/settings/equipment.checklist`, {
          value: updatedItems,
          version: checklistSetting.version,
        });
      }
      return updatedItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'equipment.checklist'] });
    },
  });

  const handleStatusChange = (id: string, newStatus: EquipmentItem['status']) => {
    const updated = items.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
    setItems(updated);
    saveMutation.mutate(updated);
    toast.success(t('checklist.status_updated', { status: t(`checklist.status.${newStatus}`) }));
  };

  const handleDeleteItem = async (item: EquipmentItem) => {
    const title = isThai ? item.titleTh : item.titleEn;
    const isConfirmed = await confirm({
      title: t('checklist.delete_confirm_title'),
      description: t('checklist.delete_confirm_desc', { name: title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'destructive',
    });
    if (!isConfirmed) return;

    const updated = items.filter((i) => i.id !== item.id);
    setItems(updated);
    saveMutation.mutate(updated);
    toast.success(t('common.success'));
  };

  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      title: t('checklist.clear_all_confirm_title'),
      description: t('checklist.clear_all_confirm_desc'),
      confirmLabel: t('checklist.clear_all'),
      cancelLabel: t('common.cancel'),
      variant: 'destructive',
    });
    if (!isConfirmed) return;

    setItems([]);
    saveMutation.mutate([]);
    toast.success(t('common.success'));
  };

  const handleAddItem = () => {
    if (!newItem.titleTh && !newItem.titleEn) {
      toast.error(t('errors.VALIDATION_FAILED'));
      return;
    }
    const itemToAdd: EquipmentItem = {
      id: `eq-${Date.now()}`,
      category: newItem.category || 'MEASUREMENT',
      titleTh: newItem.titleTh || newItem.titleEn || '',
      titleEn: newItem.titleEn || newItem.titleTh || '',
      priority: newItem.priority || 'HIGH',
      status: newItem.status || 'NEEDED',
      specsTh: newItem.specsTh || '',
      specsEn: newItem.specsEn || '',
      qcReasonTh: newItem.qcReasonTh || '',
      qcReasonEn: newItem.qcReasonEn || '',
      estimatedPrice: newItem.estimatedPrice || '0 - 500 บาท',
      notes: newItem.notes || '',
    };
    const updated = [...items, itemToAdd];
    setItems(updated);
    saveMutation.mutate(updated);
    setIsAddModalOpen(false);
    setNewItem({
      category: 'MEASUREMENT',
      priority: 'HIGH',
      status: 'NEEDED',
      titleTh: '',
      titleEn: '',
      specsTh: '',
      specsEn: '',
      qcReasonTh: '',
      qcReasonEn: '',
      estimatedPrice: '',
      notes: '',
    });
    toast.success(t('checklist.save_success'));
  };

  // Readiness Metrics
  const totalCount = items.length;
  const readyCount = items.filter((i) => i.status === 'READY').length;
  const orderedCount = items.filter((i) => i.status === 'ORDERED').length;
  const neededCount = items.filter((i) => i.status === 'NEEDED').length;
  const readinessPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  // Filtered Equipment Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.titleTh.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.specsTh.toLowerCase().includes(q) ||
        item.specsEn.toLowerCase().includes(q) ||
        item.qcReasonTh.toLowerCase().includes(q) ||
        item.qcReasonEn.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Pre-cook items list
  const preCookItems = [
    { id: 'pc-1', text: t('checklist.pre_cook.item_1') },
    { id: 'pc-2', text: t('checklist.pre_cook.item_2') },
    { id: 'pc-3', text: t('checklist.pre_cook.item_3') },
    { id: 'pc-4', text: t('checklist.pre_cook.item_4') },
    { id: 'pc-5', text: t('checklist.pre_cook.item_5') },
    { id: 'pc-6', text: t('checklist.pre_cook.item_6') },
    { id: 'pc-7', text: t('checklist.pre_cook.item_7') },
    { id: 'pc-8', text: t('checklist.pre_cook.item_8') },
  ];
  const preCookCompletedCount = preCookItems.filter((p) => preCookChecks[p.id]).length;
  const preCookPercent = Math.round((preCookCompletedCount / preCookItems.length) * 100);

  // Category Icon Helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MEASUREMENT':
        return <Scale className="h-4 w-4 text-sky-600" />;
      case 'PREP':
        return <ChefHat className="h-4 w-4 text-amber-600" />;
      case 'FRYING':
        return <Flame className="h-4 w-4 text-orange-600" />;
      case 'STORAGE':
        return <Archive className="h-4 w-4 text-emerald-600" />;
      default:
        return <Layers className="h-4 w-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 font-semibold text-[10px]">
            {t('checklist.priority.HIGH')}
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">
            {t('checklist.priority.MEDIUM')}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-600 border-slate-200 font-medium text-[10px]">
            {t('checklist.priority.LOW')}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-orange-600" />
            {t('checklist.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{t('checklist.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('settings.write') && items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {t('checklist.clear_all')}
            </Button>
          )}

          {hasPermission('settings.write') && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="sm"
              className="shadow-md shadow-orange-500/20"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('checklist.add_item')}
            </Button>
          )}
        </div>
      </div>

      {/* High-Fidelity Overview Metrics & Readiness Bar */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/30 shadow-2xs">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Progress Bar & Rate */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    {t('checklist.readiness_rate')}
                  </span>
                  <span className="font-bold text-sm text-orange-600">{readinessPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      readinessPercent === 100
                        ? 'bg-emerald-500'
                        : readinessPercent > 50
                        ? 'bg-orange-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${readinessPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {readyCount} / {totalCount} {t('common.items')} {t('checklist.ready_items')}
                </p>
              </div>

              {/* Status Metric Pills */}
              <div className="grid grid-cols-3 gap-3 min-w-[280px]">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-center">
                  <div className="text-[11px] font-medium text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {t('checklist.ready_items')}
                  </div>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5">{readyCount}</div>
                </div>

                <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 text-center">
                  <div className="text-[11px] font-medium text-sky-700 flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    {t('checklist.ordered_items')}
                  </div>
                  <div className="text-xl font-bold text-sky-800 mt-0.5">{orderedCount}</div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-center">
                  <div className="text-[11px] font-medium text-amber-700 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    {t('checklist.needed_items')}
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-0.5">{neededCount}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="space-y-4"
      >
        <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="procurement" className="text-xs py-2 px-3">
            <Scale className="h-3.5 w-3.5 mr-1.5" />
            {t('checklist.tabs.procurement')} ({items.length})
          </TabsTrigger>
          <TabsTrigger value="pre_cook" className="text-xs py-2 px-3">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {t('checklist.tabs.pre_cook')} ({preCookCompletedCount}/{preCookItems.length})
          </TabsTrigger>
          <TabsTrigger value="why_needed" className="text-xs py-2 px-3">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            {t('checklist.tabs.why_needed')}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Procurement & Specs Checklist */}
        <TabsContent value="procurement" className="space-y-4 outline-none">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-orange-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t('checklist.filter_all')}
              </button>
              {(['MEASUREMENT', 'PREP', 'FRYING', 'STORAGE'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span>{t(`checklist.categories.${cat}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <Card key={n} className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300 shadow-2xs space-y-4 max-w-lg mx-auto my-6">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">{t('checklist.empty_no_items')}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {t('checklist.empty_no_items_desc')}
                </p>
              </div>
              {hasPermission('settings.write') && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs flex items-center gap-1.5 shadow-xs mx-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('checklist.add_item')}
                  </Button>
                </div>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">{t('checklist.empty_filtered')}</p>
              <p className="text-xs text-slate-400">{t('checklist.filter_no_results_hint')}</p>
              {(searchQuery || selectedCategory !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 mt-2"
                >
                  {t('checklist.clear_filter')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const title = isThai ? item.titleTh : item.titleEn;
                const specs = isThai ? item.specsTh : item.specsEn;
                const qcReason = isThai ? item.qcReasonTh : item.qcReasonEn;

                return (
                  <Card
                    key={item.id}
                    className={`transition-all border hover:shadow-xs ${
                      item.status === 'READY'
                        ? 'border-emerald-200 bg-white'
                        : item.status === 'ORDERED'
                        ? 'border-sky-200 bg-white'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-slate-100">
                              {getCategoryIcon(item.category)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {t(`checklist.categories.${item.category}`)}
                            </span>
                            {getPriorityBadge(item.priority)}
                          </div>
                          <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                            {title}
                          </CardTitle>
                        </div>

                        {/* Status Selector Pill Buttons */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          {(['NEEDED', 'ORDERED', 'READY'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(item.id, st)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                item.status === st
                                  ? st === 'READY'
                                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                    : st === 'ORDERED'
                                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                                    : 'bg-amber-600 text-white font-semibold shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {t(`checklist.status.${st}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Technical Specs Box */}
                      {specs && (
                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Info className="h-3 w-3 text-slate-400" />
                            {t('checklist.specs_label')}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{specs}</p>
                        </div>
                      )}

                      {/* QC Rationale Box */}
                      {qcReason && (
                        <div className="bg-orange-50/60 rounded-lg p-2.5 border border-orange-100/80">
                          <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3 text-orange-500" />
                            {t('checklist.qc_reason_label')}
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed">{qcReason}</p>
                        </div>
                      )}

                      {/* Price and Notes Footer */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="font-medium text-slate-400">{t('checklist.price_label')}:</span>
                          <span className="font-semibold text-slate-700">{item.estimatedPrice}</span>
                        </div>

                        {hasPermission('settings.write') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="h-7 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Pre-Cook QC Checklist */}
        <TabsContent value="pre_cook" className="space-y-4 outline-none">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-600" />
                    {t('checklist.pre_cook.title')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    {t('checklist.pre_cook.subtitle')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPreCook}
                  className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  {t('checklist.pre_cook.reset_btn')}
                </Button>
              </div>

              {/* Progress Indicator */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">{t('checklist.pre_cook.progress')}</span>
                  <span
                    className={`font-bold ${
                      preCookPercent === 100 ? 'text-emerald-600' : 'text-orange-600'
                    }`}
                  >
                    {preCookCompletedCount} / {preCookItems.length} ({preCookPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      preCookPercent === 100 ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${preCookPercent}%` }}
                  />
                </div>
                {preCookPercent === 100 && (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('checklist.pre_cook.all_ready')}
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="space-y-3">
                {preCookItems.map((step, idx) => {
                  const isChecked = Boolean(preCookChecks[step.id]);
                  return (
                    <div
                      key={step.id}
                      onClick={() => handleTogglePreCook(step.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center mt-0.5 border transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-slate-400 mr-2">0{idx + 1}.</span>
                        <span className={isChecked ? 'line-through text-slate-500 font-normal' : 'font-medium'}>
                          {step.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Food Science & Why Equipment Matters */}
        <TabsContent value="why_needed" className="space-y-4 outline-none">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-600" />
                {t('checklist.why_needed_guide.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Point 1: 0.1g Scale */}
                <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
                    <Scale className="h-4 w-4 text-sky-600" />
                    {t('checklist.why_needed_guide.point_1_title')}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('checklist.why_needed_guide.point_1_desc')}
                  </p>
                </div>

                {/* Point 2: 10-15kg Scale */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <Layers className="h-4 w-4 text-amber-600" />
                    {t('checklist.why_needed_guide.point_2_title')}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('checklist.why_needed_guide.point_2_desc')}
                  </p>
                </div>

                {/* Point 3: IR Laser Thermometer */}
                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                    <Thermometer className="h-4 w-4 text-orange-600" />
                    {t('checklist.why_needed_guide.point_3_title')}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('checklist.why_needed_guide.point_3_desc')}
                  </p>
                </div>

                {/* Point 4: Multi-needle Pricker */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <Flame className="h-4 w-4 text-emerald-600" />
                    {t('checklist.why_needed_guide.point_4_title')}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('checklist.why_needed_guide.point_4_desc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Equipment Item Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {t('checklist.add_item')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">ชื่ออุปกรณ์ (ไทย)</Label>
              <Input
                placeholder="เช่น เครื่องวัดอุณหภูมิน้ำมัน"
                value={newItem.titleTh}
                onChange={(e) => setNewItem({ ...newItem, titleTh: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Equipment Name (English)</Label>
              <Input
                placeholder="e.g. Laser Thermometer"
                value={newItem.titleEn}
                onChange={(e) => setNewItem({ ...newItem, titleEn: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">หมวดหมู่</Label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="MEASUREMENT">ชั่งตวงวัด & อุณหภูมิ</option>
                  <option value="PREP">เตรียม & บั้ง/จิ้มหนัง</option>
                  <option value="FRYING">ทอด & สะเด็ดน้ำมัน</option>
                  <option value="STORAGE">จัดเก็บ & บรรจุภัณฑ์</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">ความสำคัญ</Label>
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="HIGH">จำเป็นเร่งด่วน (High)</option>
                  <option value="MEDIUM">สำคัญปานกลาง (Medium)</option>
                  <option value="LOW">เสริมประสิทธิภาพ (Low)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">สเปกที่แนะนำ</Label>
              <Input
                placeholder="เช่น พิกัด 0.1g - 3kg, จอ LCD"
                value={newItem.specsTh}
                onChange={(e) => setNewItem({ ...newItem, specsTh: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">เหตุผลเชิงคุณภาพอาหาร (QC)</Label>
              <Input
                placeholder="เช่น ป้องกันความเค็มเพี้ยน"
                value={newItem.qcReasonTh}
                onChange={(e) => setNewItem({ ...newItem, qcReasonTh: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">ช่วงราคาประมาณ</Label>
              <Input
                placeholder="เช่น 150 - 300 บาท"
                value={newItem.estimatedPrice}
                onChange={(e) => setNewItem({ ...newItem, estimatedPrice: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleAddItem}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
