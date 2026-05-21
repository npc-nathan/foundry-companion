'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/chat/UserAvatar';
import { useStore } from '@/lib/store';
import { PartyManager } from '@/components/chat/PartyManager';
import type { FoundryUser, Party } from '@/lib/chat-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Users, Hash, Lock, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UserListProps {
  users: FoundryUser[];
  currentUserId?: string;
  onWhisperUser: (userId: string) => void;
  onPartySelect: (party: Party) => void;
}

export function UserList({ users, currentUserId, onWhisperUser, onPartySelect }: UserListProps) {
  const activeUserDm = useStore((s) => s.activeUserDm);
  const activePartyDm = useStore((s) => s.activePartyDm);
  const setActiveUserDm = useStore((s) => s.setActiveUserDm);
  const setActivePartyDm = useStore((s) => s.setActivePartyDm);
  const mutedUsers = useStore((s) => s.mutedUsers);
  const parties = useStore((s) => s.parties);

  const [partyManagerOpen, setPartyManagerOpen] = useState(false);

  const online = users.filter((u) => u.active && u.id !== currentUserId);
  const offline = users.filter((u) => !u.active && u.id !== currentUserId);

  return (
    <>
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <MessageSquare className="h-3 w-3 inline mr-1" />
            Chat
          </h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {/* General channel */}
            <button
              onClick={() => {
                setActiveUserDm(null);
                setActivePartyDm(null);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                activeUserDm === null && activePartyDm === null
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              <Hash className="h-4 w-4 shrink-0" />
              <span>General</span>
            </button>

            {/* Divider */}
            <div className="py-1">
              <div className="h-px bg-border" />
            </div>

            {/* Online users */}
            {online.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">
                    Online — {online.length}
                  </span>
                </div>
                {online.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    isActive={activeUserDm === user.id && activePartyDm === null}
                    isMuted={mutedUsers.includes(user.id)}
                    onClick={() => {
                      setActiveUserDm(user.id);
                      setActivePartyDm(null);
                      onWhisperUser(user.id);
                    }}
                    onWhisper={() => {
                      setActiveUserDm(user.id);
                      setActivePartyDm(null);
                      onWhisperUser(user.id);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Offline users */}
            {offline.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Offline — {offline.length}
                  </span>
                </div>
                {offline.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    isActive={activeUserDm === user.id && activePartyDm === null}
                    isMuted={mutedUsers.includes(user.id)}
                    onClick={() => {
                      setActiveUserDm(user.id);
                      setActivePartyDm(null);
                      onWhisperUser(user.id);
                    }}
                    onWhisper={() => {
                      setActiveUserDm(user.id);
                      setActivePartyDm(null);
                      onWhisperUser(user.id);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Parties section */}
            {(parties.length > 0 || true) && (
              <>
                <div className="py-1">
                  <div className="h-px bg-border" />
                </div>
                <div className="mb-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Parties
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span
                          onClick={() => setPartyManagerOpen(true)}
                          className="h-4 w-4 flex items-center justify-center rounded hover:bg-accent-foreground/10 cursor-pointer"
                          aria-label="Manage parties"
                        >
                          <Plus className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        Manage parties
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {parties.length === 0 ? (
                    <button
                      onClick={() => setPartyManagerOpen(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      <span>Create a party</span>
                    </button>
                  ) : (
                    parties.map((party) => (
                      <PartyListItem
                        key={party.id}
                        party={party}
                        isActive={activePartyDm?.id === party.id}
                        onClick={() => {
                          setActivePartyDm(party);
                          setActiveUserDm(null);
                          onPartySelect(party);
                        }}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <PartyManager
        open={partyManagerOpen}
        onOpenChange={setPartyManagerOpen}
        users={users}
        currentUserId={currentUserId}
      />
    </>
  );
}

function UserListItem({
  user,
  isActive,
  isMuted,
  onClick,
  onWhisper,
}: {
  user: FoundryUser;
  isActive: boolean;
  isMuted: boolean;
  onClick: () => void;
  onWhisper: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer group',
        isActive
          ? 'bg-accent text-accent-foreground'
          : isMuted
            ? 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
      onClick={onClick}
    >
      <UserAvatar name={user.name} color={user.color} online={user.active} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('truncate text-xs', isMuted && 'line-through')}>{user.name}</span>
          {user.character?.name && (
            <span className="text-[10px] text-muted-foreground/60 truncate hidden group-hover:inline">
              ({user.character.name})
            </span>
          )}
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onWhisper();
          }}
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'h-5 w-5 flex items-center justify-center rounded hover:bg-accent-foreground/10',
          )}
          aria-label={`Whisper to ${user.name}`}
        >
          <Lock className="h-3 w-3" />
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {`Whisper to ${user.name}`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function PartyListItem({
  party,
  isActive,
  onClick,
}: {
  party: Party;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
      onClick={onClick}
    >
      <Users className="h-4 w-4 shrink-0" style={{ color: party.color }} />
      <div className="flex-1 min-w-0 text-left">
        <span className="truncate text-xs">{party.name}</span>
      </div>
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground">
        {party.memberIds.length}
      </span>
    </button>
  );
}
