import { ROOM_CODE_LENGTH } from '@skyjo/shared';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion

export function generateRoomCode(existingCodes: Set<string>): string {
  let code: string;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    attempts++;
    if (attempts > 1000) {
      throw new Error('Could not generate unique room code');
    }
  } while (existingCodes.has(code));
  return code;
}
