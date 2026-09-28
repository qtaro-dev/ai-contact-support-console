import Link from 'next/link';
import {
  adminUiText,
  inquiryStatusLabels,
  riskBadgeStyles,
  riskLevelLabels
} from '@/lib/chatUiText';
import { harassmentTypeLabels } from '@/lib/customerHarassment';
import { mockInquiryRecords } from '@/app/admin/mockData';

export const dynamic = 'force-dynamic';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

const truncateText = (value: string | null, maxLength: number) => {
  if (!value) {
    return adminUiText.noAnswerLabel;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
};

const AdminPage = async () => {
  const inquiries = mockInquiryRecords;

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-950">{adminUiText.title}</h1>
              <p className="mt-2 text-gray-700">{adminUiText.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="rounded-lg bg-blue-500 p-3 text-white">
                {adminUiText.settingsLinkLabel}
              </Link>
              <form action="/api/admin-logout" method="post">
                <button type="submit" className="rounded-lg bg-slate-700 p-3 text-white">
                  {adminUiText.logoutLabel}
                </button>
              </form>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-800">
            {adminUiText.demoNotice}
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow">
          {inquiries.length === 0 ? (
            <p className="text-black">{adminUiText.emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-700">
                    <th className="p-3">{adminUiText.createdAtLabel}</th>
                    <th className="p-3">{adminUiText.userNameLabel}</th>
                    <th className="p-3">{adminUiText.emailLabel}</th>
                    <th className="p-3">{adminUiText.ipAddressLabel}</th>
                    <th className="p-3">{adminUiText.messageLabel}</th>
                    <th className="p-3">{adminUiText.riskLevelLabel}</th>
                    <th className="p-3">{adminUiText.harassmentTypeLabel}</th>
                    <th className="p-3">{adminUiText.statusLabel}</th>
                    <th className="p-3">{adminUiText.answerLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="border-b border-gray-200 align-top text-black">
                      <td className="p-3 whitespace-nowrap">{formatDateTime(inquiry.created_at)}</td>
                      <td className="p-3">{inquiry.user_name || adminUiText.noNameLabel}</td>
                      <td className="p-3">{inquiry.email || adminUiText.noEmailLabel}</td>
                      <td className="p-3">{inquiry.ip_address || adminUiText.unknownLabel}</td>
                      <td className="max-w-xs p-3">{truncateText(inquiry.message, 80)}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeStyles[inquiry.risk_level]}`}
                        >
                          {riskLevelLabels[inquiry.risk_level]}
                        </span>
                      </td>
                      <td className="p-3">{harassmentTypeLabels[inquiry.harassment_type]}</td>
                      <td className="p-3">{inquiryStatusLabels[inquiry.status]}</td>
                      <td className="max-w-sm p-3">{truncateText(inquiry.answer, 120)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
