'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { rewriteRelayContent } from '@/lib/relay-html';
import { toast } from 'sonner';
import { Send, MessageSquare, Globe, Lock, Hash, Users, Paperclip, ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserList } from '@/components/chat/UserList';
import { GifPicker } from '@/components/chat/GifPicker';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { ChatMode, ChatMessage, FoundryUser, Party } from '@/lib/chat-types';

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

function getWhisperTargets(whisperVal: unknown): string[] {
  if (Array.isArray(whisperVal)) {
    return whisperVal.map((w) => String(w));
  }
  if (typeof whisperVal === 'string') {
    return whisperVal ? [whisperVal] : [];
  }
  if (whisperVal && typeof whisperVal === 'object' && !Array.isArray(whisperVal)) {
    const w = whisperVal as Record<string, unknown>;
    const id = w?.user || w?.name;
    return id ? [String(id)] : [];
  }
  return [];
}

function isWhisperBetween(msg: ChatMessage, userId1: string, userId2: string): boolean {
  const targets = getWhisperTargets(msg.whisper);
  if (targets.length === 0) return false;

  const authorId = msg.author?.id || msg.user || '';
  const authorMatches = authorId === userId1 || authorId === userId2;

  if (!authorMatches) return false;

  const otherId = authorId === userId1 ? userId2 : userId1;
  return targets.includes(otherId);
}

/** Check if a whisper message involves any member of a party */
function isWhisperInvolvingParty(
  msg: ChatMessage,
  partyMemberIds: string[],
  currentUserId: string,
): boolean {
  const targets = getWhisperTargets(msg.whisper);
  if (targets.length === 0) return false;

  const authorId = msg.author?.id || msg.user || '';
  if (!authorId) return false;

  // The author must be either the current user or a party member
  const authorInParty = authorId === currentUserId || partyMemberIds.includes(authorId);
  if (!authorInParty) return false;

  // At least one target should be a party member (or the current user)
  return targets.some((t) => t === currentUserId || partyMemberIds.includes(t));
}

