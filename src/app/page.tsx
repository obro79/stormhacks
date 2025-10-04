"use client"
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Page = () => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = () => {
        console.log('Submitted prompt:', prompt);
        // Add your submit logic here
        setPrompt(''); // Clear input after submit
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && prompt.trim()) {
            handleSubmit();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Enter Your Prompt</h1>
                    <p className="text-sm text-slate-500">Type your prompt below and press enter</p>
                </div>

                <div className="space-y-4">
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your prompt here..."
                        className="w-full"
                    />

                    <Button
                        onClick={handleSubmit}
                        className="w-full"
                        disabled={!prompt.trim()}
                    >
                        Enter
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Page;