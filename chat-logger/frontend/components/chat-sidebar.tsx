


"use client"

import { useState } from "react"
import { Plus, MessageSquare, Trash2, Settings, Bot } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ChatInstance {
  id: string
  title: string
  lastMessage?: string
  timestamp: Date
  isActive: boolean
}

interface ChatSidebarProps {
  chatInstances: ChatInstance[]
  activeChatId: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  onRenameChat: (chatId: string, newTitle: string) => void
}

export function ChatSidebar({
  chatInstances,
  activeChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: ChatSidebarProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const handleEditStart = (chat: ChatInstance) => {
    setEditingChatId(chat.id)
    setEditTitle(chat.title)
  }

  const handleEditSave = () => {
    if (editingChatId && editTitle.trim()) {
      onRenameChat(editingChatId, editTitle.trim())
      setEditingChatId(null)
      setEditTitle("")
    }
  }

  const handleEditCancel = () => {
    setEditingChatId(null)
    setEditTitle("")
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Chat Instances</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sidebar-foreground/70">Recent Chats</span>
              <Button
                onClick={onNewChat}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-sidebar-accent"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {chatInstances.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    isActive={chat.id === activeChatId}
                    onClick={() => onChatSelect(chat.id)}
                    className="group relative"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-6 text-xs bg-background"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave()
                              if (e.key === "Escape") handleEditCancel()
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditSave}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                            className="h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span className="truncate">{chat.title}</span>
                      )}
                      {chat.lastMessage && (
                        <p className="text-xs text-sidebar-foreground/60 truncate">
                          {chat.lastMessage}
                        </p>
                      )}
                      <p className="text-xs text-sidebar-foreground/40">
                        {formatTimestamp(chat.timestamp)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditStart(chat)
                        }}
                        className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteChat(chat.id)
                        }}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {chatInstances.length === 0 && (
                <div className="px-4 py-8 text-center text-sidebar-foreground/60">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat instances yet</p>
                  <p className="text-xs">Start a new conversation to get started</p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}