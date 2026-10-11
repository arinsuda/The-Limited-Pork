import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Star,
  Layers,
  FlaskConical,
  Trash2,
  Pencil,
  Video,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmModal } from '@/shared/ui/confirm-modal';
import { RecipeFormModal } from './RecipeFormModal';
import { useAuthStore } from '@/features/auth/auth-store';
import { Page, PageHeader, Toolbar, ChipGroup, Chip, ResponsiveGrid, EmptyState } from '@/shared/ui/page';
import { toast } from 'sonner';

interface RecipeTag {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
}

interface RecipeSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sourceUrl: string | null;
  status: 'DRAFT' | 'TESTING' | 'APPROVED' | 'ARCHIVED';
  currentVersionNo: number;
  trialCount: number;
  latestTrialDate: string | null;
  bestOverallScore: number | null;
  coverUrl: string | null;
  tags?: RecipeTag[] | null;
  createdAt: string;
}

interface RecipeListResponse {
  data: RecipeSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function RecipeListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeSummary | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);

  const handleOpenEdit = async (rec: RecipeSummary) => {
    try {
      const detail = await http.get(`/recipes/${rec.id}`);
      setEditingRecipe(detail);
    } catch {
      setEditingRecipe(rec);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (recipeId: string) => http.delete(`/recipes/${recipeId}`),
    onSuccess: () => {
      toast.success(t('recipes.recipe_deleted'));
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || t('common.error'));
    },
  });

  // Fetch Recipe Tags master data
  const { data: recipeTags = [] } = useQuery<RecipeTag[]>({
    queryKey: ['masterdata', 'lookups', 'RECIPE_TAG'],
    queryFn: () => http.get('/lookups?category=RECIPE_TAG'),
  });

  const { data: response, isLoading } = useQuery<RecipeListResponse>({
    queryKey: ['recipes', 'list', search, selectedStatus, selectedTagId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedTagId) params.set('tagId', selectedTagId);
      params.set('pageSize', '50');
      return http.get(`/recipes?${params.toString()}`);
    },
  });

  const recipes = response?.data ?? [];

  const getStatusBadge = (status: RecipeSummary['status']) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">{t('recipes.status_approved')}</Badge>;
      case 'TESTING':
        return <Badge variant="warning">{t('recipes.status_testing')}</Badge>;
      case 'ARCHIVED':
        return <Badge variant="secondary">{t('recipes.status_archived')}</Badge>;
      default:
        return <Badge variant="outline">{t('recipes.status_draft')}</Badge>;
    }
  };

  const statusFilters = [
    { key: '', label: t('common.total') },
    { key: 'TESTING', label: t('recipes.status_testing') },
    { key: 'APPROVED', label: t('recipes.status_approved') },
    { key: 'DRAFT', label: t('recipes.status_draft') },
  ];

  return (
    <Page>
      {/* Page Header */}
      <PageHeader
        title={t('recipes.title')}
        subtitle={t('recipes.subtitle')}
        icon={UtensilsCrossed}
        actions={
          hasPermission('recipes.write') ? (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="shadow-md shadow-orange-500/20 font-semibold touch-target"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('recipes.create_button')}
            </Button>
          ) : undefined
        }
      />

      {/* Filters Toolbar */}
      <Toolbar>
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 md:h-9 text-xs sm:text-sm"
          />
        </div>

        {/* Status Filter Chips */}
        <ChipGroup>
          {statusFilters.map((sf) => (
            <Chip
              key={sf.key}
              shape="tab"
              active={selectedStatus === sf.key}
              onClick={() => setSelectedStatus(sf.key)}
            >
              {sf.label}
            </Chip>
          ))}
        </ChipGroup>
      </Toolbar>

      {/* Recipe Tag Filter Chips */}
      {recipeTags.length > 0 && (
        <ChipGroup label={t('recipes.filter_tags')}>
          <Chip
            shape="pill"
            tone="dark"
            active={selectedTagId === ''}
            onClick={() => setSelectedTagId('')}
          >
            {t('common.all')}
          </Chip>
          {recipeTags.map((tag) => (
            <Chip
              key={tag.id}
              shape="pill"
              tone="primary"
              active={selectedTagId === tag.id}
              onClick={() => setSelectedTagId(selectedTagId === tag.id ? '' : tag.id)}
            >
              {i18n.language === 'th' ? tag.nameTh : tag.nameEn}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {/* Recipe Grid */}
      {isLoading ? (
        <ResponsiveGrid preset="cards">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="overflow-hidden border border-slate-200 bg-white space-y-0">
              <div className="h-32 sm:h-36 bg-slate-100 relative p-2.5 flex justify-between">
                <Skeleton className="h-5 w-16 rounded bg-slate-200" />
                <Skeleton className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
              <CardHeader className="p-4 pb-2 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardHeader>
              <div className="px-4 pb-2 flex gap-1">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <CardContent className="px-4 pb-4 pt-1 space-y-3">
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                  <Skeleton className="h-7 rounded" />
                  <Skeleton className="h-7 rounded" />
                  <Skeleton className="h-7 rounded" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={t('common.no_data')}
          description={selectedTagId ? t('recipes.empty_filtered') : t('recipes.empty_subtitle')}
          action={
            hasPermission('recipes.write') ? (
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t('recipes.create_button')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ResponsiveGrid preset="cards">
          {recipes.map((rec) => (
            <Card
              key={rec.id}
              className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between border-slate-200"
            >
              <div>
                {/* Card Cover Banner */}
                <div className="h-32 sm:h-36 bg-gradient-to-tr from-amber-600 to-orange-500 relative flex items-center justify-center overflow-hidden">
                  {rec.coverUrl ? (
                    <img
                      src={rec.coverUrl}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-white/80 flex flex-col items-center">
                      <Sparkles className="h-8 sm:h-10 w-8 sm:w-10 stroke-1 mb-1 text-amber-200" />
                      <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-100">
                        {rec.tags?.some((t) => t.code === 'DIPPING_SAUCE')
                          ? 'Dipping Sauce Formula'
                          : 'Crispy Pork Formula'}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
                    {rec.code}
                  </div>

                  {rec.sourceUrl && (
                    <div
                      className="absolute bottom-2.5 right-2.5 bg-red-600/90 text-white p-1 rounded-md shadow-xs backdrop-blur-xs flex items-center gap-1 text-[10px] font-semibold px-1.5"
                      title={t('recipes.source_link')}
                    >
                      <Video className="h-3 w-3" />
                      <span>Video</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">{getStatusBadge(rec.status)}</div>
                </div>

                {/* Card Details */}
                <CardHeader className="p-3.5 sm:p-4 pb-2">
                  <CardTitle className="text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {rec.name}
                  </CardTitle>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {rec.description || t('recipes.no_description')}
                  </p>
                </CardHeader>

                {/* Recipe Tags Badges */}
                {rec.tags && rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3.5 sm:px-4 pb-2">
                    {rec.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-200"
                      >
                        {i18n.language === 'th' ? tag.nameTh : tag.nameEn}
                      </Badge>
                    ))}
                  </div>
                )}

                <CardContent className="px-3.5 sm:px-4 pb-3 sm:pb-4 pt-1 space-y-3">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('common.version')}</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Layers className="h-3 w-3 text-slate-400" />v{rec.currentVersionNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('recipes.trials_count')}</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <FlaskConical className="h-3 w-3 text-slate-400" />
                        {rec.trialCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('recipes.best_score')}</span>
                      <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {typeof rec.bestOverallScore === 'number' ? rec.bestOverallScore.toFixed(1) : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Buttons */}
              <div className="p-3.5 sm:p-4 pt-0 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/recipes/${rec.id}`)}
                  className="flex-1 text-xs font-medium justify-between group-hover:border-orange-500 group-hover:text-orange-600 touch-target"
                >
                  <span>{t('common.view')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                {hasPermission('recipes.write') && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(rec);
                      }}
                      className="h-9 w-9 text-slate-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 shrink-0 touch-target"
                      title={t('recipes.action_edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecipeToDelete(rec);
                      }}
                      className="h-9 w-9 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shrink-0 touch-target"
                      title={t('recipes.action_delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      )}

      {/* Create Modal */}
      <RecipeFormModal open={isModalOpen} onOpenChange={setIsModalOpen} mode="create" />

      {/* Edit Modal */}
      {editingRecipe && (
        <RecipeFormModal
          open={Boolean(editingRecipe)}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          mode="edit"
          recipeId={editingRecipe.id}
          existingRecipeName={editingRecipe.name}
          initialRecipe={editingRecipe}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(recipeToDelete)}
        onOpenChange={(open) => !open && setRecipeToDelete(null)}
        title={t('recipes.delete_confirm_title')}
        description={
          recipeToDelete
            ? t('recipes.delete_confirm_desc', {
                name: recipeToDelete.name,
                code: recipeToDelete.code,
              })
            : undefined
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (recipeToDelete) {
            deleteMutation.mutate(recipeToDelete.id);
          }
        }}
      />
    </Page>
  );
}
