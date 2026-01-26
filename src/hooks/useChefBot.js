import { useState, useRef, useEffect } from 'react';

// Default model from original code
const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

export function useChefBot() {
  const [engine, setEngine] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('chef.chat');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save chat history
  useEffect(() => {
    localStorage.setItem('chef.chat', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const loadModel = async () => {
    if (isReady || isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported. Please use a compatible browser.');
      }

      // Dynamic import to avoid SSR/build issues if any
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      const newEngine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (p) => {
          let percent = 0;
          if (p && typeof p === 'object' && 'progress' in p) percent = Math.floor(p.progress * 100);
          else if (typeof p === 'number') percent = Math.floor(p * 100);
          setProgress(percent);
        },
      });

      setEngine(newEngine);
      setIsReady(true);
    } catch (err) {
      console.error('AI Load Error:', err);
      setError(err.message || 'Failed to load AI model');
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = async (userMessage, systemPrompt) => {
    if (!engine || !isReady) return;

    // Add user message immediately
    const newHistory = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(newHistory);

    try {
      // Keep context window small for speed (last 5 messages)
      const contextMessages = newHistory.slice(-5);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages
      ];

      const stream = await engine.chat.completions.create({ messages, stream: true });
      
      let aiResponse = "";
      // Add placeholder for AI response
      setChatHistory(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        const token = chunk?.choices?.[0]?.delta?.content || '';
        aiResponse += token;
        
        // Update the last message (AI's response) in real-time
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: aiResponse };
          return updated;
        });
      }
    } catch (err) {
      console.error('Generation Error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error generating a response.' }]);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  return {
    isReady,
    isLoading,
    progress,
    error,
    chatHistory,
    loadModel,
    generateResponse,
    clearChat
  };
}
