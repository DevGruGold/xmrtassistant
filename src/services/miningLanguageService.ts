import { supabase } from '@/integrations/supabase/client';

export interface MiningLanguageContext {
  isPersonalContribution: boolean;
  workerName?: string;
  detectedIP?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export class MiningLanguageService {
  private static instance: MiningLanguageService;
  private ipWorkerCache = new Map<string, { workerId: string; lastSeen: Date }>();

  private constructor() {}

  public static getInstance(): MiningLanguageService {
    if (!MiningLanguageService.instance) {
      MiningLanguageService.instance = new MiningLanguageService();
    }
    return MiningLanguageService.instance;
  }

  /**
   * Determines appropriate language context for mining references
   * @param clientIP - The client's IP address if available
   * @param miningStats - Current mining statistics
   */
  public async determineMiningContext(clientIP?: string): Promise<MiningLanguageContext> {
    if (!clientIP || clientIP === 'unknown') {
      return {
        isPersonalContribution: false,
        confidenceLevel: 'low'
      };
    }

    try {
      // Check if this IP is registered to a specific worker
      const { data: registration, error } = await supabase
        .from('worker_registrations')
        .select('worker_id, last_seen, metadata')
        .eq('ip_address', clientIP)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking worker registration:', error);
        return {
          isPersonalContribution: false,
          confidenceLevel: 'low'
        };
      }

      if (registration) {
        // Update last seen timestamp
        await this.updateWorkerLastSeen(clientIP);
        
        return {
          isPersonalContribution: true,
          workerName: registration.worker_id,
          detectedIP: clientIP,
          confidenceLevel: 'high'
        };
      }

      // Check if IP has been seen recently in our cache
      if (this.ipWorkerCache.has(clientIP)) {
        const cached = this.ipWorkerCache.get(clientIP)!;
        const timeSinceLastSeen = Date.now() - cached.lastSeen.getTime();
        
        // If seen within last hour, consider it a medium confidence match
        if (timeSinceLastSeen < 3600000) { // 1 hour
          return {
            isPersonalContribution: true,
            workerName: cached.workerId,
            detectedIP: clientIP,
            confidenceLevel: 'medium'
          };
        }
      }

      return {
        isPersonalContribution: false,
        detectedIP: clientIP,
        confidenceLevel: 'low'
      };

    } catch (error) {
      console.error('Error determining mining context:', error);
      return {
        isPersonalContribution: false,
        confidenceLevel: 'low'
      };
    }
  }

  /**
   * Register a worker ID with an IP address
   */
  public async registerWorker(ip: string, workerId: string, sessionKey?: string): Promise<boolean> {
    try {
      // Deactivate any existing registrations for this IP
      await supabase
        .from('worker_registrations')
        .update({ is_active: false })
        .eq('ip_address', ip);

      // Create new registration
      const { error } = await supabase
        .from('worker_registrations')
        .insert({
          ip_address: ip,
          worker_id: workerId,
          session_key: sessionKey,
          metadata: {
            registrationSource: 'manual',
            userAgent: navigator?.userAgent || 'unknown'
          }
        });

      if (error) {
        console.error('Error registering worker:', error);
        return false;
      }

      // Update cache
      this.ipWorkerCache.set(ip, { workerId, lastSeen: new Date() });
      
      console.log(`✅ Registered worker ${workerId} for IP ${ip}`);
      return true;

    } catch (error) {
      console.error('Error in registerWorker:', error);
      return false;
    }
  }

  /**
   * Get appropriate possessive language for mining references
   */
  public getMiningPossessiveLanguage(context: MiningLanguageContext, language: 'en' | 'es' = 'en'): {
    hashrate: string;
    shares: string;
    mining: string;
    contribution: string;
  } {
    const isPersonal = context.isPersonalContribution && context.confidenceLevel !== 'low';

    if (language === 'es') {
      return {
        hashrate: isPersonal ? 'tu tasa de hash' : 'nuestra tasa de hash colectiva',
        shares: isPersonal ? 'tus shares' : 'nuestros shares',
        mining: isPersonal ? 'tu minería' : 'nuestra minería',
        contribution: isPersonal ? `tu contribución${context.workerName ? ` (${context.workerName})` : ''}` : 'nuestra contribución colectiva'
      };
    }

    return {
      hashrate: isPersonal ? 'your hash rate' : 'our collective hash rate',
      shares: isPersonal ? 'your shares' : 'our shares',
      mining: isPersonal ? 'your mining' : 'our mining',
      contribution: isPersonal ? `your contribution${context.workerName ? ` (${context.workerName})` : ''}` : 'our collective contribution'
    };
  }

  /**
   * Update worker last seen timestamp
   */
  private async updateWorkerLastSeen(ip: string): Promise<void> {
    try {
      await supabase
        .from('worker_registrations')
        .update({ last_seen: new Date().toISOString() })
        .eq('ip_address', ip)
        .eq('is_active', true);
    } catch (error) {
      console.error('Error updating worker last seen:', error);
    }
  }

  /**
   * Get all registered workers for management
   */
  public async getRegisteredWorkers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('worker_registrations')
        .select('*')
        .eq('is_active', true)
        .order('registration_date', { ascending: false });

      if (error) {
        console.error('Error fetching registered workers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRegisteredWorkers:', error);
      return [];
    }
  }

  /**
   * Format mining statistics with appropriate language context
   */
  public formatMiningStats(stats: any, context: MiningLanguageContext, language: 'en' | 'es' = 'en'): string {
    const lang = this.getMiningPossessiveLanguage(context, language);
    
    const hashrate = stats.hashRate || stats.hash || 0;
    const shares = stats.validShares || stats.shares || 0;

    if (language === 'es') {
      return `Actualmente ${lang.hashrate} es de ${hashrate} H/s con ${shares} shares válidos. ${
        context.isPersonalContribution 
          ? `¡Excelente trabajo con ${lang.contribution}!`
          : `Juntos estamos construyendo ${lang.contribution} al ecosistema XMRT.`
      }`;
    }

    return `Currently ${lang.hashrate} is ${hashrate} H/s with ${shares} valid shares. ${
      context.isPersonalContribution 
        ? `Great work with ${lang.contribution}!`
        : `Together we're building ${lang.contribution} to the XMRT ecosystem.`
    }`;
  }
}

export const miningLanguageService = MiningLanguageService.getInstance();