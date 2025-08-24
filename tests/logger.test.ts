import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@hirosystems/clarinet-sdk";

const simnet = await initSimnet();

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

describe("Logger Contract - Basic Test", () => {
  it("should log an interaction and return ID 0", () => {
    // Create simple test hashes
    const promptHash = new Uint8Array(32).fill(1); // all 1s
    const responseHash = new Uint8Array(32).fill(2); // all 2s

    // Call log-interaction function
    const response = simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash), Cl.buffer(responseHash)],
      wallet1
    );

    // Should return ok with uint 0 (first log entry)
    expect(response.result).toBeOk(Cl.uint(0));
  });

  it("should increment log ID for second interaction", () => {
    // First interaction
    const promptHash1 = new Uint8Array(32).fill(3);
    const responseHash1 = new Uint8Array(32).fill(4);
    
    simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash1), Cl.buffer(responseHash1)],
      wallet1
    );

    // Second interaction should return ID 1
    const promptHash2 = new Uint8Array(32).fill(5);
    const responseHash2 = new Uint8Array(32).fill(6);
    
    const response = simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash2), Cl.buffer(responseHash2)],
      wallet1
    );

    expect(response.result).toBeOk(Cl.uint(1));
  });

  it("should retrieve logged chat interaction", () => {
    // Log a chat: "Hello AI" -> "Hi there!"
    const promptHash = new Uint8Array(32).fill(7);
    const responseHash = new Uint8Array(32).fill(8);
    
    // Log the chat interaction
    simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash), Cl.buffer(responseHash)],
      wallet1
    );

    // Retrieve the logged interaction
    const getLogResponse = simnet.callReadOnlyFn(
      "logger",
      "get-log", 
      [Cl.principal(wallet1), Cl.uint(0)],
      wallet1
    );

    // Should find the interaction with our hashes
    expect(getLogResponse.result).toBeSome(
      Cl.tuple({
        "prompt-hash": Cl.buffer(promptHash),
        "response-hash": Cl.buffer(responseHash),
        "block-timestamp": Cl.uint(simnet.blockHeight)
      })
    );
  });

  it("should track user chat count correctly", () => {
    // User starts with 0 chats
    let countResponse = simnet.callReadOnlyFn(
      "logger",
      "get-user-log-count",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(countResponse.result).toEqual(Cl.uint(0));

    // After 3 chat interactions
    for (let i = 0; i < 3; i++) {
      const promptHash = new Uint8Array(32).fill(10 + i);
      const responseHash = new Uint8Array(32).fill(20 + i);
      
      simnet.callPublicFn(
        "logger",
        "log-interaction",
        [Cl.buffer(promptHash), Cl.buffer(responseHash)],
        wallet1
      );
    }

    // Should show 3 total chats
    countResponse = simnet.callReadOnlyFn(
      "logger", 
      "get-user-log-count",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(countResponse.result).toEqual(Cl.uint(3));
  });

  it("should handle multiple users chatting independently", () => {
    const wallet2 = accounts.get("wallet_2")!;
    
    // User 1 has 2 conversations
    for (let i = 0; i < 2; i++) {
      const promptHash = new Uint8Array(32).fill(30 + i);
      const responseHash = new Uint8Array(32).fill(40 + i);
      
      const response = simnet.callPublicFn(
        "logger",
        "log-interaction", 
        [Cl.buffer(promptHash), Cl.buffer(responseHash)],
        wallet1
      );
      expect(response.result).toBeOk(Cl.uint(i));
    }

    // User 2 has 1 conversation (should start from ID 0)
    const promptHash = new Uint8Array(32).fill(50);
    const responseHash = new Uint8Array(32).fill(60);
    
    const user2Response = simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash), Cl.buffer(responseHash)],
      wallet2
    );
    expect(user2Response.result).toBeOk(Cl.uint(0));

    // Verify separate counts
    const user1Count = simnet.callReadOnlyFn(
      "logger",
      "get-user-log-count", 
      [Cl.principal(wallet1)],
      wallet1
    );
    const user2Count = simnet.callReadOnlyFn(
      "logger",
      "get-user-log-count",
      [Cl.principal(wallet2)], 
      wallet2
    );

    expect(user1Count.result).toEqual(Cl.uint(2));
    expect(user2Count.result).toEqual(Cl.uint(1));
  });

  it("should return none for non-existent conversation", () => {
    // Try to get a conversation that doesn't exist
    const getLogResponse = simnet.callReadOnlyFn(
      "logger",
      "get-log",
      [Cl.principal(wallet1), Cl.uint(999)],
      wallet1
    );

    expect(getLogResponse.result).toBeNone();
  });

  it("should record correct block timestamp", () => {
    const initialHeight = simnet.blockHeight;
    
    // Log a conversation
    const promptHash = new Uint8Array(32).fill(70);
    const responseHash = new Uint8Array(32).fill(80);
    
    const logResponse = simnet.callPublicFn(
      "logger",
      "log-interaction",
      [Cl.buffer(promptHash), Cl.buffer(responseHash)],
      wallet1
    );

    expect(logResponse.result).toBeOk(Cl.uint(0));

    // Retrieve and check timestamp
    const getLogResponse = simnet.callReadOnlyFn(
      "logger",
      "get-log",
      [Cl.principal(wallet1), Cl.uint(0)],
      wallet1
    );

    // Should record the block height when transaction was mined
    expect(getLogResponse.result).toBeSome(
      Cl.tuple({
        "prompt-hash": Cl.buffer(promptHash),
        "response-hash": Cl.buffer(responseHash), 
        "block-timestamp": Cl.uint(initialHeight + 1)
      })
    );
  });

  it("should simulate real conversation flow", () => {
    // Simulate: User asks about weather, then about code, then says goodbye
    const conversation = [
      { prompt: "What's the weather?", response: "I can't check weather" },
      { prompt: "Help me code", response: "Sure! What language?" },
      { prompt: "JavaScript please", response: "Here's a JS example..." },
      { prompt: "Thanks, goodbye!", response: "You're welcome! Bye!" }
    ];

    // Create simple hashes for each exchange (in real app, these would be SHA-256)
    const conversationHashes = conversation.map((_, i) => ({
      promptHash: new Uint8Array(32).fill(100 + i),
      responseHash: new Uint8Array(32).fill(200 + i)
    }));

    // Record initial block height before logging
    const initialHeight = simnet.blockHeight;

    // Log each conversation turn and store expected block heights
    const expectedBlockHeights: number[] = [];
    conversationHashes.forEach((hashes, i) => {
      const response = simnet.callPublicFn(
        "logger",
        "log-interaction",
        [Cl.buffer(hashes.promptHash), Cl.buffer(hashes.responseHash)],
        wallet1
      );
      expect(response.result).toBeOk(Cl.uint(i));
      expectedBlockHeights.push(simnet.blockHeight);
    });

    // Verify we can retrieve the full conversation history
    expect(simnet.callReadOnlyFn(
      "logger", 
      "get-user-log-count",
      [Cl.principal(wallet1)],
      wallet1
    ).result).toEqual(Cl.uint(4));

    // Spot check: verify 2nd conversation (index 1)  
    const secondConvo = simnet.callReadOnlyFn(
      "logger",
      "get-log", 
      [Cl.principal(wallet1), Cl.uint(1)],
      wallet1
    );

    expect(secondConvo.result).toBeSome(
      Cl.tuple({
        "prompt-hash": Cl.buffer(conversationHashes[1].promptHash),
        "response-hash": Cl.buffer(conversationHashes[1].responseHash),
        "block-timestamp": Cl.uint(expectedBlockHeights[1])
      })
    );
  });
});