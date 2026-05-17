'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, MessageSquare, Globe, Lock, Users } from 'lucide-react';

type ChatMode = 'ic' | 'ooc' | 'whisper';

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
  user?: string;
  isRoll?: boolean;
  flavor?: string;
}

interface FoundryUser {
  id: string;
  name: string;
  isGM: boolean;
  active: boolean;
}

function getSpeakerLabel(msg: ChatMessage): string | null {
  const s = msg.speaker;
  if (!s) {
    // Fallback to author name
    if (msg.author?.name) return msg.author.name;
    return null;
  }
  if (typeof s === 'string') return s;
  return s.alias || msg.author?.name || s.actor || s.token || null;
}

function getChatTypeLabel(type: number | string): string {
  // Handle string types from Foundry
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

export default function GMChatPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('ic');
  const [whisperTarget, setWhisperTarget] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawMessages, isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => relay.getChatMessages(50),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => relay.getUsers(),
  });

  const msgData = rawMessages as { data?: { messages?: ChatMessage[] } } | undefined;
  const messages: ChatMessage[] = [...(msgData?.data?.messages || [])].reverse();

  const userData = rawUsers as { data?: FoundryUser[] } | undefined;
  const foundryUsers: FoundryUser[] = userData?.data || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMutation = useMutation({
    mutationFn: (params: {
      content: string;
      whisper?: string;
      speaker?: string;
      chatType?: number;
      alias?: string;
    }) => relay.chat(params.content, params.whisper, params.speaker, params.chatType, params.alias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setMessage('');
    },
    onError: (err) => toast.error(String(err)),
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (mode === 'whisper' && whisperTarget) {
      sendMutation.mutate({ content: trimmed, whisper: whisperTarget, chatType: 3 });
    } else if (mode === 'ic') {
      sendMutation.mutate({ content: trimmed, chatType: 1 });
    } else {
      sendMutation.mutate({ content: trimmed, chatType: 0 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function getWhisperLabel(whisperVal: unknown): string {
    if (Array.isArray(whisperVal) && whisperVal.length > 0) {
      const id = String(whisperVal[0]);
      const user = foundryUsers.find((u) => u.id === id);
      return user?.name || id;
    }
    if (typeof whisperVal === 'string') return whisperVal;
    if (whisperVal && typeof whisperVal === 'object' && !Array.isArray(whisperVal)) {
      const w = whisperVal as Record<string, unknown>;
      return String(w?.user || w?.name || '');
    }
    return '';
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground">Game chat console</p>
        </div>
      </div>

      {/* Messages area */}
      <Card className="flex-1 overflow-hidden mb-4">
        <CardContent className="p-0 h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No messages yet
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-2">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className="flex items-start gap-3 text-sm">
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] px-1.5 py-0 ${getChatTypeColor(msg.type)}`}
                  >
                    {getChatTypeLabel(msg.type)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const label = getSpeakerLabel(msg);
                      return label ? (
                        <span className="font-medium text-xs text-muted-foreground mr-2">
                          {label}:
                        </span>
                      ) : null;
                    })()}
                    {msg.flavor && (
                      <span className="text-xs italic text-muted-foreground block">
                        {msg.flavor}
                      </span>
                    )}
                    <span className="text-sm whitespace-pre-wrap break-words">{msg.content}</span>
                    {(() => {
                      const whisperStr = getWhisperLabel(msg.whisper);
                      return whisperStr ? (
                        <span className="text-[10px] text-yellow-500 ml-1">(to: {whisperStr})</span>
                      ) : null;
                    })()}
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

      {/* Input area */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Button
                variant={mode === 'ic' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMode('ic')}
              >
                <Globe className="h-3 w-3 mr-1" />
                IC
              </Button>
              <Button
                variant={mode === 'ooc' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMode('ooc')}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                OOC
              </Button>
              <Button
                variant={mode === 'whisper' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMode('whisper')}
              >
                <Lock className="h-3 w-3 mr-1" />
                Whisper
              </Button>
            </div>

            {mode === 'whisper' && (
              <Select value={whisperTarget} onValueChange={(v) => v && setWhisperTarget(v)}>
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {foundryUsers
                    .filter((u) => !u.isGM)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {u.name}
                        </span>
                      </SelectItem>
                    ))}
                  {foundryUsers.filter((u) => !u.isGM).length === 0 && (
                    <SelectItem value="gm" disabled>
                      No non-GM users found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'ic'
                  ? 'Speak in character...'
                  : mode === 'ooc'
                    ? 'Say something out of character...'
                    : `Whisper to ${whisperTarget || 'a player'}...`
              }
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !message.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
