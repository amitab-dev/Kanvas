"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/components/session-provider"
import { initials } from "@/lib/initials"
import { LogOut } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function TopBar() {
    const { user, signOut } = useSession()
    const [signingOut, setSigningOut] = useState(false)

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
                <Link href="/dashboard" className="font-heading text-base font-medium">
                    Kanvas
                </Link>

                <Popover>
                    <PopoverTrigger
                        aria-label="Account menu"
                        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <Avatar>
                            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
                            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                        </Avatar>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="gap-3">
                        <PopoverHeader>
                            <PopoverTitle>{user.fullName}</PopoverTitle>
                            <p className="text-muted-foreground">{user.email}</p>
                        </PopoverHeader>
                        <Separator />
                        <Button
                            variant="ghost"
                            className="justify-start"
                            disabled={signingOut}
                            onClick={async () => {
                                setSigningOut(true)
                                await signOut()
                            }}
                        >
                            <LogOut />
                            {signingOut ? "Signing out..." : "Sign out"}
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    )
}
