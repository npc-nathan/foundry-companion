'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { rewriteRelayContent } from '@/lib/relay-html';
import { toast } from 'sonner';
import { Send, MessageSquare } from 'lucide-react';

interface ChatSpeaker {
  scene?: string;
  actor?: string;
  token?: string;
  alias?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  speaker?: string | ChatSpeaker;
  author?: { id: string; name: string };
  type: number | string;
  whisper?: string | unknown[];
  timestamp?: string | number;
  isRoll?: boolean;
  flavor?: string;
}

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

  const messages: ChatMessage[] = [
    ...(((rawMessages as { data?: { messages?: unknown[] } })?.data?.messages as ChatMessage[]) ||
      []),
  ].reverse();

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
      <div className="mb-3">
        <h1 className="text-lg font-heading font-bold heading-themed heading-accent heading-accent-if-defined">Chat</h1>
        <p className="text-xs text-muted-foreground">Game chat</p>
      </div>

      <Card className="flex-1 overflow-hidden mb-3">
        <CardContent className="p-0 h-full">
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
            <div className="h-full overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className="flex items-start gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] px-1 py-0 ${getChatTypeColor(msg.type)}`}
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
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: rewriteRelayContent(msg.content) }} />
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
          )}
        </CardContent>
      </Card>

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
  );
}
