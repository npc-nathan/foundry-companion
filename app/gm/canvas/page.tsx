'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { SceneCanvas } from '@/components/scene-canvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GMCanvasPage() {
  const queryClient = useQueryClient();

  // ─── Combined initial query: scene + tokens + walls ────
  // Fires all three in parallel, only resolves once all are ready
  const combinedQuery = useQuery({
    queryKey: ['canvas', 'initial'],
    queryFn: async () => {
      const [sceneResp, tokensResp, wallsResp] = await Promise.all([
        relay.getScene({ active: true }) as Promise<{ type: string; data: unknown[] }>,
        relay.getCanvasDocuments('tokens') as Promise<{
          type: string;
          data: TokenData[];
          sceneId: string;
        }>,
        relay.getCanvasDocuments('walls') as Promise<{
          type: string;
          data: WallData[];
          sceneId: string;
        }>,
      ]);
      return { sceneResp, tokensResp, wallsResp };
    },
    refetchOnWindowFocus: false,
  });

  // ─── Token-only refresh (separate, for real-time moves) ─
  const tokensRefresh = useQuery({
    queryKey: ['canvas', 'tokens-refresh'],
    queryFn: () =>
      relay.getCanvasDocuments('tokens') as Promise<{
        type: string;
        data: TokenData[];
        sceneId: string;
      }>,
    // Only start polling after initial load completes
    enabled: !!combinedQuery.data,
  });

  // ─── Parse scene ────────────────────────────────────────
  const scene: SceneData | null = useMemo(() => {
    const raw = (combinedQuery.data?.sceneResp as { type?: string; data?: unknown })?.data;
    if (Array.isArray(raw)) return raw[0] as SceneData;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as unknown as SceneData;
    return null;
  }, [combinedQuery.data?.sceneResp]);

  // ─── Parse tokens (use latest: refresh if available, else initial) ──
  const tokens: TokenData[] = useMemo(() => {
    const latestSource = tokensRefresh.data ?? combinedQuery.data?.tokensResp;
    if (!latestSource) return [];
    const raw = (latestSource as { type?: string; data?: unknown })?.data;
    if (Array.isArray(raw)) return raw as TokenData[];
    return [];
  }, [combinedQuery.data?.tokensResp, tokensRefresh.data]);

  // ─── Parse walls ───────────────────────────────────────
  const walls: WallData[] = useMemo(() => {
    const raw = (combinedQuery.data?.wallsResp as { type?: string; data?: unknown })?.data;
    if (Array.isArray(raw)) return raw as WallData[];
    return [];
  }, [combinedQuery.data?.wallsResp]);

  // ─── Move Token Mutation ────────────────────────────────
  const moveTokenMutation = useMutation({
    mutationFn: ({ tokenId, x, y }: { tokenId: string; x: number; y: number }) =>
      relay.updateCanvasDocument('tokens', tokenId, { x, y }, scene?._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canvas', 'tokens-refresh'] });
      queryClient.invalidateQueries({ queryKey: ['canvas', 'initial'] });
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line no-console -- diagnostic logging for token move failures
      console.error('Move token failed:', err);
      toast.error('Failed to move token');
    },
  });

  const handleTokenMove = useCallback(
    async (tokenId: string, x: number, y: number) => {
      // Clamp to scene bounds
      if (scene) {
        x = Math.max(0, Math.min(x, scene.width));
        y = Math.max(0, Math.min(y, scene.height));
      }
      await moveTokenMutation.mutateAsync({ tokenId, x, y });
    },
    [scene, moveTokenMutation],
  );

  // ─── Target Token ───────────────────────────────────────
  const targetTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      // Use execute-js to set target since there's no direct target endpoint
      await relay.executeJs(`
        const token = canvas.tokens.get("${tokenId}");
        if (token) {
          token.setTarget(!token.isTargeted, { releaseOthers: false });
        }
      `);
    },
    onSuccess: () => {
      // No need to refetch — we track locally
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line no-console -- diagnostic logging for target failures
      console.error('Target token failed:', err);
    },
  });

  const handleTargetToken = useCallback(
    async (tokenId: string) => {
      await targetTokenMutation.mutateAsync(tokenId);
    },
    [targetTokenMutation],
  );

  // ─── Active scene banner ────────────────────────────────
  const isLoading = combinedQuery.isLoading && !combinedQuery.data;
  if (!isLoading && !scene) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">Scene Canvas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive scene viewer with token management
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No active scene</p>
            <p className="text-xs text-muted-foreground/60">
              Activate a scene in Foundry VTT or select one below to view it here
            </p>
            <Button variant="outline" size="sm" onClick={() => combinedQuery.refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">{scene?.name || 'Scene Canvas'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {scene &&
              `${scene.width}×${scene.height}px · ${scene.grid.type === 0 ? 'Gridless' : scene.grid.type === 1 ? 'Square' : 'Hex'} grid (${scene.grid.size}px/${scene.grid.distance}${scene.grid.units})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Tokens: {tokens.length}
          </Badge>
          {combinedQuery.isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Scene Canvas takes the remaining height */}
      <div className="flex-1 min-h-0">
        <SceneCanvas
          scene={scene}
          tokens={tokens}
          walls={walls}
          isLoading={combinedQuery.isLoading && !combinedQuery.data}
          isTokensLoading={tokensRefresh.isLoading}
          error={
            combinedQuery.error
              ? `Scene error: ${String(combinedQuery.error)}`
              : tokensRefresh.error
                ? `Token error: ${String(tokensRefresh.error)}`
                : null
          }
          onRefreshScene={() => combinedQuery.refetch()}
          onRefreshTokens={() => {
            tokensRefresh.refetch();
          }}
          onTokenMove={handleTokenMove}
          onTargetToken={handleTargetToken}
        />
      </div>
    </div>
  );
}

// Type definitions needed at top of file
interface SceneData {
  _id: string;
  name: string;
  width: number;
  height: number;
  padding: number;
  backgroundColor: string;
  active: boolean;
  tokenVision: boolean;
  grid: {
    size: number;
    type: number;
    distance: number;
    units: string;
    color: string;
    alpha: number;
    style: string;
  };
  initial?: { x: number | null; y: number | null; scale: number | null };
  background?: { src: string | null };
}

interface TokenData {
  _id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alpha: number;
  hidden: boolean;
  locked: boolean;
  actorId?: string;
  actorLink?: boolean;
  disposition: number;
  texture?: { src?: string; scaleX?: number; scaleY?: number; rotation?: number };
  sight?: { enabled: boolean; range: number; angle: number };
  elevation: number;
  sort: number;
  displayName: number;
  bar1?: { attribute?: string };
  bar2?: { attribute?: string };
}

interface WallData {
  _id: string;
  c?: [number, number][];
  door: number;
  ds: number;
  move: number;
  sense: number;
  dir: number;
}
