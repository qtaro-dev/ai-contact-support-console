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
    setInputValue('');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">AI問い合わせ対応支援ツール</h1>
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg">
        <ul className="list-disc pl-5">
          {messages.map((message, index) => (
            <li key={index} className={message.role === 'user' ? 'text-blue-500' : 'text-green-500'}>
              {message.content}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <input
            value={inputValue}
            onChange={handleInputChange}
            onPressEnter={handleSubmit}
            placeholder="質問を入力してください"
            className="w-full p-2 border rounded-lg mr-2"
          />
          <button onClick={handleSubmit} className="p-2 bg-blue-500 text-white rounded-lg">
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
