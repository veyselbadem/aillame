import { useState, useEffect, useRef } from 'react';
import { DualCoreOrchestrator, DualCoreMode, ActiveCore } from '../core/orchestrator/dual-core';
import { AillameLocalProvider } from '../providers/llm/aillame-provider';
import { ProLocalProvider } from '../providers/llm/pro-provider';

export interface DialogueMessage {
    id: string;
    core: ActiveCore;
    text: string;
}

export function useDualCore() {
    const orchestratorRef = useRef<DualCoreOrchestrator | null>(null);
    const [messages, setMessages] = useState<DialogueMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<DualCoreMode>('freestyle');
    const [activeTurn, setActiveTurn] = useState<ActiveCore | null>(null);

    useEffect(() => {
        const nano = new AillameLocalProvider();
        const pro = new ProLocalProvider();
        const orchestrator = new DualCoreOrchestrator(nano, pro);
        orchestratorRef.current = orchestrator;

        orchestrator.on('started', () => {
            setIsRunning(true);
            setMessages([]);
        });

        orchestrator.on('stopped', () => {
            setIsRunning(false);
            setActiveTurn(null);
        });

        orchestrator.on('modeChanged', (newMode: DualCoreMode) => {
            setMode(newMode);
        });

        orchestrator.on('turnStart', (turn: ActiveCore) => {
            setActiveTurn(turn);
            setMessages(prev => [...prev, { id: Date.now().toString(), core: turn, text: '' }]);
        });

        orchestrator.on('token', ({ core, token }) => {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].core === core) {
                    newMessages[lastIdx].text += token;
                }
                return newMessages;
            });
        });

        return () => {
            orchestrator.stopDialogue();
        };
    }, []);

    const start = (topic: string) => {
        if (!orchestratorRef.current) return;
        orchestratorRef.current.startDialogue(topic);
    };

    const stop = () => {
        if (!orchestratorRef.current) return;
        orchestratorRef.current.stopDialogue();
    };

    const changeMode = (newMode: DualCoreMode) => {
        if (!orchestratorRef.current) return;
        orchestratorRef.current.setMode(newMode);
    };

    return {
        messages,
        isRunning,
        mode,
        activeTurn,
        start,
        stop,
        changeMode
    };
}
