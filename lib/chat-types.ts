export type ChatMode = 'ic' | 'ooc' | 'whisper';

export interface ChatSpeaker {
  scene?: string;
  actor?: string;
  token?: string;
  alias?: string;
}

export interface ChatMessage {
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

export interface FoundryUser {
  id: string;
  name: string;
  isGM: boolean;
  active: boolean;
  color?: string;
  character?: { name?: string; id?: string };
}

export interface Party {
  id: string;
  name: string;
  memberIds: string[];
  color: string;
}
