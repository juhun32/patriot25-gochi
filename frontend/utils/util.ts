export const backendBase =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export const handleLogin = () => {
    window.location.href = `${backendBase}/auth/google/login`;
};
