"use client";

import React, { useState } from 'react';
import { Button, Input, List } from 'antd';

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
        <List
          dataSource={messages}
          renderItem={(item) => (
            <List.Item>
              {item.role === 'user' ? (
                <span className="text-blue-500">{item.content}</span>
              ) : (
                <span className="text-green-500">{item.content}</span>
              )}
            </List.Item>
          )}
        />
        <div className="mt-4">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onPressEnter={handleSubmit}
            placeholder="質問を入力してください"
          />
          <Button type="primary" onClick={handleSubmit} className="ml-2">
            送信
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
