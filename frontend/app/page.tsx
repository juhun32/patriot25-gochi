"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { getCookie } from "@/utils/cookies";
import { backendBase, handleLogin } from "@/utils/util";

export default function Home() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const token = getCookie("ppet_token");
        if (!token) return;

        setIsLoggedIn(true);

        fetch(`${backendBase}/user`, {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch user data");
                return res.json();
            })
            .then((data) => {
                console.log("user payload:", data);
                setUserData(data);
            })
            .catch(console.error);
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            {isLoggedIn ? (
                userData ? (
                    <div>
                        <div className="flex items-center gap-8 text-xl">
                            <img
                                src={userData.picture}
                                alt="User"
                                className="rounded-full"
                            />
                            <div className="flex flex-col text-3xl font-light">
                                <p>{userData.name}</p>
                                <p>{userData.email}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <h1 className="mb-4 text-2xl">Loading user data...</h1>
                )
            ) : (
                <>
                    <h1 className="mb-4 text-2xl">
                        Gochi. Sign in with Google to continue.
                    </h1>
                    <Button onClick={handleLogin}>Sign in with Google</Button>
                </>
            )}
        </main>
    );
}
