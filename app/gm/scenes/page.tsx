'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SceneStub {
  id?: string;
  _id?: string;
  name?: string;
  active?: boolean;
  thumb?: string;
  img?: string;
  background?: { src?: string };
}

function getThumbnailUrl(scene: SceneStub): string | null {
  // Priority: scene.thumb (explicit thumbnail), then background.src, then img
  const img = scene?.thumb || scene?.background?.src || scene?.img;
  if (!img || typeof img !== 'string') {
    // Try generating from scene ID as last resort
    const sceneId = scene?.id || scene?._id;
    if (sceneId) return `/api/relay/${sceneId}-thumb.webp`;
    return null;
  }
  // Proxy through the relay's /download endpoint — the [...path] catchall forwards query params
  const cleanPath = img.startsWith('/') ? img.slice(1) : img;
  return `/api/relay/download?path=${encodeURIComponent(cleanPath)}`;
}

export default function GMScenesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['structure', 'Scene'],
    queryFn: () => relay.structure('Scene', 'true') as Promise<unknown>,
  });

  const activateMutation = useMutation({
    mutationFn: (sceneId: string) => relay.activateScene({ sceneId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'Scene'] });
      toast.success('Scene activated');
    },
    onError: (err: unknown) => toast.error(`Failed to activate: ${String(err)}`),
  });

  const handleActivate = useCallback(
    (sceneId: string) => {
      activateMutation.mutate(sceneId);
    },
    [activateMutation],
  );

  const sceneEntries: SceneStub[] = (() => {
    const raw = data as { data?: { entities?: { scenes?: SceneStub[] } } } | undefined;
    // The structure endpoint returns { type, data: { entities: { scenes: [...] } } }
    if (raw?.data?.entities?.scenes && Array.isArray(raw.data.entities.scenes)) {
      return raw.data.entities.scenes;
    }
    // Fallback: flat array or data.data as array
    if (Array.isArray(raw?.data)) return raw.data as SceneStub[];
    if (Array.isArray(raw)) return raw;
    return [];
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading scenes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading scenes: {String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">Scenes</h1>
        <p className="text-sm text-muted-foreground">Manage your Foundry VTT scenes</p>
      </div>

      {sceneEntries.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No scenes found in the current world.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sceneEntries.map((scene) => {
          const sceneId = scene.id || scene._id;
          const thumb = getThumbnailUrl(scene);
          const isActive = scene.active === true;

          return (
            <Card
              key={sceneId || scene.name}
              className={`overflow-hidden ${isActive ? 'ring-2 ring-primary' : ''}`}
            >
              {thumb ? (
                <div className="aspect-video bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={scene.name || 'Scene thumbnail'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-3xl text-muted-foreground/30">
                    {scene.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm font-medium truncate">
                  {scene.name || 'Unnamed Scene'}
                  {isActive && (
                    <span className="ml-2 text-xs text-primary font-normal">Active</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isActive ? 'secondary' : 'default'}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => sceneId && handleActivate(sceneId)}
                    disabled={activateMutation.isPending || !sceneId}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
