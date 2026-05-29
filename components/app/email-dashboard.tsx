'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEmailStore, Email, Label } from '@/lib/store'
import { emailService } from '@/lib/email-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTheme } from 'next-themes'
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  AlertCircle,
  Tag,
  Search,
  Menu,
  X,
  RefreshCw,
  Plus,
  MoreVertical,
  Copy,
  Check,
  Moon,
  Sun,
  ChevronLeft,
  Clock,
  Settings,
  LogOut,
  Folder,
  Archive,
  Reply,
  Forward,
  Pencil
} from 'lucide-react'
import { ComposeEmail } from './compose-email'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function EmailDashboard() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newLabelDialogOpen, setNewLabelDialogOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6')
  
  const {
    account,
    setAccount,
    emails,
    setEmails,
    addEmail,
    updateEmail,
    deleteEmail,
    labels,
    addLabel,
    deleteLabel,
    selectedEmailId,
    setSelectedEmailId,
    currentFolder,
    setCurrentFolder,
    searchQuery,
    setSearchQuery,
    isComposeOpen,
    setIsComposeOpen,
    replyTo,
    setReplyTo,
  } = useEmailStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize email account
  useEffect(() => {
    async function initAccount() {
      if (account && account.login && account.domain && account.api) {
        // Restore existing account
        emailService.setAccount(account)
        setIsLoading(false)
        return
      }

      // Create new account
      const newAccount = await emailService.createAccount()
      if (newAccount) {
        setAccount({
          email: newAccount.email,
          login: newAccount.login,
          domain: newAccount.domain,
          api: newAccount.api,
          createdAt: newAccount.createdAt,
          lastActivity: newAccount.lastActivity,
          expiresAt: newAccount.expiresAt,
        })
      }
      setIsLoading(false)
    }

    initAccount()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch emails periodically
  const fetchEmails = useCallback(async () => {
    if (!account) return
    
    setIsRefreshing(true)
    try {
      const messages = await emailService.getMessages()
      
      // Merge with existing emails to preserve local state (starred, labels, etc.)
      const existingEmailMap = new Map(emails.map(e => [e.id, e]))
      const updatedEmails = messages.map(msg => {
        const existing = existingEmailMap.get(msg.id)
        if (existing) {
          return { ...existing, ...msg, starred: existing.starred, labels: existing.labels }
        }
        return msg as Email
      })
      
      setEmails(updatedEmails)
      
      // Update account expiry time
      const currentAccount = emailService.getAccount()
      if (currentAccount) {
        setAccount({
          email: currentAccount.email,
          login: currentAccount.login,
          domain: currentAccount.domain,
          api: currentAccount.api,
          createdAt: currentAccount.createdAt,
          lastActivity: currentAccount.lastActivity,
          expiresAt: currentAccount.expiresAt,
        })
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    }
    setIsRefreshing(false)
  }, [account, emails, setEmails, setAccount])

  useEffect(() => {
    if (account && !isLoading) {
      fetchEmails()
      const interval = setInterval(fetchEmails, 10000)
      return () => clearInterval(interval)
    }
  }, [account, isLoading, fetchEmails])

  // Get selected email details
  const selectedEmail = emails.find(e => e.id === selectedEmailId)

  // Filter emails based on current folder and search
  const filteredEmails = emails.filter(email => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Folder filter
    switch (currentFolder) {
      case 'inbox':
        return !email.spam
      case 'starred':
        return email.starred && !email.spam
      case 'spam':
        return email.spam
      case 'sent':
        return false // We don't track sent emails locally
      case 'trash':
        return false // Implement if needed
      default:
        // Check if it's a label
        return email.labels.includes(currentFolder) && !email.spam
    }
  })

  // Copy email to clipboard
  const copyEmail = () => {
    if (account?.email) {
      navigator.clipboard.writeText(account.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle label creation
  const createLabel = () => {
    if (newLabelName.trim()) {
      addLabel({
        id: Date.now().toString(),
        name: newLabelName.trim(),
        color: newLabelColor,
      })
      setNewLabelName('')
      setNewLabelDialogOpen(false)
    }
  }

  // Toggle email starred status
  const toggleStarred = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (email) {
      updateEmail(id, { starred: !email.starred })
    }
  }

  // Toggle spam status
  const toggleSpam = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (email) {
      updateEmail(id, { spam: !email.spam })
    }
  }

  // Add/remove label from email
  const toggleLabel = (emailId: string, labelId: string) => {
    const email = emails.find(e => e.id === emailId)
    if (email) {
      const hasLabel = email.labels.includes(labelId)
      const newLabels = hasLabel
        ? email.labels.filter(l => l !== labelId)
        : [...email.labels, labelId]
      updateEmail(emailId, { labels: newLabels })
    }
  }

  // Mark email as read
  const markAsRead = (id: string) => {
    updateEmail(id, { read: true })
  }

  // Handle reply
  const handleReply = (email: Email) => {
    setReplyTo(email)
    setIsComposeOpen(true)
  }

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Создание почтового ящика...</p>
        </div>
      </div>
    )
  }

  const folderItems = [
    { id: 'inbox', icon: Inbox, label: 'Входящие', count: emails.filter(e => !e.spam && !e.read).length },
    { id: 'starred', icon: Star, label: 'Помеченные', count: emails.filter(e => e.starred).length },
    { id: 'sent', icon: Send, label: 'Отправленные', count: 0 },
    { id: 'spam', icon: AlertCircle, label: 'Спам', count: emails.filter(e => e.spam).length },
    { id: 'trash', icon: Trash2, label: 'Корзина', count: 0 },
  ]

  const labelColors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899']

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-sidebar-border p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-sidebar-foreground">RusMail</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Compose Button */}
          <div className="p-4">
            <Button 
              className="w-full"
              onClick={() => {
                setReplyTo(null)
                setIsComposeOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Написать
            </Button>
          </div>

          {/* Email Address */}
          <div className="mx-4 rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
            <p className="mb-1 text-xs text-sidebar-foreground/60">Ваша почта:</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-sm font-medium text-sidebar-foreground">
                {account?.email || 'Загрузка...'}
              </p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0"
                onClick={copyEmail}
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-sidebar-foreground/60">
              <Clock className="h-3 w-3" />
              <span>Активна до: {account?.expiresAt ? format(new Date(account.expiresAt), 'dd.MM.yyyy') : '—'}</span>
            </div>
          </div>

          {/* Folders */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {folderItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentFolder(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    currentFolder === item.id
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1.5 text-xs">
                      {item.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Labels */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between px-3">
                <span className="text-xs font-medium uppercase text-sidebar-foreground/60">Метки</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setNewLabelDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => {
                      setCurrentFolder(label.id)
                      setSidebarOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      currentFolder === label.id
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <div 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left">{label.name}</span>
                    <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1.5 text-xs">
                      {emails.filter(e => e.labels.includes(label.id)).length}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Theme Toggle */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground/60">Тема</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск писем..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchEmails}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        {/* Email List and Detail */}
        <div className="flex flex-1 overflow-hidden">
          {/* Email List */}
          <div className={`
            flex flex-col border-r border-border bg-background
            ${selectedEmail ? 'hidden md:flex md:w-80 lg:w-96' : 'flex-1'}
          `}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-foreground">
                {folderItems.find(f => f.id === currentFolder)?.label || 
                 labels.find(l => l.id === currentFolder)?.name || 
                 'Письма'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredEmails.length} {filteredEmails.length === 1 ? 'письмо' : 'писем'}
              </span>
            </div>

            <ScrollArea className="flex-1">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Нет писем</p>
                  <p className="mt-1 text-sm text-muted-foreground/60">
                    {currentFolder === 'inbox' 
                      ? 'Используйте ваш email для регистрации на сайтах'
                      : 'В этой папке пока пусто'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmailId(email.id)
                        markAsRead(email.id)
                      }}
                      className={`flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-muted/50 ${
                        selectedEmailId === email.id ? 'bg-muted' : ''
                      } ${!email.read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 truncate text-sm ${!email.read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                          {email.fromName || email.from}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(email.date), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                      <p className={`truncate text-sm ${!email.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {email.subject || '(Без темы)'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {email.body.slice(0, 100)}
                      </p>
                      {email.labels.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {email.labels.map(labelId => {
                            const label = labels.find(l => l.id === labelId)
                            if (!label) return null
                            return (
                              <div
                                key={labelId}
                                className="rounded px-1.5 py-0.5 text-xs text-white"
                                style={{ backgroundColor: label.color }}
                              >
                                {label.name}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Email Detail */}
          {selectedEmail ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Detail Header */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedEmailId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStarred(selectedEmail.id)}
                >
                  <Star className={`h-5 w-5 ${selectedEmail.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleSpam(selectedEmail.id)}
                >
                  <AlertCircle className={`h-5 w-5 ${selectedEmail.spam ? 'text-destructive' : ''}`} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Tag className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {labels.map(label => (
                      <DropdownMenuItem
                        key={label.id}
                        onClick={() => toggleLabel(selectedEmail.id, label.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span>{label.name}</span>
                          {selectedEmail.labels.includes(label.id) && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    deleteEmail(selectedEmail.id)
                    setSelectedEmailId(null)
                  }}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Email Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="mx-auto max-w-3xl">
                  <h1 className="mb-4 text-2xl font-bold text-foreground">
                    {selectedEmail.subject || '(Без темы)'}
                  </h1>

                  <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedEmail.fromName || selectedEmail.from}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedEmail.from}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedEmail.date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>

                  <div className="email-content prose prose-neutral dark:prose-invert max-w-none">
                    {selectedEmail.html ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                    ) : (
                      <div className="whitespace-pre-wrap text-foreground">
                        {selectedEmail.body}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-8 flex gap-3">
                    <Button onClick={() => handleReply(selectedEmail)}>
                      <Reply className="mr-2 h-4 w-4" />
                      Ответить
                    </Button>
                    <Button variant="outline">
                      <Forward className="mr-2 h-4 w-4" />
                      Переслать
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="text-center">
                <Mail className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                <p className="text-lg text-muted-foreground">Выберите письмо для просмотра</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      {isComposeOpen && (
        <ComposeEmail
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false)
            setReplyTo(null)
          }}
          replyTo={replyTo}
          fromEmail={account?.email || ''}
        />
      )}

      {/* New Label Dialog */}
      <Dialog open={newLabelDialogOpen} onOpenChange={setNewLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать метку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Название</label>
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Название метки"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Цвет</label>
              <div className="flex gap-2">
                {labelColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      newLabelColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-background' : ''
                    }`}
                    style={{ backgroundColor: color, ringColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLabelDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createLabel} disabled={!newLabelName.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
