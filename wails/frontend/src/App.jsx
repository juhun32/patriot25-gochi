import React, { useState, useEffect } from "react";
import { AddTask, CompleteTask, Mood } from "../wailsjs/go/main/App.js";
import { CirclePlus, Check } from "lucide-react";

import image1 from "./assets/images/1.png";
import image2 from "./assets/images/2.png";
import image3 from "./assets/images/3.png";

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [mood, setMood] = useState("neutral");
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isBig, setIsBig] = useState(window.innerHeight > 400);

    useEffect(() => {
        Mood().then(setMood).catch(console.error);
    }, []);

    useEffect(() => {
        const onResize = () => setIsBig(window.innerHeight > 400);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const addTask = async () => {
        if (inputValue.trim()) {
            try {
                await AddTask(inputValue);
                setTasks([...tasks, inputValue]);
                const newMood = await Mood();
                setMood(newMood);
                setInputValue("");
            } catch (error) {
                console.error("Error adding task:", error);
            }
        }
    };

    const completeTask = async (index) => {
        try {
            await CompleteTask(index);
            const newTasks = tasks.filter((_, i) => i !== index);
            setTasks(newTasks);
            const newMood = await Mood();
            setMood(newMood);
        } catch (error) {
            console.error("Error completing task:", error);
        }
    };

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: "user", text: chatInput.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setChatInput("");
        try {
            const resp = await fetch("http://127.0.0.1:8765/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userMessage: userMsg.text,
                    state: {
                        mood,
                        personality: "supportive",
                        completionRate: tasks.length ? 0.7 : 0.2,
                        totalInteractions: messages.length,
                    },
                }),
            });
            const data = await resp.json();
            setMood(data.newState.mood);
            setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
        } catch (err) {
            console.error("Chat error:", err);
        }
    };

    const getMoodEmoji = () => {
        if (mood.includes("neutral")) return <img src={image1} alt="neutral" />;
        if (mood.includes("sad")) return <img src={image2} alt="sad" />;
        if (mood.includes("golden")) return <img src={image3} alt="golden" />;
        return <img src={image1} alt="neutral" />;
    };

    if (isBig) {
        return (
            <div
                className="w-full h-full text-white flex flex-col"
                style={{ "--wails-draggable": "drag" }}
            >
                <main className="flex-1 overflow-y-auto m-2 p-2 space-y-2 bg-black/50 rounded-lg">
                    {messages.length === 0 && (
                        <p className="text-white/60 text-sm">
                            Tell Gochi about your day.
                        </p>
                    )}
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`max-w-[70%] rounded-lg px-4 py-1 text-sm ${
                                msg.role === "user"
                                    ? "ml-auto bg-transparent border border-white/30"
                                    : "mr-auto bg-white/10 border border-white/20"
                            }`}
                        >
                            {msg.text}
                        </div>
                    ))}
                </main>
                <footer className="p-2 border-t border-white/10 flex gap-2">
                    <input
                        className="flex-1 rounded-full px-4 py-1 text-white text-sm bg-transparent border border-white/30"
                        placeholder="Hi Gochi"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                    />
                    <button
                        className="px-4 py-1 rounded-full border border-white/30 text-sm font-semibold"
                        onClick={handleChatSend}
                    >
                        Send
                    </button>
                </footer>
            </div>
        );
    }

    return (
        <body
            id="pet"
            className="w-[350px] rounded-lg p-2 flex flex-col items-center justify-center"
            style={{ "--wails-draggable": "drag" }}
        >
            <div className="bg-black/30 rounded-lg p-2 flex flex-col items-center justify-center w-full">
                <div className="flex gap-2 relative z-10 w-full">
                    {/* <div className="flex items-center justify-center gap-2 border-2 rounded-full px-3 mx-auto w-fit">
                        <span className="text-sm font-normal pr-1">{mood}</span>
                    </div> */}

                    <input
                        type="text"
                        className="w-full flex-1 px-2 border border-white/30 rounded-md text-sm text-white bg-transparent"
                        placeholder="Add a new task..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTask()}
                    />
                    <button className="text-white" onClick={addTask}>
                        <CirclePlus strokeWidth={1.5} className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-[auto_1fr] items-center gap-2 w-full">
                    <div className="w-20 h-20">{getMoodEmoji()}</div>
                    {tasks.length === 0 ? (
                        <p className="text-center text-white/80 text-sm italic">
                            No tasks yet. Add one to get started.
                        </p>
                    ) : (
                        <ul className="space-y-2 w-full py-2">
                            {tasks.map((task, index) => (
                                <li
                                    key={index}
                                    className="flex items-center justify-between border border-white/50 rounded px-2"
                                >
                                    <button
                                        className="text-white"
                                        onClick={() => completeTask(index)}
                                        title="Mark as complete"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <span className="flex-1 text-sm text-white text-right">
                                        {task}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* <div className="text-center text-xs text-white/90 font-semibold py-1 rounded-md border border-white/20 relative z-10">
                    {tasks.length} {tasks.length === 1 ? "task" : "tasks"}{" "}
                    remaining
                </div> */}
            </div>
            <p className="text-xs text-white pt-1">
                *extend the window height to chat with Gochi
            </p>
        </body>
    );
}
