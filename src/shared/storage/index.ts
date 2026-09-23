import { UserProfile, UserProfileSchema } from '../schemas/profile';
import { KnowledgeEntry, PreviousAnswer } from '../schemas/knowledge';
import { ApplicationHistory } from '../schemas/application';
import { ExtensionSettings, ExtensionSettingsSchema } from '../schemas/settings';
import { defaultProfile } from './defaultProfile';
import { defaultKnowledge } from './defaultKnowledge';

const STORAGE_KEYS = {
  PROFILE: 'grounded_apply_profile',
  KNOWLEDGE: 'grounded_apply_knowledge',
  PREVIOUS_ANSWERS: 'grounded_apply_previous_answers',
  APPLICATIONS: 'grounded_apply_applications',
  SETTINGS: 'grounded_apply_settings',
  LAST_TRANSACTION: 'grounded_apply_last_transaction',
} as const;

// In-memory fallback for tests / environments without chrome.storage
const memoryStore = new Map<string, unknown>();

async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn(`Storage get error for ${key}:`, chrome.runtime.lastError);
          resolve(defaultValue);
        } else {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        }
      });
    });
  }
  return memoryStore.has(key) ? (memoryStore.get(key) as T) : defaultValue;
}

async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  memoryStore.set(key, value);
}

export const Storage = {
  async getProfile(): Promise<UserProfile> {
    const raw = await getStorageItem<UserProfile>(STORAGE_KEYS.PROFILE, defaultProfile);
    const parsed = UserProfileSchema.safeParse(raw);
    return parsed.success ? parsed.data : defaultProfile;
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    profile.updatedAt = new Date().toISOString();
    await setStorageItem(STORAGE_KEYS.PROFILE, profile);
  },

  async getKnowledge(): Promise<KnowledgeEntry[]> {
    const entries = await getStorageItem<KnowledgeEntry[]>(STORAGE_KEYS.KNOWLEDGE, defaultKnowledge);
    return Array.isArray(entries) ? entries : defaultKnowledge;
  },

  async saveKnowledge(entries: KnowledgeEntry[]): Promise<void> {
    await setStorageItem(STORAGE_KEYS.KNOWLEDGE, entries);
  },

  async addKnowledgeEntry(entry: KnowledgeEntry): Promise<void> {
    const current = await this.getKnowledge();
    const existingIdx = current.findIndex((k) => k.id === entry.id);
    if (existingIdx >= 0) {
      current[existingIdx] = entry;
    } else {
      current.unshift(entry);
    }
    await this.saveKnowledge(current);
  },

  async deleteKnowledgeEntry(id: string): Promise<void> {
    const current = await this.getKnowledge();
    const filtered = current.filter((k) => k.id !== id);
    await this.saveKnowledge(filtered);
  },

  async getPreviousAnswers(): Promise<PreviousAnswer[]> {
    const answers = await getStorageItem<PreviousAnswer[]>(STORAGE_KEYS.PREVIOUS_ANSWERS, []);
    return Array.isArray(answers) ? answers : [];
  },

  async savePreviousAnswers(answers: PreviousAnswer[]): Promise<void> {
    await setStorageItem(STORAGE_KEYS.PREVIOUS_ANSWERS, answers);
  },

  async addPreviousAnswer(answer: PreviousAnswer): Promise<void> {
    const current = await this.getPreviousAnswers();
    const existingIdx = current.findIndex((a) => a.id === answer.id);
    if (existingIdx >= 0) {
      current[existingIdx] = answer;
    } else {
      current.unshift(answer);
    }
    await this.savePreviousAnswers(current);
  },

  async getApplications(): Promise<ApplicationHistory[]> {
    const apps = await getStorageItem<ApplicationHistory[]>(STORAGE_KEYS.APPLICATIONS, []);
    return Array.isArray(apps) ? apps : [];
  },

  async saveApplications(apps: ApplicationHistory[]): Promise<void> {
    await setStorageItem(STORAGE_KEYS.APPLICATIONS, apps);
  },

  async recordApplication(app: ApplicationHistory): Promise<void> {
    const current = await this.getApplications();
    const existingIdx = current.findIndex((a) => a.id === app.id);
    if (existingIdx >= 0) {
      current[existingIdx] = app;
    } else {
      current.unshift(app);
    }
    await this.saveApplications(current);
  },

  async getSettings(): Promise<ExtensionSettings> {
    const raw = await getStorageItem<Partial<ExtensionSettings>>(STORAGE_KEYS.SETTINGS, {});
    const parsed = ExtensionSettingsSchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o',
          requestTimeoutMs: 45000,
          autoDetectForms: true,
          showFloatingLauncher: true,
          highlightFilledFields: true,
          fillDelayMs: 40,
          theme: 'system',
        };
  },

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await setStorageItem(STORAGE_KEYS.SETTINGS, updated);
  },

  async clearAllData(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      await new Promise<void>((resolve) => chrome.storage.local.clear(resolve));
    }
    memoryStore.clear();
  },
};