export default function GMChatPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('ic');
  const [whisperTarget, setWhisperTarget] = useState('');
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevDmRef = useRef<string | null>(null);
  const prevPartyRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeUserDm = useStore((s) => s.activeUserDm);
  const activePartyDm = useStore((s) => s.activePartyDm);
  const setActiveUserDm = useStore((s) => s.setActiveUserDm);
  const setActivePartyDm = useStore((s) => s.setActivePartyDm);
  const mutedUsers = useStore((s) => s.mutedUsers);

  const { data: rawMessages, isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => relay.getChatMessages(50),
  });

  const { data: rawUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => relay.getUsers(),
  });

  const msgData = rawMessages as { data?: { messages?: ChatMessage[] } } | undefined;
  const allMessages: ChatMessage[] = [...(msgData?.data?.messages || [])].reverse();

  const userData = rawUsers as { data?: FoundryUser[] } | undefined;
  const foundryUsers: FoundryUser[] = userData?.data || [];

  // Determine current user (GM or matching clientId)
  const clientId = useStore((s) => s.config.clientId);
  const currentUser = useMemo(
    () => foundryUsers.find((u) => u.id === clientId) || foundryUsers.find((u) => u.isGM) || null,
    [foundryUsers, clientId],
  );

  // Sync mode/whisperTarget when DM target changes
  useEffect(() => {
    if (activeUserDm && prevDmRef.current !== activeUserDm) {
      prevDmRef.current = activeUserDm;
      prevPartyRef.current = null;
      setMode('whisper');
      setWhisperTarget(activeUserDm);
    } else if (activePartyDm && prevPartyRef.current !== activePartyDm.id) {
      prevPartyRef.current = activePartyDm.id;
      prevDmRef.current = null;
      setMode('whisper');
      setWhisperTarget('');
    } else if (!activeUserDm && !activePartyDm && (prevDmRef.current || prevPartyRef.current)) {
      prevDmRef.current = null;
      prevPartyRef.current = null;
      setMode('ic');
      setWhisperTarget('');
    }
  }, [activeUserDm, activePartyDm]);

  // Filter messages
  const messages = useMemo(() => {
    if (activePartyDm && currentUser) {
      // Party DM view: whispers involving any party member
      return allMessages.filter((msg) => {
        if (msg.author?.id && mutedUsers.includes(msg.author.id)) return false;
        const isWhisper = msg.type === 3 || msg.type === 'Whisper';
        if (!isWhisper) return false;
        return isWhisperInvolvingParty(msg, activePartyDm.memberIds, currentUser.id);
      });
    }

    if (activeUserDm) {
      // User DM view
      if (!currentUser) return [];
      return allMessages.filter((msg) => {
        const isWhisper = msg.type === 3 || msg.type === 'Whisper';
        if (!isWhisper) return false;
        if (msg.author?.id && mutedUsers.includes(msg.author.id)) return false;
        return isWhisperBetween(msg, currentUser.id, activeUserDm);
      });
    }

    // General view: all non-whisper + whispers involving current user
    return allMessages.filter((msg) => {
      if (msg.author?.id && mutedUsers.includes(msg.author.id)) return false;
      if (msg.type === 3 || msg.type === 'Whisper') {
        if (!currentUser) return false;
        return isWhisperBetween(msg, currentUser.id, msg.author?.id || '');
      }
      return true;
    });
  }, [allMessages, activeUserDm, activePartyDm, currentUser, mutedUsers]);

  // Get selected display info
  const selectedUserName = useMemo(() => {
    if (activePartyDm) return activePartyDm.name;
    if (!activeUserDm) return null;
    return foundryUsers.find((u) => u.id === activeUserDm)?.name || activeUserDm;
  }, [activeUserDm, activePartyDm, foundryUsers]);

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

    if (activePartyDm) {
      // Send whisper to ALL party members
      const memberIds = activePartyDm.memberIds;
      if (memberIds.length === 0) {
        toast.error('Party has no members');
        return;
      }
      // Send one whisper per member
      for (const memberId of memberIds) {
        sendMutation.mutate({ content: trimmed, whisper: memberId, chatType: 3 });
      }
      setMessage('');
      return;
    }

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

  const handleGifSelect = useCallback((imgHtml: string) => {
    // Insert at cursor position or append
    setMessage((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n${imgHtml}` : imgHtml;
    });
    setGifPickerOpen(false);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so the same file can be re-selected
    e.target.value = '';

    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/chat-upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      // Insert as HTML <img> tag using the download URL
      const imgHtml = `<img src="${data.url}" alt="${data.filename}" class="chat-image" />`;
      setMessage((prev) => {
        const trimmed = prev.trimEnd();
        return trimmed ? `${trimmed}\n${imgHtml}` : imgHtml;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setFileUploading(false);
    }
  }, []);

  const handleWhisperUser = (userId: string) => {
    setActiveUserDm(userId);
    setActivePartyDm(null);
    setMode('whisper');
    setWhisperTarget(userId);
  };

  const handlePartySelect = (party: Party) => {
    setActivePartyDm(party);
    setActiveUserDm(null);
    setMode('whisper');
    setWhisperTarget('');
  };

  const showGeneralTab = activeUserDm !== null || activePartyDm !== null;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">
            Chat
          </h1>
          <p className="text-sm text-muted-foreground">
            {activePartyDm
              ? `Party whisper: ${activePartyDm.name} (${activePartyDm.memberIds.length} members)`
              : activeUserDm && selectedUserName
                ? `Whispering to ${selectedUserName}`
                : 'Game chat console'}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden border border-border rounded-lg bg-card">
        {/* Left sidebar — user list */}
        <UserList
          users={foundryUsers}
          currentUserId={currentUser?.id}
          onWhisperUser={handleWhisperUser}
          onPartySelect={handlePartySelect}
        />

        {/* Right area — messages + input */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activePartyDm ? (
                <Users className="h-4 w-4 text-orange-400" />
              ) : activeUserDm ? (
                <Lock className="h-4 w-4 text-yellow-400" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {activePartyDm
                  ? activePartyDm.name
                  : selectedUserName
                    ? `@${selectedUserName}`
                    : 'general'}
              </span>
            </div>

            {/* Back to general button when in DM/Party view */}
            {showGeneralTab && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setActiveUserDm(null);
                  setActivePartyDm(null);
                  setMode('ic');
                  setWhisperTarget('');
                }}
              >
                <Hash className="h-3 w-3 mr-1" />
                General
              </Button>
            )}
          </div>

          {/* Messages feed */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {activePartyDm
                    ? `No whispers for ${activePartyDm.name} yet`
                    : activeUserDm
                      ? `No whispers with ${selectedUserName} yet`
                      : 'No messages yet'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {messages.map((msg, i) => (
                    <div key={msg.id || i} className="flex items-start gap-3 text-sm">
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px] px-1.5 py-0',
                          getChatTypeColor(msg.type),
                        )}
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
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: rewriteRelayContent(msg.content),
                          }}
                        />
                        {activeUserDm === null &&
                          activePartyDm === null &&
                          (() => {
                            const targets = getWhisperTargets(msg.whisper);
                            return targets.length > 0 ? (
                              <span className="text-[10px] text-yellow-500 ml-1">
                                (to: {targets.join(', ')})
                              </span>
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
              </ScrollArea>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 shrink-0 relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Button
                  variant={mode === 'ic' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (activeUserDm) {
                      setActiveUserDm(null);
                      setActivePartyDm(null);
                    }
                    setMode('ic');
                  }}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  IC
                </Button>
                <Button
                  variant={mode === 'ooc' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (activeUserDm) {
                      setActiveUserDm(null);
                      setActivePartyDm(null);
                    }
                    setMode('ooc');
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  OOC
                </Button>
                <Button
                  variant={mode === 'whisper' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    mode === 'whisper' &&
                      (activeUserDm || activePartyDm) &&
                      'bg-yellow-600/20 text-yellow-400',
                  )}
                  onClick={() => {
                    if (!activeUserDm && !activePartyDm) {
                      setMode('whisper');
                    }
                  }}
                >
                  <Lock className="h-3 w-3 mr-1" />
                  {activePartyDm
                    ? activePartyDm.name
                    : activeUserDm && selectedUserName
                      ? selectedUserName
                      : 'Whisper'}
                </Button>
              </div>

              <div className="flex items-center gap-1 ml-auto">
                <Tooltip>
                  <TooltipTrigger>
                    <span
                      onClick={() => setGifPickerOpen((prev) => !prev)}
                      className="h-7 w-7 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Add GIF"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Add GIF
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <span
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'h-7 w-7 inline-flex items-center justify-center cursor-pointer',
                        fileUploading && 'opacity-50 pointer-events-none',
                      )}
                      aria-label="Upload file"
                    >
                      <Paperclip
                        className={cn(
                          'h-4 w-4 text-muted-foreground hover:text-foreground transition-colors',
                          fileUploading && 'animate-pulse',
                        )}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Upload image
                  </TooltipContent>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* GifPicker */}
            <GifPicker
              open={gifPickerOpen}
              onClose={() => setGifPickerOpen(false)}
              onSelect={handleGifSelect}
            />

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activePartyDm
                    ? `Whisper to ${activePartyDm.name}...`
                    : mode === 'ic'
                      ? 'Speak in character...'
                      : mode === 'ooc'
                        ? 'Say something out of character...'
                        : activeUserDm && selectedUserName
                          ? `Whisper to ${selectedUserName}...`
                          : 'Whisper to a player...'
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
          </div>
        </div>
      </div>
    </div>
  );
}
