"use client"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { useState } from "react"

export function useGemini() {
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (message: string): Promise<string> => {
    setIsLoading(true)

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

      if (!apiKey) {
        throw new Error(
          "Gemini API key not found. Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment variables.",
        )
      }

      if (!apiKey.startsWith("AIza")) {
        throw new Error("Invalid Gemini API key format. API key should start with 'AIza'.")
      }

      console.log("[v0] API key found, length:", apiKey.length)
      console.log("[v0] API key prefix:", apiKey.substring(0, 10) + "...")

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      console.log("[v0] Sending message to Gemini:", message.substring(0, 50) + "...")

      const result = await model.generateContent(message)
      const response = await result.response
      const text = response.text()

      console.log("[v0] Received response from Gemini:", text.substring(0, 50) + "...")

      return text
    } catch (error) {
      console.error("[v0] Gemini API error:", error)

      if (error instanceof Error) {
        if (error.message.includes("API_KEY_INVALID")) {
          throw new Error(
            "Invalid Gemini API key. Please check your NEXT_PUBLIC_GEMINI_API_KEY environment variable. Get a valid API key from https://makersuite.google.com/app/apikey",
          )
        }
        if (error.message.includes("PERMISSION_DENIED")) {
          throw new Error("API key doesn't have permission to access Gemini. Please check your API key permissions.")
        }
      }

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { sendMessage, isLoading }
}
