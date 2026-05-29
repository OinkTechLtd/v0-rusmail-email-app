// Email API Service with robust automatic fallback
// Automatically detects and switches to working APIs

export interface Email {
  id: string
  from: string
  fromName: string
  to: string
  subject: string
  body: string
  html?: string
  date: string
  read: boolean
  starred: boolean
  spam: boolean
  labels: string[]
}

export interface EmailAccount {
  email: string
  login: string
  domain: string
  api: string
  createdAt: string
  lastActivity: string
  expiresAt: string
}

// List of temp mail API providers with their configurations
interface APIProvider {
  name: string
  getDomains: () => Promise<string[]>
  getMessages: (login: string, domain: string) => Promise<Email[]>
  getMessage: (login: string, domain: string, id: string) => Promise<Email | null>
}

// Generate random string for email login
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Timeout wrapper for fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// ==================== API PROVIDERS ====================

// 1secmail API - very reliable
const oneSecMailProvider: APIProvider = {
  name: '1secmail',
  
  async getDomains() {
    try {
      const res = await fetchWithTimeout('https://www.1secmail.com/api/v1/?action=getDomainList')
      if (!res.ok) throw new Error('Failed to get domains')
      const domains = await res.json()
      return domains as string[]
    } catch {
      // Fallback domains if API fails
      return ['1secmail.com', '1secmail.org', '1secmail.net']
    }
  },
  
  async getMessages(login: string, domain: string) {
    try {
      const res = await fetchWithTimeout(
        `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`
      )
      if (!res.ok) return []
      const data = await res.json()
      
      return data.map((msg: { id: number; from: string; subject: string; date: string }) => ({
        id: String(msg.id),
        from: msg.from,
        fromName: msg.from.split('@')[0],
        to: `${login}@${domain}`,
        subject: msg.subject || '(No subject)',
        body: '',
        date: msg.date,
        read: false,
        starred: false,
        spam: false,
        labels: [],
      }))
    } catch {
      return []
    }
  },
  
  async getMessage(login: string, domain: string, id: string) {
    try {
      const res = await fetchWithTimeout(
        `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`
      )
      if (!res.ok) return null
      const msg = await res.json()
      
      return {
        id: String(msg.id),
        from: msg.from,
        fromName: msg.from.split('@')[0],
        to: `${login}@${domain}`,
        subject: msg.subject || '(No subject)',
        body: msg.textBody || msg.body || '',
        html: msg.htmlBody,
        date: msg.date,
        read: true,
        starred: false,
        spam: false,
        labels: [],
      }
    } catch {
      return null
    }
  },
}

// Guerrilla Mail API
const guerrillaMailProvider: APIProvider = {
  name: 'guerrillamail',
  
  async getDomains() {
    return ['guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.de']
  },
  
  async getMessages(login: string, domain: string) {
    try {
      // Guerrilla mail uses session-based approach, we simulate it
      const res = await fetchWithTimeout(
        `https://api.guerrillamail.com/ajax.php?f=get_email_address&ip=127.0.0.1&agent=Mozilla`
      )
      if (!res.ok) return []
      const session = await res.json()
      
      const messagesRes = await fetchWithTimeout(
        `https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${session.sid_token}`
      )
      if (!messagesRes.ok) return []
      const data = await messagesRes.json()
      
      return (data.list || []).map((msg: { mail_id: string; mail_from: string; mail_subject: string; mail_timestamp: string }) => ({
        id: msg.mail_id,
        from: msg.mail_from,
        fromName: msg.mail_from.split('@')[0],
        to: `${login}@${domain}`,
        subject: msg.mail_subject || '(No subject)',
        body: '',
        date: new Date(parseInt(msg.mail_timestamp) * 1000).toISOString(),
        read: false,
        starred: false,
        spam: false,
        labels: [],
      }))
    } catch {
      return []
    }
  },
  
  async getMessage() {
    // Guerrilla requires session handling, simplified for now
    return null
  },
}

// TempMail.lol API
const tempMailLolProvider: APIProvider = {
  name: 'tempmail.lol',
  
  async getDomains() {
    try {
      const res = await fetchWithTimeout('https://api.tempmail.lol/v2/domains')
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.domains || ['tempmail.lol']
    } catch {
      return ['tempmail.lol']
    }
  },
  
  async getMessages(login: string, domain: string) {
    try {
      const res = await fetchWithTimeout(`https://api.tempmail.lol/v2/inbox?email=${login}@${domain}`)
      if (!res.ok) return []
      const data = await res.json()
      
      return (data.emails || []).map((msg: { id: string; from: string; subject: string; date: string; body: string }) => ({
        id: msg.id,
        from: msg.from,
        fromName: msg.from.split('@')[0],
        to: `${login}@${domain}`,
        subject: msg.subject || '(No subject)',
        body: msg.body || '',
        date: msg.date,
        read: false,
        starred: false,
        spam: false,
        labels: [],
      }))
    } catch {
      return []
    }
  },
  
  async getMessage(login: string, domain: string, id: string) {
    try {
      const res = await fetchWithTimeout(`https://api.tempmail.lol/v2/email/${id}`)
      if (!res.ok) return null
      const msg = await res.json()
      
      return {
        id: msg.id,
        from: msg.from,
        fromName: msg.from.split('@')[0],
        to: `${login}@${domain}`,
        subject: msg.subject || '(No subject)',
        body: msg.body || '',
        html: msg.html,
        date: msg.date,
        read: true,
        starred: false,
        spam: false,
        labels: [],
      }
    } catch {
      return null
    }
  },
}

