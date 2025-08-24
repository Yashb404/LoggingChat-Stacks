


"use client"

import { useState, useCallback } from "react"
import { ChatInstance } from "@/components/chat-sidebar"

export function useChatInstances() {
  const [chatInstances, setChatInstances] = useState<ChatInstance[]>([
    {
      id: "default",
      title: "New Chat",
      timestamp: new Date(),
      isActive: true,
    }
  ])
  
  const [activeChatId, setActiveChatId] = useState("default")

  const createNewChat = useCallback(() => {
    const newChat: ChatInstance = {
      id: `chat-${Date.now()}`,
      title: `Chat ${chatInstances.length + 1}`,
      timestamp: new Date(),
      isActive: false,
    }
    
    setChatInstances(prev => prev.map(chat => ({ ...chat, isActive: false })).concat(newChat))
    setActiveChatId(newChat.id)
  }, [chatInstances.length])

  const selectChat = useCallback((chatId: string) => {
    setChatInstances(prev => 
      prev.map(chat => ({ ...chat, isActive: chat.id === chatId }))
    )
    setActiveChatId(chatId)
  }, [])

  const deleteChat = useCallback((chatId: string) => {
    if (chatInstances.length <= 1) return // Don't delete the last chat
    
    setChatInstances(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId)
      if (chatId === activeChatId) {
        // If we're deleting the active chat, switch to the first available
        const newActiveChat = filtered[0]
        if (newActiveChat) {
          setActiveChatId(newActiveChat.id)
          return filtered.map(chat => ({ ...chat, isActive: chat.id === newActiveChat.id }))
        }
      }
      return filtered
    })
  }, [chatInstances.length, activeChatId])

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    setChatInstances(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    )
  }, [])

  const updateChatLastMessage = useCallback((chatId: string, message: string) => {
    setChatInstances(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, lastMessage: message } : chat
      )
    )
  }, [])

  const getActiveChat = useCallback(() => {
    return chatInstances.find(chat => chat.id === activeChatId)
  }, [chatInstances, activeChatId])

  return {
    chatInstances,
    activeChatId,
    activeChat: getActiveChat(),
    createNewChat,
    selectChat,
    deleteChat,
    renameChat,
    updateChatLastMessage,
  }
}