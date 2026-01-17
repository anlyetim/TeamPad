"use client"

import { AuthenticatedApp } from "@/components/authenticated-app"
import { LandingPage } from "@/components/landing-page"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebaseConfig"
import { onAuthStateChanged, User } from "firebase/auth"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#171717]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    )
  }

  if (user) {
    return <AuthenticatedApp />
  }

  return <LandingPage />
}