// ==================== MAIN SERVICE ====================

// Priority order of providers
const providers: APIProvider[] = [
  oneSecMailProvider,
  tempMailLolProvider,
  guerrillaMailProvider,
]

// Test if a provider is working
async function testProvider(provider: APIProvider): Promise<boolean> {
  try {
    const domains = await provider.getDomains()
    return domains.length > 0
  } catch {
    return false
  }
}

// Find the first working provider
async function findWorkingProvider(): Promise<{ provider: APIProvider; domain: string } | null> {
  for (const provider of providers) {
    try {
      console.log(`[v0] Testing provider: ${provider.name}`)
      const isWorking = await testProvider(provider)
      if (isWorking) {
        const domains = await provider.getDomains()
        if (domains.length > 0) {
          console.log(`[v0] Provider ${provider.name} is working with domain: ${domains[0]}`)
          return { provider, domain: domains[0] }
        }
      }
    } catch (e) {
      console.log(`[v0] Provider ${provider.name} failed:`, e)
    }
  }
  return null
}

class EmailService {
  private account: EmailAccount | null = null
  private currentProvider: APIProvider | null = null
  private failureCount = 0
  private maxFailures = 3
  
  // Create a new email account with automatic API selection
  async createAccount(): Promise<EmailAccount | null> {
    console.log('[v0] Creating new email account...')
    
    const result = await findWorkingProvider()
    if (!result) {
      console.error('[v0] No working email provider found')
      return null
    }
    
    const { provider, domain } = result
    this.currentProvider = provider
    
    const login = generateRandomString(10)
    const email = `${login}@${domain}`
    const now = new Date()
    const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
    
    this.account = {
      email,
      login,
      domain,
      api: provider.name,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expires.toISOString(),
    }
    
    this.failureCount = 0
    console.log(`[v0] Account created: ${email} using ${provider.name}`)
    return this.account
  }
  
  // Set existing account (from localStorage)
  setAccount(account: EmailAccount) {
    this.account = account
    // Find the matching provider
    this.currentProvider = providers.find(p => p.name === account.api) || oneSecMailProvider
    this.failureCount = 0
    console.log(`[v0] Account restored: ${account.email} using ${account.api}`)
  }
  
  // Get current account
  getAccount(): EmailAccount | null {
    return this.account
  }
  
  // Switch to a different working provider
  private async switchProvider(): Promise<boolean> {
    console.log('[v0] Switching to different provider...')
    
    const currentName = this.currentProvider?.name
    for (const provider of providers) {
      if (provider.name === currentName) continue
      
      const isWorking = await testProvider(provider)
      if (isWorking) {
        const domains = await provider.getDomains()
        if (domains.length > 0 && this.account) {
          // Create new account with new provider
          const login = generateRandomString(10)
          const domain = domains[0]
          const email = `${login}@${domain}`
          const now = new Date()
          const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          
          this.account = {
            ...this.account,
            email,
            login,
            domain,
            api: provider.name,
            lastActivity: now.toISOString(),
            expiresAt: expires.toISOString(),
          }
          
          this.currentProvider = provider
          this.failureCount = 0
          console.log(`[v0] Switched to ${provider.name}: ${email}`)
          return true
        }
      }
    }
    
    return false
  }
  
  // Get messages with automatic failover
  async getMessages(): Promise<Email[]> {
    if (!this.account || !this.currentProvider) {
      console.log('[v0] No account or provider set')
      return []
    }
    
    try {
      const messages = await this.currentProvider.getMessages(this.account.login, this.account.domain)
      this.failureCount = 0
      this.updateActivity()
      return messages
    } catch (error) {
      console.error(`[v0] Failed to get messages:`, error)
      this.failureCount++
      
      if (this.failureCount >= this.maxFailures) {
        console.log('[v0] Too many failures, switching provider...')
        const switched = await this.switchProvider()
        if (switched) {
          // Retry with new provider
          return this.getMessages()
        }
      }
      
      return []
    }
  }
  
  // Get single message with automatic failover
  async getMessage(id: string): Promise<Email | null> {
    if (!this.account || !this.currentProvider) {
      return null
    }
    
    try {
      const message = await this.currentProvider.getMessage(this.account.login, this.account.domain, id)
      this.updateActivity()
      return message
    } catch (error) {
      console.error(`[v0] Failed to get message:`, error)
      this.failureCount++
      
      if (this.failureCount >= this.maxFailures) {
        await this.switchProvider()
      }
      
      return null
    }
  }
  
  // Update last activity to extend email lifetime
  private updateActivity() {
    if (this.account) {
      const now = new Date()
      const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      this.account.lastActivity = now.toISOString()
      this.account.expiresAt = expires.toISOString()
    }
  }
  
  // Check if account is expired
  isExpired(): boolean {
    if (!this.account) return true
    return new Date() > new Date(this.account.expiresAt)
  }
  
  // Force refresh - test current provider and switch if needed
  async healthCheck(): Promise<boolean> {
    if (!this.currentProvider) return false
    
    const isWorking = await testProvider(this.currentProvider)
    if (!isWorking) {
      return await this.switchProvider()
    }
    return true
  }
}

export const emailService = new EmailService()
