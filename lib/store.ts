import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  attachments?: { name: string; size: number; type: string }[]
}

export interface Label {
  id: string
  name: string
  color: string
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

interface EmailState {
  // Account
  account: EmailAccount | null
  setAccount: (account: EmailAccount | null) => void
  
  // Emails
  emails: Email[]
  setEmails: (emails: Email[]) => void
  addEmail: (email: Email) => void
  updateEmail: (id: string, updates: Partial<Email>) => void
  deleteEmail: (id: string) => void
  
  // Labels
  labels: Label[]
  addLabel: (label: Label) => void
  updateLabel: (id: string, updates: Partial<Label>) => void
  deleteLabel: (id: string) => void
  
  // UI State
  selectedEmailId: string | null
  setSelectedEmailId: (id: string | null) => void
  currentFolder: string
  setCurrentFolder: (folder: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Onboarding
  hasAcceptedTerms: boolean
  setHasAcceptedTerms: (accepted: boolean) => void
  
  // Compose
  isComposeOpen: boolean
  setIsComposeOpen: (open: boolean) => void
  replyTo: Email | null
  setReplyTo: (email: Email | null) => void
}

export const useEmailStore = create<EmailState>()(
  persist(
    (set) => ({
      // Account
      account: null,
      setAccount: (account) => set({ account }),
      
      // Emails
      emails: [],
      setEmails: (emails) => set({ emails }),
      addEmail: (email) => set((state) => ({ emails: [email, ...state.emails] })),
      updateEmail: (id, updates) => set((state) => ({
        emails: state.emails.map((e) => e.id === id ? { ...e, ...updates } : e)
      })),
      deleteEmail: (id) => set((state) => ({
        emails: state.emails.filter((e) => e.id !== id)
      })),
      
      // Labels
      labels: [
        { id: '1', name: 'Работа', color: '#3b82f6' },
        { id: '2', name: 'Личное', color: '#22c55e' },
        { id: '3', name: 'Важное', color: '#ef4444' },
      ],
      addLabel: (label) => set((state) => ({ labels: [...state.labels, label] })),
      updateLabel: (id, updates) => set((state) => ({
        labels: state.labels.map((l) => l.id === id ? { ...l, ...updates } : l)
      })),
      deleteLabel: (id) => set((state) => ({
        labels: state.labels.filter((l) => l.id !== id)
      })),
      
      // UI State
      selectedEmailId: null,
      setSelectedEmailId: (id) => set({ selectedEmailId: id }),
      currentFolder: 'inbox',
      setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmailId: null }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // Onboarding
      hasAcceptedTerms: false,
      setHasAcceptedTerms: (accepted) => set({ hasAcceptedTerms: accepted }),
      
      // Compose
      isComposeOpen: false,
      setIsComposeOpen: (open) => set({ isComposeOpen: open }),
      replyTo: null,
      setReplyTo: (email) => set({ replyTo: email }),
    }),
    {
      name: 'rusmail-storage',
      partialize: (state) => ({
        account: state.account,
        emails: state.emails,
        labels: state.labels,
        hasAcceptedTerms: state.hasAcceptedTerms,
      }),
    }
  )
)
