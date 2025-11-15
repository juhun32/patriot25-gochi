import React, { useState, useEffect, useMemo } from "react";
import {
    AddTask,
    CompleteTask,
    Mood,
    GetPetState,
    FeedPet,
    GiveTreat,
    PutPetToSleep,
} from "../wailsjs/go/main/App.js";
import { CirclePlus, Check, ArrowUp } from "lucide-react";

import image1 from "./assets/images/1.png";
import image2 from "./assets/images/2.png";
import image3 from "./assets/images/3.png";

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [mood, setMood] = useState("neutral");
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [petState, setPetState] = useState({
        hunger: 0,
        energy: 0,
        affection: 0,
    });
    const [activeTab, setActiveTab] = useState("care");

    const derivedEnergy = useMemo(() => {
        const penalty = Math.min(80, tasks.length * 12);
        return Math.max(0, petState.energy - penalty);
    }, [petState.energy, tasks.length]);

    const refreshPetState = async () => {
        try {
            const state = await GetPetState();
            setPetState({
                hunger: state.hunger,
                energy: state.energy,
                affection: state.affection,
            });
        } catch (err) {
            console.error("Failed to load pet state:", err);
        }
    };

    useEffect(() => {
        Mood().then(setMood).catch(console.error);
        refreshPetState();

        // poll pet state every 5 seconds
        const interval = setInterval(() => {
            refreshPetState();
            Mood().then(setMood).catch(console.error);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const addTask = async () => {
        if (inputValue.trim()) {
            try {
                await AddTask(inputValue);
                setTasks((prev) => [...prev, inputValue]);
                await refreshPetState();
                setInputValue("");
            } catch (error) {
                console.error("Error adding task:", error);
            }
        }
    };

    const completeTask = async (index) => {
        try {
            await CompleteTask(index);
            setTasks((prev) => prev.filter((_, i) => i !== index));
            await refreshPetState();
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

    const StatBar = ({ label, value, color }) => (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-white/70">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                <div
                    className={`h-full rounded-full inset-shadow-sm ${color}`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );

    const careButtons = (
        <div className="flex w-full gap-2 text-xs">
            <button
                onClick={async () => {
                    await FeedPet();
                    await refreshPetState();
                }}
                className="flex-1 rounded-md bg-black/20 inset-shadow-sm"
            >
                Feed
            </button>
            <button
                onClick={async () => {
                    await GiveTreat();
                    await refreshPetState();
                }}
                className="flex-1 rounded-md bg-black/20 inset-shadow-sm"
            >
                Treat
            </button>
            <button
                onClick={async () => {
                    await PutPetToSleep();
                    await refreshPetState();
                }}
                className="flex-1 rounded-md bg-black/20 inset-shadow-sm"
            >
                Nap
            </button>
        </div>
    );

    const statsPanel = (
        <div className="w-full rounded-lg border border-white/20 bg-black/20 p-2 text-white">
            <div className="w-full grid grid-cols-3 gap-2">
                <StatBar
                    label="Hunger"
                    value={petState.hunger}
                    color="bg-pink-400"
                />
                <StatBar
                    label="Energy"
                    value={derivedEnergy}
                    color="bg-amber-300"
                />
                <StatBar
                    label="Affection"
                    value={petState.affection}
                    color="bg-sky-300"
                />
            </div>
            <p className="text-[11px] text-white/70 py-1">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"} left -
                fewer todos keep energy high.
            </p>
            {careButtons}
        </div>
    );

    const tabs = [
        { id: "care", label: "Pet Care" },
        { id: "tasks", label: "To-Dos" },
        { id: "chat", label: "Chat" },
    ];
    const TabNav = (
        <div className="grid grid-cols-3 gap-1 text-xs text-white">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-md py-1 ${
                        activeTab === tab.id
                            ? "bg-white/40 text-black"
                            : "bg-white/10"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
    const CarePanel = (
        <div className="space-y-2 border border-white/20 rounded-lg">
            <div className="w-20 h-20 mx-auto">{getMoodEmoji()}</div>
            {statsPanel}
        </div>
    );
    const TasksPanel = (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    className="flex-1 px-2 py-0.5 rounded-md text-xs text-white bg-black/20 inset-shadow-sm rounded-lg"
                    placeholder="Add a new task..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
                <button
                    className="text-white bg-black/20 rounded-full"
                    onClick={addTask}
                >
                    <CirclePlus strokeWidth={1.5} className="w-5 h-5" />
                </button>
            </div>
            <div className="space-y-1 h-full overflow-y-auto">
                {tasks.length === 0 ? (
                    <p className="text-white/70 text-xs italic">
                        No tasks yet. Add one to get started.
                    </p>
                ) : (
                    tasks.slice(0, 6).map((task, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between inset-shadow-sm bg-black/20 rounded px-2 py-0.5 text-xs text-white rounded-lg"
                        >
                            <span className="flex-1 text-left">{task}</span>
                            <button onClick={() => completeTask(index)}>
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
    const ChatPanel = (
        <div className="flex flex-col h-full justify-between">
            <div className="flex-1 space-y-2 overflow-y-auto mb-[60px]">
                {messages.length === 0 && (
                    <p className="text-white/60 text-sm">
                        Tell Gochi about your day.
                    </p>
                )}
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`w-fit max-w-[80%] text-sm mb-2 ${
                            msg.role === "user"
                                ? "ml-auto bg-transparent border border-white/30 rounded-lg px-2 py-0.5"
                                : "mr-auto"
                        }`}
                    >
                        {msg.role === "user" ? (
                            msg.text
                        ) : (
                            <div className="flex items-start gap-2">
                                <div className="">{getMoodEmoji()}</div>
                                <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                                    {msg.text}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="absolute bottom-0 left-0 w-full bg-black/30 p-1">
                <div className="flex gap-2">
                    <textarea
                        className="flex-1 rounded-lg px-2 py-0.5 text-white text-sm bg-black/20 inset-shadow-sm"
                        placeholder="Hi Gochi"
                        value={chatInput}
                        rows={1}
                        onChange={(e) => setChatInput(e.target.value)}
                        onInput={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleChatSend();
                            }
                        }}
                    />
                    <button
                        className="p-1 rounded-full text-sm bg-black/20 inset-shadow-sm text-white border border-white/30"
                        onClick={handleChatSend}
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
    return (
        <div
            id="pet"
            className="w-[350px] h-[225px] rounded-lg p-2 bg-black/40 text-white space-y-2"
            style={{ "--wails-draggable": "drag" }}
        >
            {TabNav}
            <div className="rounded-lg overflow-hidden h-full">
                {activeTab === "care" && CarePanel}
                {activeTab === "tasks" && TasksPanel}
                {activeTab === "chat" && ChatPanel}
            </div>
        </div>
    );
}
