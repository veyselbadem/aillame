import { AillameApiKeyRecord } from '../types/api-key.types';

/**
 * API Key records stored as hashes.
 * In a real-world scenario, these would come from a database.
 */
export const API_KEY_RECORDS: AillameApiKeyRecord[] = [
  {
    "id": "key_doomsgame_1778437742793",
    "name": "Doomsgame Engine Key",
    "keyHash": "55a2641673272d903a50e4a3c966cfc6d1c672ad5cb22d1932ac33376aff7fa1",
    "projectId": "doomsgame-engine",
    "allowedModes": [
      "code",
      "general",
      "image_generation"
    ],
    "isActive": true,
    "createdAt": "2026-05-10T18:29:02.793Z"
  },
  {
    "id": "key_admin_default",
    "name": "Default Admin Key",
    "keyHash": "6ed793b14c6c05ea6b9a5a9382e980e44f3e6d6eec6e12848f8c10d3b70db080",
    "projectId": "aillame-admin",
    "allowedModes": ["all"],
    "isActive": true,
    "createdAt": "2026-05-14T13:27:00.000Z"
  }
];
