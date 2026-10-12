import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Video, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';

interface YouTubePlayerFacadeProps {
  sourceUrl: string;
  title: string;
}

export function parseYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch && shortMatch[1]) return shortMatch[1];

    const longMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (longMatch && longMatch[1]) return longMatch[1];

    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) return embedMatch[1];
  } catch {}
  return null;
}

export const YouTubePlayerFacade = React.memo(function YouTubePlayerFacade({
  sourceUrl,
  title,
}: YouTubePlayerFacadeProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = useMemo(() => parseYouTubeVideoId(sourceUrl), [sourceUrl]);

  if (!videoId) return null;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs bg-white">
      <CardHeader className="py-2.5 px-4 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-red-600" />
          <CardTitle className="text-xs font-semibold text-slate-800">
            {t('recipes.video_preview')}
          </CardTitle>
        </div>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
        >
          <span>{t('recipes.source_link')}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent className="p-0 bg-black flex justify-center">
        <div className="w-full max-w-2xl aspect-video relative group">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label={t('recipes.play_video')}
              className="relative w-full h-full block cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 text-left"
            >
              {/* Thumbnail image */}
              <img
                src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                alt={title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover brightness-90 group-hover:brightness-95 group-hover:scale-105 transition-all duration-300"
              />

              {/* Dark subtle overlay */}
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />

              {/* YouTube Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-20 rounded-2xl bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200">
                  <Play className="h-7 w-7 fill-current ml-1" />
                </div>
              </div>

              {/* Bottom text banner */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white text-xs bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg">
                <span className="truncate max-w-[70%] font-medium">{title}</span>
                <span className="text-[11px] text-slate-200 font-medium shrink-0">
                  {t('recipes.play_video')}
                </span>
              </div>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

YouTubePlayerFacade.displayName = 'YouTubePlayerFacade';
