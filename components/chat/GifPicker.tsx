'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [showInstruction, setShowInstruction] = useState(true);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowInstruction(true);
      return;
    }

    setLoading(true);
    setError(null);
    setShowInstruction(false);

    try {
      // Use Tenor free API key if configured, otherwise show error
      const apiKey = process.env.NEXT_PUBLIC_TENOR_API_KEY;
      if (!apiKey) {
        throw new Error('GIF search requires a Tenor API key. Set NEXT_PUBLIC_TENOR_API_KEY in .env.local');
      }

      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}` +
          `&key=${apiKey}&limit=20&media_filter=minimal&contentfilter=medium`,
      );
      if (!res.ok) throw new Error(`Tenor API error: ${res.status}`);

      const data = await res.json();
      const gifs: GifResult[] = (data.results || []).map((r: { id: string; media_formats?: { gif?: { url: string }; tinygif?: { url: string } }; itemurl?: string; title?: string }) => ({
        id: r.id,
        url: r.media_formats?.gif?.url || r.itemurl,
        preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
        title: r.title || 'GIF',
      }));

      setResults(gifs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search GIFs';
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchGifs(value), 400);
  };

  const handleSelect = (gif: GifResult) => {
    // Insert as HTML <img> tag
    const imgHtml = `<img src="${gif.url}" alt="${gif.title}" class="chat-gif" />`;
    onSelect(imgHtml);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 w-80 sm:w-96">
      <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-2 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search GIFs..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {showInstruction && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Search for GIFs to add to your message
            </div>
          )}

          {error && (
            <div className="text-center py-6 px-4">
              <p className="text-xs text-destructive mb-2">{error}</p>
              <p className="text-[10px] text-muted-foreground">
                Add{' '}
                <code className="bg-muted px-1 rounded text-[10px]">
                  NEXT_PUBLIC_TENOR_API_KEY
                </code>{' '}
                to .env.local
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Get a key at{' '}
                <a
                  href="https://developers.google.com/tenor/guides/quickstart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Google Tenor API
                </a>
              </p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="relative aspect-video rounded overflow-hidden bg-muted hover:ring-2 hover:ring-primary/50 transition-all group cursor-pointer"
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
