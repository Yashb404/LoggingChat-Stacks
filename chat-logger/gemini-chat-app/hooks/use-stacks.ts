"use client"

import { useState, useEffect } from "react"
import { connect, disconnect, isConnected as checkConnection, request } from "@stacks/connect"
import { bufferCV, principalCV, uintCV, cvToHex } from "@stacks/transactions"
import { STACKS_TESTNET } from "@stacks/network"

export function useStacks() {
  const [isConnected, setIsConnected] = useState(false)
  const [userAddress, setUserAddress] = useState<string>("")

  const network = STACKS_TESTNET
  const contractAddress = "STKNRFQ8SSPZE263K0R2N4HZG2G3JY4KZ03F4EPA"
  const contractName = "logger"

  useEffect(() => {
    const connected = checkConnection()
    setIsConnected(connected)

    if (connected) {
      // Get addresses from local storage
      const data = localStorage.getItem("stacks-connect")
      if (data) {
        try {
          const parsed = JSON.parse(data)
          if (parsed.addresses?.stx?.[0]?.address) {
            setUserAddress(parsed.addresses.stx[0].address)
          }
        } catch (error) {
          console.error("Error parsing stored addresses:", error)
        }
      }
    }
  }, [])

  const connectWallet = async () => {
    try {
      const response = await connect({
        forceWalletSelect: true,
      })

      setIsConnected(true)

      // Get addresses after connection
      const addresses = await request("getAddresses")
      if (addresses.addresses && addresses.addresses.length > 0) {
        // Find Stacks address
        const stxAddress = addresses.addresses.find(
          (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
        )
        if (stxAddress) {
          setUserAddress(stxAddress.address)
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      throw error
    }
  }

  const disconnectWallet = () => {
    disconnect()
    setIsConnected(false)
    setUserAddress("")
  }

  const hashMessage = async (message: string): Promise<Uint8Array> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    return new Uint8Array(hashBuffer)
  }

  const callReadOnlyFunction = async (functionName: string, functionArgs: any[]) => {
    const response = await fetch(
      `https://api.testnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: userAddress,
          arguments: functionArgs.map((arg) => cvToHex(arg)),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  const saveToBlockchain = async (prompt: string, response: string) => {
    if (!isConnected) {
      throw new Error("Wallet not connected")
    }

    const promptHash = await hashMessage(prompt)
    const responseHash = await hashMessage(response)

    try {
      const result = await request("stx_callContract", {
        contract: `${contractAddress}.${contractName}`,
        functionName: "log-interaction",
        functionArgs: [bufferCV(promptHash), bufferCV(responseHash)],
        network: "testnet",
      })

      console.log("Transaction completed:", result)
      alert("Chat saved to blockchain! Transaction ID: " + result.txid)
      return result.txid
    } catch (error) {
      console.error("Error saving to blockchain:", error)
      throw error
    }
  }

  const verifyChat = async (prompt: string, response: string): Promise<boolean> => {
    if (!isConnected || !userAddress) {
      throw new Error("Wallet not connected")
    }

    try {
      const logCountResult = await callReadOnlyFunction("get-user-log-count", [principalCV(userAddress)])

      // TODO: Parse the Clarity response format to extract the actual count
      console.log("Log count result:", logCountResult)
      const logCount = 0 // TODO: Extract actual count from logCountResult.result

      if (logCount === 0) {
        console.log("No logs found for user")
        return false
      }

      // Hash the provided messages
      const promptHash = await hashMessage(prompt)
      const responseHash = await hashMessage(response)

      // Check each log entry for a match
      for (let i = 0; i < logCount; i++) {
        const logResult = await callReadOnlyFunction("get-log", [principalCV(userAddress), uintCV(i)])

        if (logResult.result && logResult.result !== "(none)") {
          // TODO: Parse the Clarity response format and compare hashes
          console.log("Log entry found:", logResult)
        }
      }

      return false // TODO: Return true if hashes match
    } catch (error) {
      console.error("Error verifying chat:", error)
      throw error
    }
  }

  const getUserLogs = async (): Promise<any[]> => {
    if (!isConnected || !userAddress) {
      throw new Error("Wallet not connected")
    }

    try {
      const logCountResult = await callReadOnlyFunction("get-user-log-count", [principalCV(userAddress)])

      console.log("Log count result:", logCountResult)
      let logCount = 0

      if (logCountResult.result && logCountResult.result.startsWith("(ok u")) {
        // Extract number from "(ok u123)" format
        const match = logCountResult.result.match(/$$ok u(\d+)$$/)
        if (match) {
          logCount = Number.parseInt(match[1], 10)
        }
      }

      console.log("Parsed log count:", logCount)
      const logs = []

      // Fetch all logs for the user
      for (let i = 0; i < logCount; i++) {
        const logResult = await callReadOnlyFunction("get-log", [principalCV(userAddress), uintCV(i)])

        if (logResult.result && logResult.result !== "(none)") {
          // Parse tuple format: (ok (some {prompt-hash: 0x..., response-hash: 0x..., timestamp: u...}))
          console.log("Raw log result:", logResult.result)

          const tupleMatch = logResult.result.match(/$$ok \(some \{([^}]+)\}$$\)/)
          if (tupleMatch) {
            const tupleContent = tupleMatch[1]
            const promptHashMatch = tupleContent.match(/prompt-hash: (0x[a-fA-F0-9]+)/)
            const responseHashMatch = tupleContent.match(/response-hash: (0x[a-fA-F0-9]+)/)
            const timestampMatch = tupleContent.match(/timestamp: u(\d+)/)

            logs.push({
              id: i,
              promptHash: promptHashMatch ? promptHashMatch[1] : null,
              responseHash: responseHashMatch ? responseHashMatch[1] : null,
              timestamp: timestampMatch ? Number.parseInt(timestampMatch[1], 10) : null,
              rawData: logResult.result,
            })
          } else {
            logs.push({
              id: i,
              rawData: logResult.result,
            })
          }
        }
      }

      return logs
    } catch (error) {
      console.error("Error fetching user logs:", error)
      throw error
    }
  }

  return {
    isConnected,
    userAddress,
    connectWallet,
    disconnectWallet,
    saveToBlockchain,
    verifyChat,
    getUserLogs,
  }
}
