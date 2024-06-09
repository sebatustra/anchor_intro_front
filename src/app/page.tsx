"use client"
import dynamic from 'next/dynamic';
import * as anchor from "@coral-xyz/anchor";
import { useEffect, useState } from 'react';
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import idl from "../../idl.json"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import * as token from "@solana/spl-token";
import { set } from '@coral-xyz/anchor/dist/cjs/utils/features';

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const PROGRAM_ID = new anchor.web3.PublicKey("8hkDLDXHJpXwEufzpUtWp5WhgVBvfoywcXApnpDXTEk2");

interface IntroAccount {
    publicKey: anchor.web3.PublicKey,
    account: {
        initializer: anchor.web3.PublicKey,
        name: string,
        message: string
    }
}

export default function Home() {
    const [program, setProgram] = useState<anchor.Program<anchor.Idl>>() 

    const { connection } = useConnection()
    const wallet = useAnchorWallet();

    const [isMintInitialized, setIsMintInitialized] = useState(false)
    const [tokenSupply, setTokenSupply] = useState<number>(0)

    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentMessage, setNewStudentMessage] = useState("");
    const [studentIntros, setStudentIntros] = useState<IntroAccount[]>([])
    const [updatedMessage, setUpdatedMessage] = useState("")

    useEffect(() => {
        if (wallet) {
            let provider: anchor.Provider;
    
            try {
                provider = anchor.getProvider()
            } catch {
                provider = new anchor.AnchorProvider(
                    connection,
                    wallet,
                    anchor.AnchorProvider.defaultOptions()
                )
            }

            const programToSet = new anchor.Program(idl as anchor.Idl, provider)
            setProgram(programToSet)
        }
    }, [wallet]);

    useEffect(() => {
        fetchIntros()
        fetchMint()
    }, [program]);

    const initializeMint = async () => {
        if (program && wallet) {
            try {
                const tx = await program.methods
                    .initializeMint()
                    .rpc()
    
                console.log("initialized mint. tx: ", tx)
            } catch(e) {
                console.error(e)
            }
        }
    }

    const createIntro = async () => {
        if (program && wallet) {
            try {

                const [mintAddress] = anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        Buffer.from("mint")
                    ],
                    PROGRAM_ID
                );
                const tokenAccount = await token.getAssociatedTokenAddress(
                    mintAddress,
                    wallet.publicKey,
                );

                const [reviewPDA] = anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        Buffer.from(newStudentName),
                        wallet.publicKey.toBuffer()
                    ],
                    PROGRAM_ID
                );

                await program.methods
                    .addStudentIntro(
                        newStudentName,
                        newStudentMessage
                    )
                    .accounts({
                        intro: reviewPDA,
                        tokenAccount: tokenAccount
                    })
                    .rpc()

                fetchIntros()
                fetchMint()
                setNewStudentMessage("")
                setNewStudentName("")                    

            } catch(e) {
                console.error(e)
            } 
        }
    }

    const fetchIntros = async () => {
        if (program) {
            try {
                const intros = await (program.account as any).introState.all();
                let accounts: IntroAccount[] = intros.map((data: any) => {
                    return {
                        publicKey: data.publicKey,
                        account: {
                            initializer: new anchor.web3.PublicKey(data.account.initializer),
                            message: data.account.message,
                            name: data.account.name
                        }
                    }
                })
                setStudentIntros(accounts)
            } catch(e) {
                console.error(e)
            }
        }
    }

    const fetchMint = async () => {
        const [mintAddress] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("mint")
            ],
            PROGRAM_ID
        );
        const mint = await token.getMint(
            connection,
            mintAddress
        );

        setIsMintInitialized(mint.isInitialized)
        setTokenSupply(Number(mint.supply))
    }

    const updateIntro = async (intro: IntroAccount) => {
        try {
            if (program) {
                await program.methods.updateStudentIntro(
                    intro.account.name,
                    updatedMessage
                )
                .accounts({
                    intro: intro.publicKey
                })
                .rpc()

                fetchIntros()
            }
        } catch(e) {
            console.error(e)
        }
    }

    const closeIntro = (intro: IntroAccount) => {
        const execute = async () => {
            try {
                if (program) {
                    await program.methods
                        .closeStudentIntro(
                            intro.account.name
                        )
                        .accounts({
                            intro: intro.publicKey
                        })
                        .rpc()

                    fetchIntros()
                }
            } catch(e) {
                console.error(e)
            }
        }

        execute()
    }


    return (
        <main className="flex flex-col items-center p-10 min-h-screen gap-y-3">
            <div className="fixed top-0 right-0 p-4">
                <WalletMultiButtonDynamic />
            </div>
            <Card className='w-[500px]'>
                <CardHeader>
                    <CardTitle>
                        {isMintInitialized ? "Mint Supply:" : "Initialize Mint"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isMintInitialized ? (
                        <p><strong>{tokenSupply}</strong></p>
                    ) : (
                        <Button className='w-full' onClick={() => initializeMint()}>
                            Initialize
                        </Button>
                    )}
                </CardContent>
            </Card>
            <Card className='w-[500px]'>
                <CardHeader>
                    <CardTitle>
                        New Student Intro
                    </CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-y-8'>
                    <Input 
                        className="w-full"
                        placeholder="Student Name"
                        onChange={(event) => setNewStudentName(event.target.value)}
                        value={newStudentName}
                    >
                    </Input>
                    <Input 
                        className="w-full"
                        placeholder="Student Message"
                        onChange={(event) => setNewStudentMessage(event.target.value)}
                        value={newStudentMessage}
                    >
                    </Input>
                </CardContent>
                <CardFooter>
                    <Button 
                        className='w-full'
                        onClick={() => createIntro()}
                    >
                        Create
                    </Button>
                </CardFooter>
            </Card>
            <Card className='w-[600px]'>
                <CardHeader className='flex flex-col w-full items-center'>
                    <CardTitle className='mb-2'>
                        List of Student Intros
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-y-2">
                    {studentIntros.map(intro => (
                        <Card>
                            <CardContent className='flex flex-col w-full gap-y-1 p-2'>
                                <p>Initializer: {intro.account.initializer.toString()}</p>
                                <p>Student name: {intro.account.name}</p>
                                <p>Student message: {intro.account.message}</p>
                                <div className='flex flex-row gap-x-2'>
                                    <Popover>
                                        <PopoverTrigger>
                                                Update
                                        </PopoverTrigger>
                                        <PopoverContent className='flex flex-col gap-y-1'>
                                            New message:
                                            <Input
                                                value={updatedMessage}
                                                onChange={(event) => setUpdatedMessage(event.target.value)}
                                            />
                                            <Button
                                                onClick={() => updateIntro(intro)}
                                            >
                                                Submit
                                            </Button>
                                        </PopoverContent>
                                    </Popover>
                                    <Button
                                        onClick={() => closeIntro(intro)}
                                    >
                                        Close 
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </main>
    );
}
