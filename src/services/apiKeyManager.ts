// Disabled - Gemini AI dependencies not available

export interface APIKeyStatus {
  isValid: boolean;
  keyType: 'default' | 'user' | 'none';
  lastChecked: Date | null;
  errorMessage?: string;
}

export class APIKeyManager {
  private static instance: APIKeyManager;
  private userApiKey: string | null = null;
  private keyStatus: APIKeyStatus = {
    isValid: false,
    keyType: 'none',
    lastChecked: null
  };

  private constructor() {
    this.loadUserApiKey();
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  private loadUserApiKey(): void {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) {
      this.userApiKey = stored;
    }
  }

  public setUserApiKey(apiKey: string): { success: boolean; message: string } {
    this.userApiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
    this.keyStatus = {
      isValid: false,
      keyType: 'user',
      lastChecked: null
    };
    return {
      success: false,
      message: 'Gemini AI dependencies not available'
    };
  }

  public getCurrentApiKey(): string | null {
    return this.userApiKey;
  }

  public async validateApiKey(apiKey?: string): Promise<{ success: boolean; message: string }> {
    console.log('API key validation disabled - Gemini AI dependencies not available');
    return {
      success: false,
      message: 'Gemini AI dependencies not available'
    };
  }

  public getKeyStatus(): APIKeyStatus {
    return this.keyStatus;
  }

  public clearUserApiKey(): void {
    this.userApiKey = null;
    localStorage.removeItem('gemini_api_key');
    this.keyStatus = {
      isValid: false,
      keyType: 'none',
      lastChecked: null
    };
  }

  public hasValidKey(): boolean {
    return false; // Disabled
  }

  public hasUserApiKey(): boolean {
    return this.userApiKey !== null;
  }

  public createGeminiInstance(): null {
    console.log('Gemini instance creation disabled');
    return null;
  }

  public markKeyAsWorking(): void {
    console.log('Key marking disabled');
  }
}

// Export singleton instance
export const apiKeyManager = APIKeyManager.getInstance();