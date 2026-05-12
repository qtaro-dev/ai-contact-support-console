"use client";

import React, { useState } from 'react';

const HomePage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (inputValue.trim() === '') return;
    setMessages([...messages, { role: 'user', content: inputValue }]);
    setMessages(prevMessages => [...prevMessages, { role: 'ai', content: 'これは仮のAI回答です' }]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200 p-8">
      <header className="bg-white p-4 shadow-lg w-full max-w-md mb-16">
        <h1 className="text-3xl font-bold text-gray-900">AI問い合わせ対応支援ツール</h1>
      </header>
      <div className="flex flex-col items-center justify-center w-full max-w-4xl space-y-8">
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">問い合わせ入力</h2>
          <input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力してください"
            className="w-full p-3 border rounded-lg mr-2 text-gray-900 focus:text-gray-700"
          />
          <button onClick={handleSubmit} className="p-3 bg-blue-500 text-white rounded-lg">
            送信
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
      <div className="flex flex-col items-center justify-center w-full max-w-4xl space-y-8">
        <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-4">
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
            <p>よくある質問を確認できます。</p>
          </div>
          <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-2">
            <h2 className="text-xl font-bold mb-2 text-gray-900">カスハラ判定</h2>
            <p>問題の複雑さを判断できます。</p>
          </div>
          <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-md space-y-2">
            <h2 className="text-xl font-bold mb-2 text-gray-900">対応履歴保存</h2>
            <p>過去の対応履歴を保存できます。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
