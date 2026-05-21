'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/lib/store';
import { UserAvatar } from '@/components/chat/UserAvatar';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Edit3, X, Check, Users } from 'lucide-react';
import type { FoundryUser, Party } from '@/lib/chat-types';

interface PartyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: FoundryUser[];
  currentUserId?: string;
}

export function PartyManager({ open, onOpenChange, users, currentUserId }: PartyManagerProps) {
  const parties = useStore((s) => s.parties);
  const addParty = useStore((s) => s.addParty);
  const removeParty = useStore((s) => s.removeParty);
  const addPartyMember = useStore((s) => s.addPartyMember);
  const removePartyMember = useStore((s) => s.removePartyMember);

  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [newPartyName, setNewPartyName] = useState('');

  // Reset editing state when dialog opens using key pattern (Dialog key prop handles this)

  const availableUsers = users.filter((u) => u.id !== currentUserId);

  const handleCreateParty = () => {
    const name = newPartyName.trim();
    if (!name) return;
    const party: Party = {
      id: `party_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      memberIds: [],
      color: `hsl(${Math.floor(Math.random() * 360)}, 60%, 50%)`,
    };
    addParty(party);
    setNewPartyName('');
  };

  const togglePartyMember = (partyId: string, userId: string) => {
    const party = parties.find((p) => p.id === partyId);
    if (!party) return;
    if (party.memberIds.includes(userId)) {
      removePartyMember(partyId, userId);
    } else {
      addPartyMember(partyId, userId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Party Manager</DialogTitle>
          <DialogDescription>Create and manage groups for party whispers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new party */}
          <div className="flex gap-2">
            <Input
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              placeholder="New party name..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateParty();
                }
              }}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateParty}
              disabled={!newPartyName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Party list */}
          <ScrollArea className="max-h-80">
            {parties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No parties yet. Create one above.
              </p>
            ) : (
              <div className="space-y-2">
                {parties.map((party) => (
                  <PartyCard
                    key={party.id}
                    party={party}
                    users={availableUsers}
                    isEditing={editingParty?.id === party.id}
                    onStartEdit={() => setEditingParty(party)}
                    onCancelEdit={() => setEditingParty(null)}
                    onToggleMember={(userId) => togglePartyMember(party.id, userId)}
                    onDelete={() => removeParty(party.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartyCard({
  party,
  users,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onToggleMember,
  onDelete,
}: {
  party: Party;
  users: FoundryUser[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onToggleMember: (userId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-border rounded-lg">
      {/* Party header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 shrink-0" style={{ color: party.color }} />
          <span className="text-sm font-medium truncate">{party.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {party.memberIds.length} member{party.memberIds.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onStartEdit}>
              <Edit3 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Member list (collapsible via edit mode) */}
      {isEditing && (
        <div className="p-2 space-y-0.5 border-t border-border">
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No other users available
            </p>
          ) : (
            users.map((user) => {
              const isMember = party.memberIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => onToggleMember(user.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                    isMember
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isMember
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {isMember && <Check className="h-3 w-3" />}
                  </div>
                  <UserAvatar name={user.name} color={user.color} online={user.active} size="sm" />
                  <span className="truncate">{user.name}</span>
                  {user.character?.name && (
                    <span className="text-[10px] text-muted-foreground/60 truncate">
                      ({user.character.name})
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
