import { defaultState, parseImport, type QuietwallState } from './domain';

const STORE = 'state';
const KEY = 'current';

export const REAL_DATABASE = 'quietwall-local';
export const DEMO_DATABASE = 'quietwall-demo';

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage could not be opened.'));
  });
}

export async function loadState(databaseName = REAL_DATABASE): Promise<QuietwallState> {
  const database = await openDatabase(databaseName);
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

export async function saveState(state: QuietwallState, databaseName = REAL_DATABASE): Promise<void> {
  const database = await openDatabase(databaseName);
  state.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(state, KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(new Error('Changes could not be saved on this device.'));
  });
}

export async function clearState(databaseName: string): Promise<void> {
  const database = await openDatabase(databaseName);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(new Error('Saved demo data could not be reset.'));
  });
}
