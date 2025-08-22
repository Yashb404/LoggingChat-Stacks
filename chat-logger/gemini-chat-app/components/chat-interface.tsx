"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Save, Shield, Loader2, LogOut } from "lucide-react"
import { useGemini } from "@/hooks/use-gemini"
import { useStacks } from "@/hooks/use-stacks"
import type { ChatMessage } from "@/types/chat"

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { sendMessage } = useGemini()
  const { saveToBlockchain, verifyChat, isConnected, connectWallet, disconnectWallet, userAddress } = useStacks()

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await sendMessage(input)
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveToBlockchain = async () => {
    if (messages.length === 0) return

    try {
      const lastUserMessage = messages.filter((m) => m.role === "user").pop()
      const lastAiMessage = messages.filter((m) => m.role === "assistant").pop()

      if (lastUserMessage && lastAiMessage) {
        await saveToBlockchain(lastUserMessage.content, lastAiMessage.content)
      }
    } catch (error) {
      console.error("Error saving to blockchain:", error)
    }
  }

  const handleVerifyChat = async () => {
    if (messages.length === 0) return

    try {
      const lastUserMessage = messages.filter((m) => m.role === "user").pop()
      const lastAiMessage = messages.filter((m) => m.role === "assistant").pop()

      if (lastUserMessage && lastAiMessage) {
        const isValid = await verifyChat(lastUserMessage.content, lastAiMessage.content)
        alert(isValid ? "Chat verified on blockchain!" : "Chat not found on blockchain")
      }
    } catch (error) {
      console.error("Error verifying chat:", error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Wallet Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Blockchain Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Connected to Stacks</Badge>
                  {userAddress && (
                    <span className="text-sm text-muted-foreground">
                      {userAddress.slice(0, 8)}...{userAddress.slice(-4)}
                    </span>
                  )}
                </div>
                <Button onClick={disconnectWallet} size="sm" variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveToBlockchain} size="sm" variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Last Exchange
                </Button>
                <Button onClick={handleVerifyChat} size="sm" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Last Exchange
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={connectWallet} variant="outline">
              Connect Stacks Wallet
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle>Chat with Gemini AI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
