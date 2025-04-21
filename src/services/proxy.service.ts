import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyConfig, ProxyTestResult } from '../types/index';

/**
 * Enhanced Proxy Service with improved rotation logic
 */
export class ProxyService {
  private proxies: ProxyConfig[] = [];
  private currentIndex: number = -1;
  private failedProxies: Set<number> = new Set();
  private recoveryTime: number = 15 * 60 * 1000; // 15 minutes
  private priorityProxies: Set<number> = new Set(); // Proxies that have successfully worked with Instagram

  constructor(proxies: ProxyConfig[] = []) {
    this.proxies = proxies.map(proxy => ({
      ...proxy,
      consecutiveFailures: 0,
      lastUsed: new Date(0),
      lastChecked: new Date(0),
      working: true
    }));
  }

  /**
   * Get the next available proxy, prioritizing known good proxies
   */
  public getNextProxy(): { 
    proxyUrl: string; 
    agent: HttpsProxyAgent<string>; 
    index: number;
    config: ProxyConfig;
  } | null {
    if (this.proxies.length === 0) {
      return null;
    }

    // Try priority proxies first if available
    if (this.priorityProxies.size > 0) {
      for (const index of this.priorityProxies) {
        if (!this.failedProxies.has(index)) {
          const proxy = this.proxies[index];
          this.currentIndex = index;
          return this.createProxyAgentFromIndex(index);
        }
      }
    }

    // If no priority proxies available, try regular rotation
    let attemptsCount = 0;
    let foundWorkingProxy = false;
    let leastRecentlyUsedIndex = -1;
    let leastRecentTime = new Date();

    // First pass: Try to find a working proxy that hasn't been used recently
    while (attemptsCount < this.proxies.length && !foundWorkingProxy) {
      attemptsCount++;
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

      const proxy = this.proxies[this.currentIndex];
      
      // Skip failed proxies
      if (this.failedProxies.has(this.currentIndex)) {
        continue;
      }
      
      // Track least recently used proxy as fallback
      if (proxy.lastUsed && proxy.lastUsed < leastRecentTime) {
        leastRecentTime = proxy.lastUsed;
        leastRecentlyUsedIndex = this.currentIndex;
      }
      
      // If this proxy hasn't been used in at least 30 seconds, use it
      if (proxy.lastUsed && (new Date().getTime() - proxy.lastUsed.getTime() > 30000)) {
        foundWorkingProxy = true;
        break;
      }
    }

    // If we couldn't find an ideal proxy, use the least recently used one
    if (!foundWorkingProxy && leastRecentlyUsedIndex !== -1) {
      this.currentIndex = leastRecentlyUsedIndex;
      foundWorkingProxy = true;
    }

    // If we found a working proxy, create and return the agent
    if (foundWorkingProxy) {
      return this.createProxyAgentFromIndex(this.currentIndex);
    }

    // No working proxies available
    console.log('No working proxies available');
    return null;
  }

  /**
   * Mark a proxy as failed
   */
  public markProxyAsFailed(index: number): void {
    if (index < 0 || index >= this.proxies.length) return;

    const proxy = this.proxies[index];
    proxy.consecutiveFailures = (proxy.consecutiveFailures || 0) + 1;
    proxy.lastChecked = new Date();
    
    console.log(`Proxy ${proxy.host}:${proxy.port} failed (${proxy.consecutiveFailures} consecutive failures)`);
    
    // If too many consecutive failures, mark as failed temporarily
    if (proxy.consecutiveFailures && proxy.consecutiveFailures >= 3) {
      proxy.working = false;
      this.failedProxies.add(index);
      this.priorityProxies.delete(index); // Remove from priority proxies
      
      console.log(`Proxy ${proxy.host}:${proxy.port} temporarily disabled`);
      
      // Schedule recovery
      setTimeout(() => {
        console.log(`Proxy ${proxy.host}:${proxy.port} recovery time elapsed`);
        this.failedProxies.delete(index);
        if (proxy.consecutiveFailures) {
          proxy.consecutiveFailures = 0;
        }
        proxy.working = true;
      }, this.recoveryTime);
    }
  }

  /**
   * Mark a proxy as successful
   */
  public markProxyAsSuccessful(index: number): void {
    if (index < 0 || index >= this.proxies.length) return;

    const proxy = this.proxies[index];
    proxy.lastChecked = new Date();
    proxy.lastUsed = new Date();
    if (proxy.consecutiveFailures) {
      proxy.consecutiveFailures = 0;
    }
    proxy.working = true;
    
    // Add to priority proxies
    this.priorityProxies.add(index);
    
    console.log(`Proxy ${proxy.host}:${proxy.port} succeeded, marked as priority`);
  }

  /**
   * Test all proxies and report their status
   */
  public async testProxies(): Promise<ProxyTestResult[]> {
    const results: ProxyTestResult[] = [];

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
        
        // Update proxy status
        proxy.working = true;
        proxy.lastChecked = new Date();
        if (proxy.consecutiveFailures) {
          proxy.consecutiveFailures = 0;
        }
        
        console.log(`✅ Proxy ${i+1} working. IP: ${response.data.ip}, Response time: ${responseTime}ms`);
        
        // Try instagram.com to see if it can access Instagram
        try {
          const igResponse = await axios.get('https://www.instagram.com/', {
            httpsAgent: agent,
            timeout: 10000
          });
          
          if (igResponse.status === 200) {
            console.log(`✅ Proxy ${i+1} can access Instagram`);
            this.priorityProxies.add(i);
          }
        } catch (error) {
          console.log(`⚠️ Proxy ${i+1} cannot access Instagram`);
        }
        
        results.push({ 
          proxy, 
          working: true,
          responseTime
        });
      } catch (error) {
        console.error(`❌ Proxy ${i+1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Update proxy status
        proxy.working = false;
        proxy.lastChecked = new Date();
        proxy.consecutiveFailures = (proxy.consecutiveFailures || 0) + 1;
        
        results.push({ 
          proxy, 
          working: false 
        });
      }
    }

    return results;
  }

  /**
   * Create proxy agent from index
   */
  private createProxyAgentFromIndex(index: number) {
    const proxy = this.proxies[index];
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    
    proxy.lastUsed = new Date();
    console.log(`Using proxy: ${proxy.host}:${proxy.port} (#${index + 1})`);
    
    return {
      proxyUrl,
      agent: new HttpsProxyAgent<string>(proxyUrl),
      index,
      config: proxy
    };
  }

  /**
   * Get all proxies
   */
  public getAllProxies(): ProxyConfig[] {
    return [...this.proxies];
  }

  /**
   * Get working proxies
   */
  public getWorkingProxies(): ProxyConfig[] {
    return this.proxies.filter(p => p.working);
  }
}

// WebShare proxies configuration
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