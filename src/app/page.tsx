'use client';

import { useState, useEffect, useRef } from 'react';

type Turn = {
  id: string;
  role: 'you' | 'jobs';
  text: string;
  nextAction?: string;
  askBack?: string;
  tone?: 'sharp' | 'calm';
  pace?: 'fast' | 'normal';
  ts: number;
};

type State = 'idle' | 'thinking' | 'speaking';

export default function Home() {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<State>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [jobsSatisfaction, setJobsSatisfaction] = useState(0.5);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [typingText, setTypingText] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // placeholderExamplesを関数外で定数として定義
  const placeholderExamples = [
    "健康管理アプリのアイデアがあります。忙しいビジネスパーソンが簡単に...",
    "新しいSNSプラットフォームを考えています。既存のものとは違って...",
    "AIを使った学習支援ツールを開発したいのですが...", 
    "最近仕事でうまくいかないことが多くて、モチベーションが上がりません...",
    "起業したいけど、失敗するのが怖くて一歩踏み出せずにいます...",
    "チームをまとめるのが難しくて、リーダーシップに悩んでいます...",
    "地域の小さな店舗を支援するサービスのアイデアがあります...",
    "リモートワークをもっと効率化するツールについて相談したいです...",
    "環境問題を解決するアプリのコンセプトがあるのですが..."
  ];
  
  // クライアントサイドでのみplaceholderを設定（hydration mismatch回避）
  useEffect(() => {
    if (placeholderExamples.length > 0) {
      setCurrentPlaceholder(
        placeholderExamples[Math.floor(Math.random() * placeholderExamples.length)]
      );
    }
  }, []);

  // localStorage key for today's session
  const getSessionKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `jobs-session-${today}`;
  };

  // Load today's chat history
  useEffect(() => {
    try {
      const sessionKey = getSessionKey();
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        setTurns(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // Save chat history
  const saveTurns = (newTurns: Turn[]) => {
    try {
      const sessionKey = getSessionKey();
      localStorage.setItem(sessionKey, JSON.stringify(newTurns));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [turns, showTyping]);

  // タイピングアニメーション
  const typeMessage = (text: string, callback: () => void) => {
    setTypingText('');
    setShowTyping(true);
    let i = 0;
    const typingSpeed = 30;
    
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        setTypingText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setShowTyping(false);
        callback();
      }
    }, typingSpeed);
  };

  // 満足度に基づく感情更新
  const updateJobsEmotion = (satisfaction: number) => {
    if (satisfaction > 0.8) {
      setJobsSatisfaction(satisfaction);
      setCurrentEmotion('excited');
    } else if (satisfaction > 0.6) {
      setJobsSatisfaction(satisfaction);
      setCurrentEmotion('happy');
    } else if (satisfaction > 0.3) {
      setJobsSatisfaction(satisfaction);
      setCurrentEmotion('neutral');
    } else {
      setJobsSatisfaction(satisfaction);
      setCurrentEmotion('disappointed');
    }
  };

  const startConversation = () => {
    if (!input.trim()) return;
    
    const userMessage: Turn = { role: 'you', text: input, id: Date.now().toString(), ts: Date.now() };
    const initialMessages = [userMessage];
    setTurns(initialMessages);
    const initialInput = input;
    setInput('');
    setIsStarted(true);
    
    setTimeout(() => {
      setState('thinking');
      setIsLoading(true);
      setTimeout(async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: initialInput }),
          });

          const data = await response.json();
          
          // APIがJSONオブジェクトか文字列かをチェック
          let parsedData;
          if (typeof data.replyText === 'string' && data.replyText.trim().startsWith('{')) {
            // replyTextがJSON文字列の場合、パースする
            try {
              parsedData = JSON.parse(data.replyText);
            } catch {
              // パースに失敗した場合、そのまま使用
              parsedData = data;
            }
          } else {
            // 既にオブジェクト形式の場合
            parsedData = data;
          }

          const satisfaction = Math.random() * 0.4 + 0.6;
          updateJobsEmotion(satisfaction);
          
          setState('speaking');
          
          const replyText = parsedData.replyText || 'すまない、うまく答えられない。';
          
          // タイピングアニメーション後にメッセージを追加
          typeMessage(replyText, () => {
            const jobsMessage: Turn = {
              role: 'jobs',
              text: replyText,
              nextAction: parsedData.nextAction || '',
              askBack: parsedData.askBack || '',
              tone: parsedData.tone || 'calm',
              pace: parsedData.pace || 'normal',
              id: (Date.now() + 1).toString(),
              ts: Date.now()
            };

            const finalTurns = [...initialMessages, jobsMessage];
            setTurns(finalTurns);
            saveTurns(finalTurns);

            setState('idle');
            setIsLoading(false);
          });

        } catch (error) {
          console.error('Chat error:', error);
          setState('idle');
          setIsLoading(false);
        }
      }, 1500);
    }, 500);
  };

  const sendMessage = () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Turn = { role: 'you', text: input.trim(), id: Date.now().toString(), ts: Date.now() };
    const newMessages = [...turns, userMessage];
    setTurns(newMessages);
    saveTurns(newMessages);
    const currentInput = input;
    setInput('');
    
    setTimeout(() => {
      setState('thinking');
      setIsLoading(true);
      setTimeout(async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: currentInput }),
          });

          const data = await response.json();
          
          // APIがJSONオブジェクトか文字列かをチェック
          let parsedData;
          if (typeof data.replyText === 'string' && data.replyText.trim().startsWith('{')) {
            // replyTextがJSON文字列の場合、パースする
            try {
              parsedData = JSON.parse(data.replyText);
            } catch {
              // パースに失敗した場合、そのまま使用
              parsedData = data;
            }
          } else {
            // 既にオブジェクト形式の場合
            parsedData = data;
          }

          const satisfaction = Math.random() * 0.6 + 0.4;
          updateJobsEmotion(satisfaction);
          
          setState('speaking');
          
          const replyText = parsedData.replyText || 'すまない、うまく答えられない。';
          
          // タイピングアニメーション後にメッセージを追加
          typeMessage(replyText, () => {
            const jobsMessage: Turn = {
              role: 'jobs',
              text: replyText,
              nextAction: parsedData.nextAction || '',
              askBack: parsedData.askBack || '',
              tone: parsedData.tone || 'calm',
              pace: parsedData.pace || 'normal',
              id: (Date.now() + 1).toString(),
              ts: Date.now()
            };

            const finalTurns = [...newMessages, jobsMessage];
            setTurns(finalTurns);
            saveTurns(finalTurns);

            setState('idle');
            setIsLoading(false);
          });

        } catch (error) {
          console.error('Chat error:', error);
          setState('idle');
          setIsLoading(false);
        }
      }, 1200 + Math.random() * 800);
    }, 400);
  };

  const reset = () => {
    setTurns([]);
    setIsStarted(false);
    setInput('');
    setIsLoading(false);
    setState('idle');
    setJobsSatisfaction(0.5);
    setCurrentEmotion('neutral');
    setShowTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      isStarted ? sendMessage() : startConversation();
    }
  };

  return (
    <div 
      className="min-h-screen bg-black flex flex-col touch-manipulation relative overflow-hidden" 
      style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        minHeight: '100dvh'
      }}
    >
      
      {!isStarted ? (
        /* 初期画面 */
        <div className="flex-1 flex items-center justify-center p-5 bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="mb-8 animate-fade-in">
              <h1 className="text-5xl font-light text-white mb-4 tracking-tight animate-slide-down">
                Jobs Wall
              </h1>
              <p className="text-xl text-gray-300 mb-8 font-light animate-slide-up">
                スティーブ・ジョブズと対話
              </p>
              <div className="text-gray-400 mb-8 text-base leading-relaxed font-normal animate-fade-in-delay">
                企画、アイデア、課題、メンタルなど、何でも相談してください
              </div>
            </div>
            
            <div className="animate-scale-in">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentPlaceholder || "アイデアや相談したいことを入力してください..."}
                className="w-full h-40 p-6 bg-gray-800/30 border-2 border-gray-600/50 text-white rounded-3xl resize-none transition-all duration-500 hover:border-gray-500/70 focus:border-gray-400/70 focus:ring-4 focus:ring-gray-700/30 backdrop-blur-xl placeholder-gray-400/70 shadow-2xl"
                style={{ 
                  outline: 'none',
                  lineHeight: '1.6',
                  fontWeight: 400,
                  fontSize: '16px'
                }}
              />
            </div>
            
            <button
              onClick={startConversation}
              disabled={!input.trim()}
              className={`w-full h-16 rounded-3xl text-lg font-medium transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] ${
                !input.trim()
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-100 hover:shadow-2xl shadow-xl animate-glow'
              }`}
              style={{ minHeight: '64px', fontWeight: 500 }}
            >
              体験を始める
            </button>
          </div>
        </div>
      ) : (
        /* チャット画面（全画面） */
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800">
          
          {/* ヘッダーエリア */}
          <div className="bg-black/60 backdrop-blur-xl border-b border-gray-700/50 px-6 py-4 flex justify-between items-center">
            
            {/* 左側：満足度 */}
            <div className="animate-slide-in-left">
              <div className="flex items-center space-x-4">
                <div className="text-white">
                  <div className="text-sm opacity-80 mb-1">満足度</div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 h-2 bg-gray-600/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 rounded-full animate-pulse-slow"
                        style={{ width: `${jobsSatisfaction * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round(jobsSatisfaction * 100)}%</span>
                  </div>
                </div>
                <div className="text-white text-xs opacity-70">
                  {currentEmotion === 'excited' && '😄 興奮'}
                  {currentEmotion === 'happy' && '😊 満足'}
                  {currentEmotion === 'neutral' && '😐 中立'}
                  {currentEmotion === 'thinking' && '🤔 思考中'}
                  {currentEmotion === 'disappointed' && '😕 不満'}
                </div>
              </div>
            </div>

            {/* 右側：ステータス */}
            <div className="animate-slide-in-right">
              {state === 'thinking' && (
                <div className="bg-blue-500/90 backdrop-blur-xl rounded-2xl px-4 py-2 text-white shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm font-medium">思考中...</span>
                  </div>
                </div>
              )}

              {(state === 'speaking' || showTyping) && (
                <div className="bg-green-500/90 backdrop-blur-xl rounded-2xl px-4 py-2 text-white shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                      {showTyping ? 'タイピング中...' : '話しています'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* メッセージエリア（拡張） */}
          <div className="flex-1 bg-black/95 backdrop-blur-xl flex flex-col shadow-2xl">
            {/* メッセージリスト */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {turns.map((turn, index) => (
                <div
                  key={turn.id}
                  className={`flex ${turn.role === 'you' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`max-w-sm px-5 py-4 rounded-3xl text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    turn.role === 'you'
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-gray-800/90 text-white backdrop-blur-sm border border-gray-600/50 shadow-xl'
                  }`}>
                    <div className="font-medium text-xs mb-2 opacity-60">
                      {turn.role === 'you' ? 'あなた' : 'Steve Jobs'}
                    </div>
                    <div className="leading-relaxed">{turn.text}</div>
                    
                    {/* Jobs のメッセージに追加情報を表示 */}
                    {turn.role === 'jobs' && (
                      <>
                        {turn.nextAction && (
                          <div className="mt-3 pt-3 border-t border-gray-600/30">
                            <div className="text-xs font-medium mb-1 opacity-70">今すぐやること</div>
                            <div className="text-xs bg-blue-500/20 px-3 py-2 rounded-xl leading-relaxed">
                              {turn.nextAction}
                            </div>
                          </div>
                        )}
                        
                        {turn.askBack && (
                          <div className="mt-3 pt-3 border-t border-gray-600/30">
                            <div className="text-xs font-medium mb-1 opacity-70">質問</div>
                            <div className="text-xs bg-orange-500/20 px-3 py-2 rounded-xl leading-relaxed">
                              {turn.askBack}
                            </div>
                          </div>
                        )}
                        
                        {turn.tone && (
                          <div className="mt-2 flex space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              turn.tone === 'sharp' 
                                ? 'bg-red-500/20 text-red-300' 
                                : 'bg-green-500/20 text-green-300'
                            }`}>
                              {turn.tone === 'sharp' ? '🔥 鋭い' : '💚 穏やか'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              turn.pace === 'fast' 
                                ? 'bg-yellow-500/20 text-yellow-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {turn.pace === 'fast' ? '⚡ 高速' : '🐢 通常'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {/* タイピング中の表示 */}
              {showTyping && (
                <div className="flex justify-start animate-slide-up">
                  <div className="max-w-sm px-5 py-4 rounded-3xl bg-gray-800/90 text-white backdrop-blur-sm border border-gray-600/50 shadow-xl">
                    <div className="font-medium text-xs mb-2 opacity-60">Steve Jobs</div>
                    <div className="leading-relaxed">
                      {typingText}
                      <span className="animate-pulse">|</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                        ⌨️ タイピング中
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 思考中の表示 */}
              {isLoading && state === 'thinking' && !showTyping && (
                <div className="flex justify-start animate-slide-up">
                  <div className="bg-gray-800/90 px-5 py-4 rounded-3xl backdrop-blur-sm border border-gray-600/50 shadow-xl">
                    <div className="font-medium text-xs mb-2 opacity-60 text-white">Steve Jobs</div>
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                        🤔 思考中
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* 入力エリア */}
            <div className="bg-black/95 backdrop-blur-xl border-t border-gray-700/30 p-6">
              <div className="flex space-x-4">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="ジョブズに質問してください..."
                  className="flex-1 px-6 py-4 bg-gray-800/50 border border-gray-600/50 text-white rounded-2xl transition-all duration-300 hover:border-gray-500/70 focus:border-gray-400/70 focus:ring-4 focus:ring-gray-700/30 placeholder-gray-400/70 backdrop-blur-sm shadow-lg"
                  style={{ 
                    outline: 'none',
                    fontWeight: 400,
                    fontSize: '16px',
                    minHeight: '56px'
                  }}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`px-8 py-4 rounded-2xl text-base font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                    !input.trim() || isLoading
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-gray-100 hover:shadow-xl'
                  }`}
                  style={{ minHeight: '56px', minWidth: '80px', fontWeight: 500 }}
                >
                  送信
                </button>
              </div>
              
              {/* リセットボタン */}
              <div className="mt-4 text-center">
                <button
                  onClick={reset}
                  className="text-gray-400 hover:text-white transition-all duration-300 text-sm px-6 py-2 rounded-lg hover:bg-gray-800/30"
                >
                  新しい対話
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS アニメーション */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fade-in-delay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 1.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.8s ease-out;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}