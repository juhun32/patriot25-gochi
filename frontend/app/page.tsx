"use client";

import { Button } from "@/components/ui/button";

export default function Home() {
    const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

    const handleLogin = () => {
        window.location.href = `${backendBase}/auth/google/login`;
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="mb-4 text-2xl">
                Gochi. Sign in with Google to continue.
            </h1>
            <Button onClick={handleLogin}>Sign in with Google</Button>
        </main>
    );
}
