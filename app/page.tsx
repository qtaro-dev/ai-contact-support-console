"use client";

import React, { useState } from 'react';

const HomePage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async () => {
    if (inputValue.trim() === '') return;
    setMessages([...messages, { role: 'user', content: inputValue }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: inputValue })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await response.json();
      setMessages(prevMessages => [...prevMessages, { role: 'ai', content: data.answer }]);
    } catch (error) {
      console.error(error);
      alert("ローカルLLMからの回答取得に失敗しました");
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
      <header className="bg-white p-4 shadow-lg w-full max-w-md mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI問い合わせ対応支援ツール</h1>
        <p className="text-gray-500">企業向けのAI問い合わせ対応支援ダッシュボード</p>
      </header>
      <div className="flex flex-col items-center justify-center w-full max-w-6xl py-12 space-y-8">
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">問い合わせ入力</h2>
          <input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力してください"
            className="w-full p-3 border rounded-lg mr-2 text-gray-900 focus:text-gray-700"
          />
          <button onClick={handleSubmit} disabled={loading} className="p-3 bg-blue-500 text-white rounded-lg">
            {loading ? '送信中...' : '送信'}
          </button>
        </div>
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">AI回答案</h2>
          <ul className="list-disc pl-5">
            {messages.map((message, index) => (
              <li key={index} className={message.role === 'user' ? 'text-gray-900' : 'text-green-500'}>
                {message.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900">問い合わせ履歴</h2>
        <ul className="list-disc pl-5">
          {messages.map((message, index) => (
            <li key={index} className={message.role === 'user' ? 'text-gray-900' : 'text-green-500'}>
              {message.content}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-center justify-center w-full max-w-md space-y-4">
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-2">
          <h2 className="text-xl font-bold mb-2 text-gray-900">FAQ参照</h2>
          <p className="text-gray-600">よくある質問を確認できます。</p>
        </div>
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-2">
          <h2 className="text-xl font-bold mb-2 text-gray-900">カスハラ判定</h2>
          <p className="text-gray-600">問題の複雑さを判断できます。</p>
        </div>
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-2">
          <h2 className="text-xl font-bold mb-2 text-gray-900">対応履歴保存</h2>
          <p className="text-gray-600">過去の対応履歴を保存できます。</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
