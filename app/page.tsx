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
        const errorData = await response.json();
        alert(`エラー: ${errorData.error || errorData.detail}`);
        return;
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
      <header className="bg-white p-4 shadow-lg w-full max-w-md mb-8 sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-gray-950">AI問い合わせ対応支援ツール</h1>
        <p className="text-gray-700">ローカルLLMを使った問い合わせ対応デモ</p>
        <div className="flex items-center space-x-4">
          <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full">Ollama接続 / ローカル実行</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4 text-gray-950">問い合わせ入力</h2>
          <p className="text-gray-700">質問や要件を入力して、ローカルLLMに回答案を作成させます。</p>
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
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4 text-gray-950">AI回答案</h2>
          {messages.length > 0 && messages[messages.length - 1].role === 'ai' ? (
            <>
              <div className="border-b border-gray-300 p-4">
                <p className="font-bold mb-2 text-gray-950">質問：</p>
                <p>{messages[messages.length - 1].content}</p>
              </div>
              <div className="border-b border-gray-300 p-4">
                <p className="font-bold mb-2 text-gray-950">AI回答：</p>
                {messages[messages.length - 1].content ? (
                  <p>{messages[messages.length - 1].content}</p>
                ) : (
                  <p>まだ回答はありません</p>
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4 text-gray-950">問い合わせ履歴</h2>
          {messages.map((message, index) => (
            <div key={index} className="border-b border-gray-300 p-4">
              <p className="font-bold mb-2 text-gray-950">{message.role === 'user' ? '質問' : 'AI回答'}：</p>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
