Markdown Output said:

+++markdown

AI.veristacks: A Decentralized Gemini Chat Application

A modern, blockchain-powered chat application that integrates Google's Gemini AI with the Stacks blockchain for secure, verifiable conversations. The application allows users to chat with an AI, then immutably save a hash of their conversation to the Stacks blockchain, providing a permanent and verifiable record of the exchange.

🚀 Live Demo

You can try out the live application deployed on Vercel:

https://logging-chat-stacks.vercel.app/

✨ Features

AI Chat Interface: Powered by Google's Gemini AI for intelligent and responsive conversations.

Blockchain Integration: Save and verify chat exchanges on the Stacks blockchain using a Clarity smart contract.

Wallet Connection: Seamlessly connect with Stacks-compatible wallets like Leather, Hiro, and Xverse.

Multi-Chat Management: Create, switch between, rename, and delete multiple chat instances.

Secure & Private: Conversations are hashed before being stored on-chain, ensuring the content remains private while the record is verifiable.

Transaction Logs: View a history of your saved conversation hashes directly from the blockchain.

Responsive Design: A modern, mobile-friendly interface built with Next.js, shadcn/ui, and Tailwind CSS.

📸 Screenshots
Main Interface	Saving to Blockchain	Viewing On-Chain Logs

	
	
🛠️ Technology Stack

Frontend: React 18, Next.js 14, TypeScript

Styling: Tailwind CSS, shadcn/ui for component primitives

AI: Google Gemini AI (@google/generative-ai)

Blockchain: Stacks (@stacks/connect, @stacks/transactions)

Smart Contract Language: Clarity

Testing: Vitest, Clarinet SDK

⚙️ How It Works & Data Flow

The application provides a seamless flow from chatting with an AI to creating an immutable, verifiable record on the Stacks blockchain.

User Interaction: The user chats with the Gemini AI through the frontend interface.

Hashing: When a user decides to save an exchange, the frontend uses the Web Crypto API (crypto.subtle.digest) to generate a SHA-256 hash of both the user's prompt and the AI's response. This ensures the actual conversation content remains private.

Contract Call: The application calls the log-interaction public function of the logger.clar smart contract, passing the two generated hashes as arguments.

Transaction Signing: The user is prompted by their Stacks wallet (e.g., Leather) to sign and approve the transaction, which incurs a small network fee.

On-Chain Storage: The smart contract receives the hashes and stores them in a map data structure. It links the hashes to the user's Stacks principal (tx-sender) and a unique, auto-incrementing ID for that user. It also records the block-timestamp of the transaction.

Loading & Verification: To view logs or verify an exchange, the frontend uses read-only contract calls to get-user-log-count and get-log functions, fetching the stored hashes for the connected user's address.

📜 Smart Contract Details

The core blockchain logic is handled by the logger.clar smart contract.

user-log-count Map: A map that stores a uint counter for each user principal, tracking the total number of logs they have saved.

logs Map: The primary data storage. It maps a tuple containing a user principal and a log id to a tuple containing the prompt-hash, response-hash, and block-timestamp.

log-interaction Public Function: The main entry point for writing data. It takes a prompt-hash and a response-hash as buff 32 arguments. It retrieves the current user's log count, uses it as the new ID, and saves the log data. Finally, it increments the user's log count.

get-log Read-Only Function: Retrieves a specific log for a given user and id.

get-user-log-count Read-Only Function: Returns the total number of logs for a given user.

📁 Project Structure

The repository is structured as a monorepo containing the Clarity contract and the Next.js frontend.

chat-logger/
├── contracts/
│   └── logger.clar         # The Clarity smart contract for logging chats.
├── frontend/
│   ├── app/                # Next.js App Router.
│   │   └── page.tsx        # Main application page component.
│   ├── components/
│   │   ├── ui/             # Reusable UI components from shadcn/ui.
│   │   ├── chat-interface.tsx # Core component for chat and blockchain interaction.
│   │   └── chat-sidebar.tsx   # Sidebar for managing chat instances.
│   ├── hooks/
│   │   ├── use-gemini.ts   # Custom hook for interacting with the Gemini AI API.
│   │   └── use-stacks.ts   # Custom hook for all Stacks blockchain interactions.
│   └── ...
├── tests/
│   └── logger.test.ts      # Vitest unit tests for the smart contract.
├── Clarinet.toml           # Clarinet project configuration file.
└── package.json            # Dependencies and scripts for contract testing.

📦 Local Development Setup

Follow these steps to run the application locally.

1. Prerequisites

Node.js v18 or later.

NPM or another package manager.

A Stacks-compatible wallet extension in your browser (e.g., Leather
).

2. Clone the Repository
git clone https://github.com/yashb404/loggingchat-stacks.git
cd loggingchat-stacks

3. Set Up Environment Variables

Navigate to the frontend directory and create a .env.local file.

cd chat-logger/frontend
touch .env.local


Add the following environment variables to your .env.local file. You must add your own Gemini API key.

# Add your Gemini API key here
NEXT_PUBLIC_GEMINI_API_KEY=
# Stacks network configuration
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=STKNRFQ8SSPZE263K0R2N4HZG2G3JY4KZ03F4EPA
NEXT_PUBLIC_CONTRACT_NAME=logger

4. Install Dependencies & Run
# Navigate to the frontend directory
cd chat-logger/frontend

# Install frontend dependencies
npm install

# Run the development server
npm run dev


The application will be available at http://localhost:3000
.
+++
