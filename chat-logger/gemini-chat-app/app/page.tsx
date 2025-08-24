"use client"

import { ChatInterface } from "@/components/chat-interface"
import { ChatSidebar } from "@/components/chat-sidebar"
import { useChatInstances } from "@/hooks/use-chat-instances"
import { useStacks } from "@/hooks/use-stacks"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function Home() {
  const {
    chatInstances,
    activeChatId,
    createNewChat,
    selectChat,
    deleteChat,
    renameChat,
  } = useChatInstances()

  const { 
    isConnected, 
    connectWallet, 
    disconnectWallet, 
    userAddress,
    saveToBlockchain,
    verifyChat,
    getUserLogs
  } = useStacks()

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        {/* Sidebar - Fixed width, collapsible */}
        <ChatSidebar
          chatInstances={chatInstances}
          activeChatId={activeChatId}
          onChatSelect={selectChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
        
        {/* Main Content Area - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-6 pb-4">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {chatInstances.find(c => c.id === activeChatId)?.title || "New Chat"}
                </h1>
                <p className="text-muted-foreground">
                  Chat with AI and save conversations to the Stacks blockchain for verification
                </p>
              </div>
            </div>
            
            {/* Chat Interface - Takes remaining height */}
            <div className="flex-1 px-6 pb-6">
              <ChatInterface 
                key={activeChatId}
                walletState={{
                  isConnected,
                  connectWallet,
                  disconnectWallet,
                  userAddress,
                  saveToBlockchain,
                  verifyChat,
                  getUserLogs
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
  