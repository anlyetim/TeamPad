"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, MousePointer2, Component, Github, HelpCircle, MessageSquare, Phone, Code2, Infinity } from "lucide-react"
import { auth } from "@/lib/firebaseConfig"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function LandingPage() {
    const { theme, setTheme } = useTheme()
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
        } catch (error: any) {
            console.error("Login failed", error)
            if (error.code === 'auth/unauthorized-domain') {
                alert("Domain not authorized in Firebase. Please add 'localhost' (or your current domain) to Authorized Domains in the Firebase Console -> Authentication -> Settings.")
            } else {
                alert(`Login failed: ${error.message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#171717] text-neutral-900 dark:text-neutral-50 transition-colors duration-300 font-sans selection:bg-blue-500/30">

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-neutral-50/80 dark:bg-[#171717]/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tight">Haloboard</div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <Sun className="h-5 w-5 block dark:hidden" />
                            <Moon className="h-5 w-5 hidden dark:block" />
                        </button>
                        <Button onClick={handleLogin} disabled={loading} className="rounded-full px-6 font-medium">
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                        Collaboration, <br /> Reimagined.
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Infinite canvas, real-time collaboration, and open-source freedom.
                        Build, brainstorm, and bring ideas to life together.
                    </p>
                    <Button size="lg" onClick={handleLogin} className="rounded-full px-8 text-base h-12">
                        Explore the Canvas
                    </Button>
                </div>

                {/* Feature Image Placeholder - Using a CSS pattern for now as per instructions to not use placeholders if possible but I don't have the exact asset. 
            I will create a visually pleasing abstract canvas representation. */}
                <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] aspect-[16/9] relative group">
                    {/* Mock UI */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
                        <div className="w-48 h-32 bg-yellow-200/80 rounded shadow-lg transform -rotate-6 animate-in hover:scale-110 transition-transform duration-500 flex items-center justify-center text-yellow-800 font-handwriting">Brainstorming</div>
                        <div className="w-48 h-32 bg-blue-200/80 rounded shadow-lg transform rotate-3 animate-in hover:scale-110 transition-transform duration-500 delay-75 flex items-center justify-center text-blue-800 font-handwriting">Planning</div>
                        <div className="w-48 h-32 bg-red-200/80 rounded shadow-lg transform -rotate-2 translate-y-8 animate-in hover:scale-110 transition-transform duration-500 delay-150 flex items-center justify-center text-red-800 font-handwriting">Design</div>
                    </div>

                    {/* Mock Cursors */}
                    <div className="absolute top-1/3 left-1/3 text-blue-500 animate-bounce delay-700 duration-1000">
                        <MousePointer2 className="fill-blue-500 h-6 w-6" />
                        <span className="bg-blue-500 text-white text-[10px] px-1 rounded ml-2">Alice</span>
                    </div>
                    <div className="absolute bottom-1/3 right-1/4 text-green-500 animate-bounce delay-300 duration-1000">
                        <MousePointer2 className="fill-green-500 h-6 w-6" />
                        <span className="bg-green-500 text-white text-[10px] px-1 rounded ml-2">Bob</span>
                    </div>
                </div>
            </section>

            {/* Beyond the Board Section */}
            <section className="py-24 bg-neutral-100/50 dark:bg-neutral-900/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Beyond the Board.</h2>
                        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                            Powerful features designed to help your team move faster and stay aligned.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Infinity className="h-8 w-8" />}
                            title="Limitless Canvas"
                            description="An infinite workspace that grows with your ideas. Never run out of space again."
                        />
                        <FeatureCard
                            icon={<MousePointer2 className="h-8 w-8" />}
                            title="Multi-User Cursor"
                            description="See exactly what your team is looking at in real-time with collaborative cursors."
                        />
                        <FeatureCard
                            icon={<Github className="h-8 w-8" />}
                            title="Open-Source"
                            description="Built for the community, by the community. Extensible, transparent, and free forever."
                        />
                    </div>
                </div>
            </section>

            {/* Support Section */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">We're Here to Help.</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <SupportCard
                            icon={<HelpCircle className="h-6 w-6" />}
                            title="Help Center"
                            description="Learn more about various features."
                            action="Learn More"
                        />
                        <SupportCard
                            icon={<MessageSquare className="h-6 w-6" />}
                            title="Community Forum"
                            description="Connect with other users and share ideas."
                            action="Join Discussion"
                        />
                        <SupportCard
                            icon={<Phone className="h-6 w-6" />}
                            title="Contact Us"
                            description="Reach out to our support team directly."
                            action="Get Support"
                        />
                    </div>
                </div>
            </section>

            {/* Development Section */}
            <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-900 opacity-50"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Builders.</h2>
                        <p className="text-neutral-400 max-w-2xl mx-auto">Explore our open-source code and tech stack.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="bg-[#1E1E1E] rounded-xl p-6 shadow-2xl border border-neutral-800 font-mono text-sm overflow-hidden">
                            <div className="flex gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="text-neutral-300">
                                <p><span className="text-purple-400">export</span> <span className="text-blue-400">const</span> <span className="text-yellow-400">Stack</span> = <span className="text-blue-400">{"{"}</span></p>
                                <p className="pl-4">frontend: <span className="text-green-400">['Next.js', 'React', 'TailwindCSS']</span>,</p>
                                <p className="pl-4">backend: <span className="text-green-400">['Firebase', 'Node.js']</span>,</p>
                                <p className="pl-4">state: <span className="text-green-400">['Zustand']</span>,</p>
                                <p className="pl-4">ui: <span className="text-green-400">['Radix UI', 'Lucide']</span>,</p>
                                <p className="pl-4">license: <span className="text-green-400">'MIT'</span>,</p>
                                <p><span className="text-blue-400">{"}"}</span></p>
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-4 mb-8">
                                {['React', 'Next.js', 'TypeScript', 'Firebase', 'TailwindCSS', 'Zustand'].map((tech) => (
                                    <div key={tech} className="bg-neutral-800 px-4 py-2 rounded-full border border-neutral-700 text-sm font-medium hover:bg-neutral-700 transition-colors cursor-default">
                                        {tech}
                                    </div>
                                ))}
                            </div>
                            <p className="text-neutral-400 mb-8 leading-relaxed">
                                Our architecture is designed for performance and scalability.
                                Leveraging the power of Next.js 14 and Firebase, we ensure real-time synchronization
                                and a seamless user experience across all devices.
                            </p>
                            <Button variant="outline" className="border-neutral-700 hover:bg-neutral-800 bg-transparent text-white rounded-full">
                                <Github className="mr-2 h-4 w-4" /> View on GitHub
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-neutral-200 dark:border-neutral-800 text-center text-sm text-neutral-500 dark:text-neutral-500">
                <p>© {new Date().getFullYear()} Haloboard. Open Source.</p>
            </footer>
        </div >
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-white dark:hover:bg-neutral-800 transition-all duration-300 hover:shadow-lg">
            <div className="mb-4 p-4 bg-neutral-200 dark:bg-neutral-800 rounded-full text-neutral-900 dark:text-white">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm">
                {description}
            </p>
        </div>
    )
}

function SupportCard({ icon, title, description, action }: { icon: React.ReactNode, title: string, description: string, action: string }) {
    return (
        <div className="p-8 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                {icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">{description}</p>
            <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">
                {action} &rarr;
            </Button>
        </div>
    )
}
