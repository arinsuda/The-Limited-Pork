import React from 'react';
import { useTranslation } from 'react-i18next';
import { Video } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface Tag {
  id: string;
  nameTh: string;
  nameEn: string;
}

interface RecipeBasicInfoSectionProps {
  isEditing: boolean;
  isCreatingVersion: boolean;
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  changeNote: string;
  setChangeNote: (v: string) => void;
  tags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
}

export const RecipeBasicInfoSection = React.memo(function RecipeBasicInfoSection({
  isEditing,
  isCreatingVersion,
  name,
  setName,
  code,
  setCode,
  description,
  setDescription,
  sourceUrl,
  setSourceUrl,
  changeNote,
  setChangeNote,
  tags,
  selectedTagIds,
  onToggleTag,
}: RecipeBasicInfoSectionProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Recipe Name */}
      <div className="space-y-1">
        <Label htmlFor="recipe-name" className="text-xs font-semibold text-slate-700">
          {t('recipes.recipe_name')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="recipe-name"
          placeholder={t('recipes.name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus={!isEditing && !isCreatingVersion}
        />
      </div>

      {/* Code & Description Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="recipe-code" className="text-xs font-semibold text-slate-700">
            {t('recipes.recipe_code')}{' '}
            <span className="text-[11px] text-slate-400 font-normal">
              {t('recipes.auto_code_hint')}
            </span>
          </Label>
          <Input
            id="recipe-code"
            placeholder="RCP-0001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isEditing || isCreatingVersion}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="recipe-desc" className="text-xs font-semibold text-slate-700">
            {t('recipes.recipe_desc')}
          </Label>
          <Input
            id="recipe-desc"
            placeholder={t('recipes.desc_placeholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Source URL */}
      <div className="space-y-1">
        <Label
          htmlFor="recipe-source-url"
          className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
        >
          <Video className="h-3.5 w-3.5 text-red-500" />
          <span>{t('recipes.source_url')}</span>
        </Label>
        <Input
          id="recipe-source-url"
          placeholder="เช่น https://www.youtube.com/watch?v=... หรือ TikTok / Facebook / เว็บไซต์"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            {t('recipes.recipe_tags')}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleTag(tag.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    selected
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selected ? '✓ ' : '+ '}
                  {i18n.language === 'th' ? tag.nameTh : tag.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Change Note (for editing or versioning) */}
      {(isCreatingVersion || isEditing) && (
        <div className="space-y-1 p-3 bg-amber-50/70 rounded-lg border border-amber-200/80">
          <Label htmlFor="recipe-change-note" className="text-xs font-semibold text-amber-900">
            {t('recipes.change_note')}{' '}
            {isCreatingVersion && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="recipe-change-note"
            placeholder={t('recipes.change_note_placeholder')}
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            className="bg-white border-amber-300"
            required={isCreatingVersion}
          />
        </div>
      )}
    </div>
  );
});

RecipeBasicInfoSection.displayName = 'RecipeBasicInfoSection';
