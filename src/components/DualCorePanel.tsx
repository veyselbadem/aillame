'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDualCore } from '../hooks/useDualCore';
import { FaPlay, FaStop, FaBrain, FaMicrochip } from 'react-icons/fa';

export default function DualCorePanel() {
    const { messages, isRunning, mode, activeTurn, start, stop, changeMode } = useDualCore();
    const [topic, setTopic] = useState('Yapay zeka etiği ve geleceği');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleStart = () => {
        if (topic.trim() === '') return;
        start(topic);
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header / Controls */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <FaBrain className="text-purple-400" />
                    Çift Çekirdek (Dual-Core) Yönetimi
                </h2>
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Tartışma Konusu / Hedef</label>
                        <input 
                            type="text" 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={isRunning}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                            placeholder="Örn: Rust bellek yönetimi nasıl çalışır?"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex bg-black/50 p-1 rounded-lg border border-white/10">
                            <button 
                                onClick={() => changeMode('freestyle')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'freestyle' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Serbest Mod
                            </button>
                            <button 
                                onClick={() => changeMode('restricted')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'restricted' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Kısıtlı / Odaklı
                            </button>
                        </div>
                        
                        <div>
                            {!isRunning ? (
                                <button 
                                    onClick={handleStart}
                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-6 py-2.5 rounded-lg font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105"
                                >
                                    <FaPlay /> Köprüyü Başlat
                                </button>
                            ) : (
                                <button 
                                    onClick={stop}
                                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all transform hover:scale-105"
                                >
                                    <FaStop /> Köprüyü Kapat
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversation Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-black/30 scroll-smooth"
            >
                {messages.length === 0 && !isRunning && (
                    <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4 opacity-50">
                        <FaMicrochip className="text-6xl" />
                        <p className="text-lg">Çekirdekler beklemede. Başlatmak için köprüyü aktif edin.</p>
                    </div>
                )}
                
                {messages.map((msg, i) => (
                    <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${msg.core === 'nano' ? 'self-start items-start' : 'self-end items-end ml-auto'}`}
                    >
                        <div className="flex items-center gap-2 mb-1 px-2">
                            {msg.core === 'nano' ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                    <span className="text-xs font-bold text-cyan-400 tracking-wider">AILLAME NANO</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs font-bold text-fuchsia-400 tracking-wider">AILLAME PRO (QWEN3-VL 8B)</span>
                                    <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse"></div>
                                </>
                            )}
                        </div>
                        <div 
                            className={`p-4 rounded-2xl shadow-lg leading-relaxed ${
                                msg.core === 'nano' 
                                    ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-50 rounded-tl-none' 
                                    : 'bg-fuchsia-950/40 border border-fuchsia-500/30 text-fuchsia-50 rounded-tr-none'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.text === '' && (
                                <span className="flex gap-1 items-center h-5">
                                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-200"></span>
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Active Status Bar */}
            {isRunning && (
                <div className="h-1 w-full bg-black">
                    <div className={`h-full transition-all duration-1000 ease-in-out ${activeTurn === 'nano' ? 'bg-cyan-500 w-1/2' : 'bg-fuchsia-500 w-1/2 ml-auto'}`}></div>
                </div>
            )}
        </div>
    );
}
