"use client"

import { useState, useEffect } from "react"
import { connect, disconnect, isConnected as checkConnection, request } from "@stacks/connect"
import { bufferCV, principalCV, uintCV, cvToHex, hexToCV, cvToValue, cvToJSON } from "@stacks/transactions"
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
      // Method 1: Get addresses from local storage
      const data = localStorage.getItem("stacks-connect")
      if (data) {
        try {
          const parsed = JSON.parse(data)
          if (parsed.addresses?.stx?.[0]?.address) {
            console.log("[v0] Found address in localStorage:", parsed.addresses.stx[0].address)
            setUserAddress(parsed.addresses.stx[0].address)
            return
          }
        } catch (error) {
          console.error("Error parsing stored addresses:", error)
        }
      }

      // Method 2: Try to get addresses via request
      request("getAddresses")
        .then((addresses) => {
          console.log("[v0] Got addresses from request:", addresses)
          if (addresses.addresses && addresses.addresses.length > 0) {
            const stxAddress = addresses.addresses.find(
              (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
            )
            if (stxAddress) {
              console.log("[v0] Setting user address from request:", stxAddress.address)
              setUserAddress(stxAddress.address)
            }
          }
        })
        .catch((error) => {
          console.log("[v0] Could not get addresses via request:", error)
        })
    }
  }, [])

  const connectWallet = async () => {
    try {
      const response = await connect({})

      setIsConnected(true)
      console.log("[v0] Wallet connected, response:", response)

      try {
        const addresses = await request("getAddresses")
        console.log("[v0] Got addresses after connection:", addresses)
        if (addresses.addresses && addresses.addresses.length > 0) {
          const stxAddress = addresses.addresses.find(
            (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
          )
          if (stxAddress) {
            console.log("[v0] Setting user address after connection:", stxAddress.address)
            setUserAddress(stxAddress.address)
          }
        }
      } catch (addressError) {
        console.log("[v0] Could not get addresses after connection:", addressError)

        // Fallback: try localStorage
        const data = localStorage.getItem("stacks-connect")
        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (parsed.addresses?.stx?.[0]?.address) {
              console.log("[v0] Using fallback address from localStorage:", parsed.addresses.stx[0].address)
              setUserAddress(parsed.addresses.stx[0].address)
            }
          } catch (error) {
            console.error("Error parsing stored addresses in fallback:", error)
          }
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
    console.log("[v0] Making API call to:", functionName)
    console.log("[v0] With arguments:", functionArgs)
    console.log("[v0] User address:", userAddress)

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

    console.log("[v0] API response status:", response.status)
    console.log("[v0] API response ok:", response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] API error response:", errorText)
      throw new Error(`API call failed: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] API response data:", data)
    return data
  }

  const saveToBlockchain = async (prompt: string, response: string) => {
    if (!isConnected) {
      throw new Error("Wallet not connected")
    }

    if (!userAddress) {
      console.log("[v0] User address not available, trying to refresh...")
      try {
        const addresses = await request("getAddresses")
        if (addresses.addresses && addresses.addresses.length > 0) {
          const stxAddress = addresses.addresses.find(
            (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
          )
          if (stxAddress) {
            setUserAddress(stxAddress.address)
          }
        }
      } catch (error) {
        console.log("[v0] Could not refresh user address:", error)
      }
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
    if (!userAddress) {
      console.log("[v0] User address not available for verification, trying to refresh...")
      try {
        const addresses = await request("getAddresses")
        if (addresses.addresses && addresses.addresses.length > 0) {
          const stxAddress = addresses.addresses.find(
            (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
          )
          if (stxAddress) {
            setUserAddress(stxAddress.address)
          } else {
            throw new Error("No Stacks address found")
          }
        } else {
          throw new Error("No addresses returned")
        }
      } catch (error) {
        console.log("[v0] Could not refresh user address for verification:", error)
        throw new Error("User address not available")
      }
    }

    try {
      console.log("[v0] Starting chat verification")
      const logCountResult = await callReadOnlyFunction("get-user-log-count", [principalCV(userAddress)])

      console.log("[v0] Log count result for verification:", logCountResult)
      let logCount = 0

      if (logCountResult.result) {
        try {
          const clarityValue = hexToCV(logCountResult.result)
          logCount = Number(cvToValue(clarityValue))
          console.log("[v0] Successfully parsed log count:", logCount)
        } catch (parseError) {
          console.log("[v0] Could not parse hex value:", logCountResult.result, parseError)
          return false
        }
      }

      console.log("[v0] Log count for verification:", logCount)

      if (logCount === 0) {
        console.log("[v0] No logs found for user")
        return false
      }

      // Hash the provided messages
      const promptHash = await hashMessage(prompt)
      const responseHash = await hashMessage(response)

      const promptHashHex =
        "0x" +
        Array.from(promptHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      const responseHashHex =
        "0x" +
        Array.from(responseHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      console.log("[v0] Looking for prompt hash:", promptHashHex)
      console.log("[v0] Looking for response hash:", responseHashHex)

      // Check each log entry for a match
      for (let i = 1; i <= logCount; i++) {
        const logResult = await callReadOnlyFunction("get-log", [principalCV(userAddress), uintCV(i)])

        if (logResult.result && logResult.result !== "(none)") {
          console.log("[v0] Checking log entry", i, ":", logResult.result)

          try {
            const clarityValue = hexToCV(logResult.result)
            const logData = cvToValue(clarityValue)
            console.log("[v0] Parsed log entry value:", logData)

            if (logData && typeof logData === "object") {
              const promptHashStored = logData["prompt-hash"]
              const responseHashStored = logData["response-hash"]

              if (promptHashStored && responseHashStored) {
                // Convert buffer to hex string for comparison
                const storedPromptHex =
                  "0x" +
                  Array.from(new Uint8Array(promptHashStored))
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")
                const storedResponseHex =
                  "0x" +
                  Array.from(new Uint8Array(responseHashStored))
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")

                console.log("[v0] Stored prompt hash:", storedPromptHex)
                console.log("[v0] Stored response hash:", storedResponseHex)

                if (storedPromptHex === promptHashHex && storedResponseHex === responseHashHex) {
                  console.log("[v0] Hash match found!")
                  return true
                }
              }
            }
          } catch (parseError) {
            console.log("[v0] Could not parse log entry:", parseError)
            continue
          }
        }
      }

      console.log("[v0] No matching hashes found")
      return false
    } catch (error) {
      console.error("[v0] Error verifying chat:", error)
      throw error
    }
  }

  const getUserLogs = async (): Promise<any[]> => {
    if (!userAddress) {
      console.log("[v0] User address not available for logs, trying to refresh...")
      try {
        const addresses = await request("getAddresses")
        if (addresses.addresses && addresses.addresses.length > 0) {
          const stxAddress = addresses.addresses.find(
            (addr) => addr.address.startsWith("ST") || addr.address.startsWith("SP"),
          )
          if (stxAddress) {
            setUserAddress(stxAddress.address)
          } else {
            throw new Error("No Stacks address found")
          }
        } else {
          throw new Error("No addresses returned")
        }
      } catch (error) {
        console.log("[v0] Could not refresh user address for logs:", error)
        throw new Error("User address not available")
      }
    }

    try {
      console.log("[v0] Fetching logs for user:", userAddress)
      const logCountResult = await callReadOnlyFunction("get-user-log-count", [principalCV(userAddress)])

      console.log("[v0] Raw log count result:", logCountResult)
      let logCount = 0

      if (logCountResult.result) {
        try {
          const clarityValue = hexToCV(logCountResult.result)
          logCount = Number(cvToValue(clarityValue))
          console.log("[v0] Successfully parsed log count:", logCount)
        } catch (parseError) {
          console.log("[v0] Could not parse log count:", parseError)
          return []
        }
      }

      console.log("[v0] Parsed log count:", logCount)

      if (logCount === 0) {
        console.log("[v0] No logs found, returning empty array")
        return []
      }

      const logs = []

      // Fetch all logs for the user
      for (let i = 1; i <= logCount; i++) {
        console.log("[v0] Fetching log", i)
        const logResult = await callReadOnlyFunction("get-log", [principalCV(userAddress), uintCV(i)])

        console.log("[v0] Raw log result for index", i, ":", logResult)

        if (logResult.result && logResult.result !== "(none)") {
          try {
            const clarityValue = hexToCV(logResult.result)
            const logData = cvToValue(clarityValue)
            console.log("[v0] Parsed log entry value:", logData)

            if (logData && typeof logData === "object") {
              const promptHash = logData["prompt-hash"]
              const responseHash = logData["response-hash"]
              const timestamp = logData["timestamp"]

              logs.push({
                id: i,
                promptHash: promptHash
                  ? "0x" +
                    Array.from(new Uint8Array(promptHash))
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("")
                  : null,
                responseHash: responseHash
                  ? "0x" +
                    Array.from(new Uint8Array(responseHash))
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("")
                  : null,
                timestamp: timestamp ? Number(timestamp) : null,
                rawData: cvToJSON(clarityValue),
              })
            } else {
              logs.push({
                id: i,
                rawData: cvToJSON(clarityValue),
                error: "Unexpected log data format",
                parsedValue: logData,
              })
            }
          } catch (parseError) {
            console.log("[v0] Could not parse log entry:", parseError)
            logs.push({
              id: i,
              rawData: logResult.result,
              error: "Could not parse Clarity value",
            })
          }
        }
      }

      console.log("[v0] Final logs array:", logs)
      return logs
    } catch (error) {
      console.error("[v0] Error fetching user logs:", error)
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
