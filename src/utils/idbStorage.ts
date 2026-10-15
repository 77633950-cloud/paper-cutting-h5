import type { StateStorage } from 'zustand/middleware';

/**
 * 基于 IndexedDB 的键值存储（zustand persist 适配器）
 *
 * 选择 IndexedDB 而非 localStorage 的原因：
 * 用户作品 / 贺卡是 base64 图片，单张常达数百 KB ~ 数 MB，
 * localStorage 约 5MB 的上限很容易被突破导致写入抛错。
 * 任意失败都静默降级为 null，保证页面功能不被存储问题阻塞。
 */
const DB_NAME = 'papercut-db';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 递归剔除 JSON 中的 data URL 字段（空间不足时保住文字类偏好） */
function stripDataUrls(json: string): string {
  try {
    const scrub = (obj: Record<string, unknown>): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.startsWith('data:')) {
          delete obj[key];
        } else if (value && typeof value === 'object') {
          scrub(value as Record<string, unknown>);
        }
      }
    };
    const parsed = JSON.parse(json) as Record<string, unknown>;
    scrub(parsed);
    return JSON.stringify(parsed);
  } catch {
    return json;
  }
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const db = await openDb();
      const value = await requestAsPromise(
        db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(name),
      );
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  },

  setItem: async (name, value) => {
    try {
      const db = await openDb();
      await requestAsPromise(
        db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, name),
      );
    } catch {
      // 多半是配额超限：去掉图片等大字段后重试一次
      try {
        const slim = stripDataUrls(value);
        if (slim !== value) {
          const db = await openDb();
          await requestAsPromise(
            db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(slim, name),
          );
        }
      } catch {
        /* 持久化失败不阻断本次会话 */
      }
    }
  },

  removeItem: async (name) => {
    try {
      const db = await openDb();
      await requestAsPromise(
        db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(name),
      );
    } catch {
      /* ignore */
    }
  },
};
