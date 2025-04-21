import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  country?: string;
  city?: string;
}

/**
 * Service to manage and rotate proxies
 */
export class ProxyService {
  private proxies: ProxyConfig[] = [];
  private currentIndex: number = -1;
  private failedProxies: Set<number> = new Set();
  private recoveryTime: number = 15 * 60 * 1000; // 15 minutes

  constructor(proxies: ProxyConfig[] = []) {
    this.proxies = proxies;
  }

  /**
   * Get the next available proxy
   */
  public getNextProxy(): { 
    proxyUrl: string; 
    agent: HttpsProxyAgent<string>; 
    index: number 
  } | null {
    if (this.proxies.length === 0) {
      return null;
    }

    // Skip failed proxies
    let attemptsCount = 0;
    let foundWorkingProxy = false;

    while (attemptsCount < this.proxies.length && !foundWorkingProxy) {
      attemptsCount++;
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

      if (!this.failedProxies.has(this.currentIndex)) {
        foundWorkingProxy = true;
        break;
      }
    }

    if (!foundWorkingProxy) {
      console.log('No working proxies available');
      return null;
    }

    const proxy = this.proxies[this.currentIndex];
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    
    console.log(`Using proxy: ${proxy.host}:${proxy.port} (#${this.currentIndex + 1})`);
    
    return {
      proxyUrl,
      agent: new HttpsProxyAgent<string>(proxyUrl),
      index: this.currentIndex
    };
  }

  /**
   * Mark a proxy as failed
   */
  public markProxyAsFailed(index: number): void {
    if (index < 0 || index >= this.proxies.length) return;

    const proxy = this.proxies[index];
    console.log(`Proxy ${proxy.host}:${proxy.port} failed`);
    
    this.failedProxies.add(index);

    // Schedule recovery after recovery time
    setTimeout(() => {
      console.log(`Proxy ${proxy.host}:${proxy.port} recovery time elapsed`);
      this.failedProxies.delete(index);
    }, this.recoveryTime);
  }

  /**
   * Test all proxies and report their status
   */
  public async testProxies(): Promise<Array<{ proxy: ProxyConfig, working: boolean, responseTime?: number }>> {
    const results = [];

    for (let i = 0; i < this.proxies.length; i++) {
      const proxy = this.proxies[i];
      const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
      const agent = new HttpsProxyAgent<string>(proxyUrl);
      
      try {
        console.log(`Testing proxy ${i+1}/${this.proxies.length}: ${proxy.host}:${proxy.port}`);
        
        const startTime = Date.now();
        const response = await axios.get('https://api.ipify.org?format=json', {
          httpsAgent: agent,
          timeout: 10000 // 10 second timeout
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`✅ Proxy ${i+1} working. IP: ${response.data.ip}, Response time: ${responseTime}ms`);
        
        results.push({ 
          proxy, 
          working: true,
          responseTime
        });
      } catch (error) {
        console.error(`❌ Proxy ${i+1} failed:`, error);
        
        results.push({ 
          proxy, 
          working: false 
        });
      }
    }

    return results;
  }
}

// WebShare proxies config
const webshareProxies: ProxyConfig[] = [
  {
    host: '38.153.152.244',
    port: 9594,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'United States',
    city: 'Piscataway'
  },
  {
    host: '86.38.234.176',
    port: 6630,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'United Kingdom',
    city: 'London'
  },
  {
    host: '173.211.0.148',
    port: 6641,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'United States',
    city: 'Los Angeles'
  },
  {
    host: '161.123.152.115',
    port: 6360,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Egypt',
    city: 'Cairo'
  },
  {
    host: '216.10.27.159',
    port: 6837,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'United States',
    city: 'Dallas'
  },
  {
    host: '154.36.110.199',
    port: 6853,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Germany',
    city: 'Frankfurt'
  },
  {
    host: '45.151.162.198',
    port: 6600,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Germany',
    city: 'Essen'
  },
  {
    host: '185.199.229.156',
    port: 7492,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Spain',
    city: 'Madrid'
  },
  {
    host: '185.199.228.220',
    port: 7300,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Spain',
    city: 'Madrid'
  },
  {
    host: '185.199.231.45',
    port: 8382,
    username: 'dsuowash',
    password: 'd88bkcsrxbpd',
    country: 'Spain',
    city: 'Madrid'
  }
];

// Export a singleton instance with proxies
export const proxyService = new ProxyService(webshareProxies);