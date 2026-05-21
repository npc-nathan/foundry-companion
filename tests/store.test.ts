import { describe, it, expect, beforeEach } from 'vitest';

// The store is auto-mocked in setup.ts — unmock to test the real implementation
vi.unmock('@/lib/store');

import { useStore } from '@/lib/store';

describe('useStore', () => {
  // Reset store to defaults before each test
  beforeEach(() => {
    useStore.setState({
      config: { relayUrl: '', apiKey: '', clientId: '', clientName: '', role: 'gm' },
      status: { connected: false, online: false, connecting: false, error: null },
      ui: { sidebarOpen: true, theme: 'dark', themePreset: 'default' },
      activeUserDm: null,
      activePartyDm: null,
      mutedUsers: [],
      parties: [],
    });
  });

  describe('initial state', () => {
    it('has default config with empty fields and gm role', () => {
      const state = useStore.getState();
      expect(state.config).toEqual({
        relayUrl: '',
        apiKey: '',
        clientId: '',
        clientName: '',
        role: 'gm',
      });
    });

    it('has disconnected status with no error', () => {
      const state = useStore.getState();
      expect(state.status).toEqual({
        connected: false,
        online: false,
        connecting: false,
        error: null,
      });
    });

    it('has dark theme with sidebar open and default preset', () => {
      const state = useStore.getState();
      expect(state.ui).toEqual({
        sidebarOpen: true,
        theme: 'dark',
        themePreset: 'default',
      });
    });

    it('has no active DM, no muted users, and no parties', () => {
      const state = useStore.getState();
      expect(state.activeUserDm).toBeNull();
      expect(state.activePartyDm).toBeNull();
      expect(state.mutedUsers).toEqual([]);
      expect(state.parties).toEqual([]);
    });
  });

  describe('setConfig', () => {
    it('updates a single config field partially', () => {
      useStore.getState().setConfig({ apiKey: 'abc123' });
      expect(useStore.getState().config.apiKey).toBe('abc123');
      expect(useStore.getState().config.role).toBe('gm'); // unchanged
    });

    it('updates multiple config fields', () => {
      useStore.getState().setConfig({ relayUrl: 'http://localhost:3010', role: 'player' });
      expect(useStore.getState().config.relayUrl).toBe('http://localhost:3010');
      expect(useStore.getState().config.role).toBe('player');
    });

    it('leaves other config fields untouched', () => {
      useStore.getState().setConfig({ apiKey: 'xyz' });
      const cfg = useStore.getState().config;
      expect(cfg).toMatchObject({
        apiKey: 'xyz',
        relayUrl: '',
        clientId: '',
        role: 'gm',
      });
    });
  });

  describe('setConnected', () => {
    it('sets connected to true and clears connecting and error', () => {
      useStore.getState().setConnected(true);
      const s = useStore.getState().status;
      expect(s.connected).toBe(true);
      expect(s.connecting).toBe(false);
      expect(s.error).toBeNull();
    });

    it('sets connected to false', () => {
      useStore.getState().setConnected(false);
      expect(useStore.getState().status.connected).toBe(false);
    });
  });

  describe('setStatus', () => {
    it('handles connected status', () => {
      useStore.getState().setStatus('connected');
      const s = useStore.getState().status;
      expect(s.connected).toBe(true);
      expect(s.connecting).toBe(false);
      expect(s.error).toBeNull();
    });

    it('handles connecting status', () => {
      useStore.getState().setStatus('connecting');
      const s = useStore.getState().status;
      expect(s.connected).toBe(false);
      expect(s.connecting).toBe(true);
      expect(s.error).toBeNull();
    });

    it('handles disconnected status with error message', () => {
      useStore.getState().setStatus('disconnected');
      const s = useStore.getState().status;
      expect(s.connected).toBe(false);
      expect(s.connecting).toBe(false);
      expect(s.error).toBe('Disconnected');
    });
  });

  describe('setError', () => {
    it('sets the error message', () => {
      useStore.getState().setError('Something went wrong');
      expect(useStore.getState().status.error).toBe('Something went wrong');
    });

    it('clears the error when null', () => {
      useStore.getState().setError('Existing error');
      useStore.getState().setError(null);
      expect(useStore.getState().status.error).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar from true to false', () => {
      useStore.getState().toggleSidebar();
      expect(useStore.getState().ui.sidebarOpen).toBe(false);
    });

    it('toggles sidebar from false to true', () => {
      useStore.setState({ ui: { ...useStore.getState().ui, sidebarOpen: false } });
      useStore.getState().toggleSidebar();
      expect(useStore.getState().ui.sidebarOpen).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('toggles from dark to light', () => {
      useStore.getState().toggleTheme();
      expect(useStore.getState().ui.theme).toBe('light');
    });

    it('toggles from light to dark', () => {
      useStore.setState({ ui: { ...useStore.getState().ui, theme: 'light' } });
      useStore.getState().toggleTheme();
      expect(useStore.getState().ui.theme).toBe('dark');
    });
  });

  describe('setThemePreset', () => {
    it('sets the theme preset', () => {
      useStore.getState().setThemePreset('cyberpunk');
      expect(useStore.getState().ui.themePreset).toBe('cyberpunk');
    });

    it('overwrites previous preset', () => {
      useStore.getState().setThemePreset('cyberpunk');
      useStore.getState().setThemePreset('dnd');
      expect(useStore.getState().ui.themePreset).toBe('dnd');
    });
  });

  describe('reset', () => {
    it('resets config and status to defaults', () => {
      useStore.getState().setConfig({ apiKey: 'secret', relayUrl: 'http://example.com' });
      useStore.getState().setConnected(true);
      useStore.getState().reset();
      const state = useStore.getState();
      expect(state.config).toEqual({
        relayUrl: '',
        apiKey: '',
        clientId: '',
        clientName: '',
        role: 'gm',
      });
      expect(state.status).toEqual({
        connected: false,
        online: false,
        connecting: false,
        error: null,
      });
    });

    it('does not reset ui or chat state', () => {
      useStore.getState().setThemePreset('cyberpunk');
      useStore.getState().addParty({ id: 'p1', name: 'Test', memberIds: [] });
      useStore.getState().reset();
      expect(useStore.getState().ui.themePreset).toBe('cyberpunk');
      expect(useStore.getState().parties).toHaveLength(1);
    });
  });

  describe('setActiveUserDm', () => {
    it('sets the active user DM', () => {
      useStore.getState().setActiveUserDm('user-1');
      expect(useStore.getState().activeUserDm).toBe('user-1');
    });

    it('clears activePartyDm when setting a user DM', () => {
      useStore.getState().setActivePartyDm({ id: 'p1', name: 'Group', memberIds: [] });
      useStore.getState().setActiveUserDm('user-1');
      expect(useStore.getState().activeUserDm).toBe('user-1');
      expect(useStore.getState().activePartyDm).toBeNull();
    });

    it('clears user DM when set to null', () => {
      useStore.getState().setActiveUserDm('user-1');
      useStore.getState().setActiveUserDm(null);
      expect(useStore.getState().activeUserDm).toBeNull();
    });
  });

  describe('setActivePartyDm', () => {
    const party = { id: 'p1', name: 'Adventurers', memberIds: ['u1', 'u2'] };

    it('sets the active party DM', () => {
      useStore.getState().setActivePartyDm(party);
      expect(useStore.getState().activePartyDm).toEqual(party);
    });

    it('clears activeUserDm when setting a party DM', () => {
      useStore.getState().setActiveUserDm('user-1');
      useStore.getState().setActivePartyDm(party);
      expect(useStore.getState().activePartyDm).toEqual(party);
      expect(useStore.getState().activeUserDm).toBeNull();
    });

    it('clears party DM when set to null', () => {
      useStore.getState().setActivePartyDm(party);
      useStore.getState().setActivePartyDm(null);
      expect(useStore.getState().activePartyDm).toBeNull();
    });
  });

  describe('mutedUsers', () => {
    it('setMutedUsers replaces the list', () => {
      useStore.getState().setMutedUsers(['u1', 'u2']);
      expect(useStore.getState().mutedUsers).toEqual(['u1', 'u2']);
    });

    it('setMutedUsers with empty array clears', () => {
      useStore.getState().setMutedUsers(['u1']);
      useStore.getState().setMutedUsers([]);
      expect(useStore.getState().mutedUsers).toEqual([]);
    });

    it('toggleMuteUser adds a user not already muted', () => {
      useStore.getState().toggleMuteUser('u1');
      expect(useStore.getState().mutedUsers).toEqual(['u1']);
    });

    it('toggleMuteUser removes a user already muted', () => {
      useStore.getState().toggleMuteUser('u1');
      useStore.getState().toggleMuteUser('u1');
      expect(useStore.getState().mutedUsers).toEqual([]);
    });

    it('toggleMuteUser does not affect other muted users', () => {
      useStore.getState().toggleMuteUser('u1');
      useStore.getState().toggleMuteUser('u2');
      useStore.getState().toggleMuteUser('u1');
      expect(useStore.getState().mutedUsers).toEqual(['u2']);
    });
  });

  describe('parties', () => {
    const partyA = { id: 'p1', name: 'Alpha', memberIds: ['u1'] };
    const partyB = { id: 'p2', name: 'Beta', memberIds: ['u2'] };

    it('addParty adds a party', () => {
      useStore.getState().addParty(partyA);
      expect(useStore.getState().parties).toEqual([partyA]);
    });

    it('addParty appends to existing parties', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().addParty(partyB);
      expect(useStore.getState().parties).toHaveLength(2);
      expect(useStore.getState().parties[1]).toEqual(partyB);
    });

    it('removeParty removes a party by id', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().addParty(partyB);
      useStore.getState().removeParty('p1');
      expect(useStore.getState().parties).toEqual([partyB]);
    });

    it('removeParty with non-existent id does nothing', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().removeParty('nonexistent');
      expect(useStore.getState().parties).toEqual([partyA]);
    });

    it('addPartyMember adds a member to a party', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().addPartyMember('p1', 'u2');
      expect(useStore.getState().parties[0].memberIds).toEqual(['u1', 'u2']);
    });

    it('addPartyMember does not add duplicate members', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().addPartyMember('p1', 'u1');
      expect(useStore.getState().parties[0].memberIds).toEqual(['u1']);
    });

    it('addPartyMember only updates the targeted party', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().addParty(partyB);
      useStore.getState().addPartyMember('p1', 'u99');
      expect(useStore.getState().parties[0].memberIds).toContain('u99');
      expect(useStore.getState().parties[1].memberIds).toEqual(['u2']);
    });

    it('removePartyMember removes a member from a party', () => {
      useStore.getState().addParty({ id: 'p1', name: 'A', memberIds: ['u1', 'u2', 'u3'] });
      useStore.getState().removePartyMember('p1', 'u2');
      expect(useStore.getState().parties[0].memberIds).toEqual(['u1', 'u3']);
    });

    it('removePartyMember with non-existent member does nothing', () => {
      useStore.getState().addParty(partyA);
      useStore.getState().removePartyMember('p1', 'nonexistent');
      expect(useStore.getState().parties[0].memberIds).toEqual(['u1']);
    });
  });
});
