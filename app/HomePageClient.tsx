"use client";

import React, { useMemo, useRef, useState } from 'react';
import type { ChatApiResponse, HarassmentAssessment } from '@/app/types';
import {
  chatUiText,
  riskBadgeStyles,
  riskLevelLabels,
  riskLevelStyles
} from '@/lib/chatUiText';
import type { AiModeDisplay } from '@/lib/appSettings';
import { harassmentCategoryLabels } from '@/lib/customerHarassment';

type InquiryHistoryItem = {
  id: string;
  created_at: string;
  question: string;
  answer: string;
  harassmentAssessment: HarassmentAssessment;
};

type HomePageClientProps = {
  aiMode: AiModeDisplay;
};

const modeBadgeStyles: Record<AiModeDisplay['tone'], string> = {
  local: 'bg-green-200 text-green-800',
  demo: 'bg-sky-100 text-sky-800'
};

const HomePageClient: React.FC<HomePageClientProps> = ({ aiMode }) => {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [inquiries, setInquiries] = useState<InquiryHistoryItem[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const isValidEmail = (value: string) => {
    if (value.trim() === '') {
      return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const submittedMessage = (inputValue || inputRef.current?.value || '').trim();
    const submittedUserName = userName.trim();
    const submittedEmail = email.trim();

    if (submittedMessage === '') return;

    if (!isValidEmail(submittedEmail)) {
      alert(chatUiText.emailValidationMessage);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: submittedUserName,
          email: submittedEmail,
          message: submittedMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`${chatUiText.requestErrorPrefix}: ${errorData.error || errorData.detail}`);
        return;
      }

      const data = (await response.json()) as ChatApiResponse;
      const newInquiry: InquiryHistoryItem = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        question: submittedMessage,
        answer: data.answer,
        harassmentAssessment: data.harassmentAssessment
      };

      setInquiries((prevInquiries) => [newInquiry, ...prevInquiries]);
      setSelectedInquiryId(newInquiry.id);
    } catch (error) {
      console.error(error);
      alert(chatUiText.requestFailedMessage);
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  const formatCreatedAt = (value: string) =>
    new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100">
      <header className="sticky top-0 z-10 mb-8 w-full max-w-md bg-white p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-gray-950">{chatUiText.headerTitle}</h1>
        <p className="text-gray-700">{chatUiText.headerDescription}</p>
        <div className="flex items-center space-x-4">
          <span
            title={aiMode.description}
            className={`rounded-full px-3 py-1 ${modeBadgeStyles[aiMode.tone]}`}
          >
            {aiMode.label}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="sticky top-4 z-20 space-y-6 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-gray-950">{chatUiText.inputTitle}</h2>
          <p className="text-black">{chatUiText.inputDescription}</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-black">
                <span className="font-bold">{chatUiText.userNameLabel}</span>
                <input
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder={chatUiText.userNamePlaceholder}
                  className="w-full rounded-lg border border-gray-700 p-3 text-black focus:text-black"
                />
              </label>
              <label className="block space-y-2 text-black">
                <span className="font-bold">{chatUiText.emailLabel}</span>
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={chatUiText.emailPlaceholder}
                  className="w-full rounded-lg border border-gray-700 p-3 text-black focus:text-black"
                />
              </label>
            </div>
            <label className="block space-y-2 text-black">
              <span className="font-bold">{chatUiText.messageLabel}</span>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder={chatUiText.inputPlaceholder}
                className="mr-2 w-full rounded-lg border border-gray-700 p-3 text-black focus:text-black"
              />
            </label>
            {aiMode.provider === 'demo' ? (
              <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-bold text-slate-800">{chatUiText.demoSamplesTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {chatUiText.demoSampleButtons.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => setInputValue(sample.text)}
                      className="rounded-full border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-500 p-3 text-white disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? chatUiText.sendingLabel : chatUiText.submitLabel}
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-6 rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-bold text-gray-950">{chatUiText.historyTitle}</h2>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              {inquiries.length > 0 ? (
                inquiries.map((inquiry) => {
                  const isSelected = inquiry.id === selectedInquiryId;

                  return (
                    <button
                      key={inquiry.id}
                      type="button"
                      onClick={() => setSelectedInquiryId(inquiry.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="mb-2 text-xs text-gray-600">
                        {formatCreatedAt(inquiry.created_at)}
                      </p>
                      <p className="mb-2 text-sm font-bold text-black">
                        {chatUiText.questionLabel}
                      </p>
                      <p className="line-clamp-3 text-sm leading-6 text-black">
                        {inquiry.question}
                      </p>
                      <p className="mt-2 text-xs text-gray-700">
                        {chatUiText.riskHistoryLabel}: {inquiry.harassmentAssessment.label}
                      </p>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-gray-700">{chatUiText.historyEmptyLabel}</p>
              )}
            </div>
          </aside>

          <section className="space-y-6 rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-gray-950">{chatUiText.answerCardTitle}</h2>
            {selectedInquiry ? (
              <>
                <div className="border-b border-gray-300 p-4">
                  <p className="mb-2 font-bold text-black">{chatUiText.questionLabel}:</p>
                  <p className="leading-7 text-black">{selectedInquiry.question}</p>
                </div>
                <div className="border-b border-gray-300 p-4">
                  <p className="mb-2 font-bold text-black">{chatUiText.aiAnswerLabel}:</p>
                  {selectedInquiry.answer ? (
                    <p className="leading-7 text-black">{selectedInquiry.answer}</p>
                  ) : (
                    <p>{chatUiText.emptyAnswerLabel}</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-black">{chatUiText.selectedInquiryEmptyLabel}</p>
            )}
          </section>

          <aside
            className={`space-y-5 rounded-xl border bg-white p-6 shadow ${
              selectedInquiry
                ? riskLevelStyles[selectedInquiry.harassmentAssessment.level]
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-950">{chatUiText.harassmentCardTitle}</h2>
              {selectedInquiry ? (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    riskBadgeStyles[selectedInquiry.harassmentAssessment.level]
                  }`}
                >
                  {riskLevelLabels[selectedInquiry.harassmentAssessment.level]}
                </span>
              ) : null}
            </div>
            {selectedInquiry ? (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 font-bold text-black">{chatUiText.assessmentLabel}:</p>
                    <p className="text-black">{selectedInquiry.harassmentAssessment.label}</p>
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-black">{chatUiText.riskLevelLabel}:</p>
                    <p className="text-black">
                      {riskLevelLabels[selectedInquiry.harassmentAssessment.level]}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-black">{chatUiText.harassmentTypeLabel}:</p>
                    <p className="text-black">
                      {selectedInquiry.harassmentAssessment.harassmentTypeLabel}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-bold text-black">{chatUiText.categoryLabel}:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInquiry.harassmentAssessment.categories.length > 0 ? (
                      selectedInquiry.harassmentAssessment.categories.map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-white px-3 py-1 text-sm text-gray-800 ring-1 ring-gray-200"
                        >
                          {harassmentCategoryLabels[category]}
                        </span>
                      ))
                    ) : (
                      <span className="text-black">{chatUiText.noCategoryLabel}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-bold text-black">{chatUiText.reasonsLabel}:</p>
                  <ul className="list-disc space-y-1 pl-5 text-black">
                    {selectedInquiry.harassmentAssessment.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-bold text-black">{chatUiText.recommendedActionLabel}:</p>
                  <p className="text-black">
                    {selectedInquiry.harassmentAssessment.recommendedAction}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-black">{chatUiText.emptyAnswerLabel}</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default HomePageClient;
