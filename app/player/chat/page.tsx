'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { rewriteRelayContent } from '@/lib/relay-html';
import { toast } from 'sonner';
import { Send, MessageSquare, Hash } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/chat/UserAvatar';
import { cn } from '@/lib/utils';
import type { ChatMessage, FoundryUser } from '@/lib/chat-types';

function getSpeakerLabel(msg: ChatMessage): string | null {
  const s = msg.speaker;
  if (!s) {
    if (msg.author?.name) return msg.author.name;
    return null;
  }
  if (typeof s === 'string') return s;
  return s.alias || msg.author?.name || s.actor || s.token || null;
}

function getChatTypeLabel(type: number | string): string {
  if (type === 'base' || type === 'OOC' || type === 0) return 'OOC';
  if (type === 'IC' || type === 1) return 'IC';
  if (type === 'Emote' || type === 2) return 'Emote';
  if (type === 'Whisper' || type === 3) return 'Whisper';
  if (type === 'Roll' || type === 4) return 'Roll';
  if (type === 'Blind' || type === 5) return 'Blind';
  return 'Chat';
}

function getChatTypeColor(type: number | string): string {
  if (type === 'base' || type === 'OOC' || type === 0) return 'bg-blue-500/10 text-blue-400';
  if (type === 'IC' || type === 1) return 'bg-green-500/10 text-green-400';
  if (type === 'Emote' || type === 2) return 'bg-purple-500/10 text-purple-400';
  if (type === 'Whisper' || type === 3) return 'bg-yellow-500/10 text-yellow-400';
  if (type === 'Roll' || type === 4) return 'bg-orange-500/10 text-orange-400';
  if (type === 'Blind' || type === 5) return 'bg-red-500/10 text-red-400';
  return 'bg-muted text-muted-foreground';
}

export default function PlayerChatPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawMessages, isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => relay.getChatMessages(50),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => relay.getUsers(),
  });

  const messages: ChatMessage[] = [
    ...(((rawMessages as { data?: { messages?: unknown[] } })?.data?.messages as ChatMessage[]) ||
      []),
  ].reverse();

  const userData = rawUsers as { data?: FoundryUser[] } | undefined;
  const foundryUsers: FoundryUser[] = userData?.data || [];

  const online = foundryUsers.filter((u) => u.active);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => relay.chat(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setMessage('');
    },
    onError: (err) => toast.error(String(err)),
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="mb-2 shrink-0">
        <h1 className="text-lg font-heading font-bold heading-themed heading-accent heading-accent-if-defined">
          Chat
        </h1>
        <p className="text-xs text-muted-foreground">Game chat</p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden border border-border rounded-lg bg-card">
        {/* Left sidebar — simple user list */}
        <div className="w-48 shrink-0 border-r border-border flex flex-col bg-muted/30">
          <div className="p-2 border-b border-border">
            <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              Chat
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-accent text-accent-foreground font-medium">
              <Hash className="h-4 w-4 shrink-0" />
              <span>General</span>
            </div>
            <div className="py-1">
              <div className="h-px bg-border" />
            </div>
            {foundryUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground"
              >
                <UserAvatar name={user.name} color={user.color} online={user.active} size="sm" />
                <div className="min-w-0">
                  <span className="truncate text-xs block">{user.name}</span>
                  {user.character?.name && (
                    <span className="text-[10px] text-muted-foreground/60 truncate block">
                      {user.character.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="px-3 py-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">general</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {online.length} online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  No messages
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {messages.map((msg, i) => (
                    <div key={msg.id || i} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={cn('shrink-0 text-[10px] px-1 py-0', getChatTypeColor(msg.type))}
                      >
                        {getChatTypeLabel(msg.type)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const label = getSpeakerLabel(msg);
                          return label ? (
                            <span className="font-medium text-xs text-muted-foreground mr-1">
                              {label}:
                            </span>
                          ) : null;
                        })()}
                        {msg.flavor && (
                          <span className="text-xs italic text-muted-foreground block">
                            {msg.flavor}
                          </span>
                        )}
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: rewriteRelayContent(msg.content),
                          }}
                        />
                      </div>
                      {msg.timestamp && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(Number(msg.timestamp)).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending || !message.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
