"use client"

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return false
        const stored = window.localStorage.getItem('discussion-theme')
        if (stored) return stored === 'dark'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark)
    }, [isDark])

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        document.documentElement.classList.toggle('dark', next)
        window.localStorage.setItem('discussion-theme', next ? 'dark' : 'light')
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            className="rounded-xl"
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
    )
}
