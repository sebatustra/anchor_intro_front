"use client"
import {
    ConnectionProvider,
    WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import React from "react";
require("@solana/wallet-adapter-react-ui/styles.css");

export default function AppWalletProvider({
    children
}: {
    children: React.ReactNode
}) {

    const endpoint = process.env.NEXT_PUBLIC_RPC_URL!;
    const wallets = [
        new SolflareWalletAdapter()
    ];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}
