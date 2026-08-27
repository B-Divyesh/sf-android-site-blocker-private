import { defaultState, parseImport, type QuietwallState } from './domain';

const DB_NAME = 'quietwall-local';
const STORE = 'state';
const KEY = 'current';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage could not be opened.'));
  });
}

export async function loadState(): Promise<QuietwallState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      database.close();
      try {
        resolve(request.result ? parseImport(request.result) : defaultState());
      } catch {
        resolve(defaultState());
      }
    };
    request.onerror = () => reject(new Error('Saved rules could not be read.'));
  });
}

export async function saveState(state: QuietwallState): Promise<void> {
  const database = await openDatabase();
  state.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(state, KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(new Error('Changes could not be saved on this device.'));
  });
}
