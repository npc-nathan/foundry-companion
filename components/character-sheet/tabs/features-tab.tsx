'use client';

import { rewriteRelayContent } from '@/lib/relay-html';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { SheetTabProps } from './types';

export function FeaturesTab({ data }: SheetTabProps) {
  const { traits } = data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" /> Features & Traits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {traits.biography && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Biography
              </h4>
              <div
                className="text-sm prose-sm prose-invert max-w-none [&_p]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: rewriteRelayContent(traits.biography),
                }}
              />
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Damage Resistances
            </h4>
            <p className="text-sm">
              {traits.dr.join(', ') || 'None'}
              {traits.drCustom && ` (${traits.drCustom})`}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Condition Immunities
            </h4>
            <p className="text-sm">{traits.ci.join(', ') || 'None'}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Languages
            </h4>
            <p className="text-sm">
              {traits.languages.join(', ') || 'None'}
              {traits.languagesCustom && ` (${traits.languagesCustom})`}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Senses
            </h4>
            <p className="text-sm">{traits.senses}</p>
          </div>
          {traits.resources.map((r, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                {r.label}
              </h4>
              <p className="text-sm">
                {r.value}/{r.max}
                {r.sr && ' (Short Rest)'}
                {r.lr && ' (Long Rest)'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
