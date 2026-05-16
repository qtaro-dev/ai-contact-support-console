import Link from 'next/link';
import { getAppSettings } from '@/lib/appSettings';
import { settingsUiText } from '@/lib/chatUiText';

export const dynamic = 'force-dynamic';

const SettingsPage = () => {
  const settings = getAppSettings();
  const rows = [
    [settingsUiText.aiProviderLabel, settings.aiProvider],
    [settingsUiText.aiModelLabel, settings.aiModel],
    [
      settingsUiText.aiMaxOutputCharsLabel,
      `${settings.aiMaxOutputChars}${settingsUiText.charsSuffix}`
    ],
    [
      settingsUiText.rateLimitEnabledLabel,
      settings.rateLimitEnabled ? settingsUiText.enabledLabel : settingsUiText.disabledLabel
    ],
    [
      settingsUiText.rateLimitWindowSecondsLabel,
      `${settings.rateLimitWindowSeconds}${settingsUiText.secondsSuffix}`
    ],
    [
      settingsUiText.rateLimitMaxRequestsLabel,
      `${settings.rateLimitMaxRequests}${settingsUiText.requestsSuffix}`
    ],
    [
      settingsUiText.skipAiOnRateLimitLabel,
      settings.skipAiOnRateLimit ? settingsUiText.enabledLabel : settingsUiText.disabledLabel
    ],
    [
      settingsUiText.openAiApiKeyStatusLabel,
      settings.hasOpenAiApiKey ? settingsUiText.configuredLabel : settingsUiText.missingLabel
    ],
    [
      settingsUiText.supabaseServiceRoleKeyStatusLabel,
      settings.hasSupabaseServiceRoleKey
        ? settingsUiText.configuredLabel
        : settingsUiText.missingLabel
    ]
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-8 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-950">{settingsUiText.title}</h1>
              <p className="mt-2 text-gray-700">{settingsUiText.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="rounded-lg bg-blue-500 p-3 text-white">
                {settingsUiText.backToAdminLabel}
              </Link>
              <form action="/api/admin-logout" method="post">
                <button type="submit" className="rounded-lg bg-slate-700 p-3 text-white">
                  {settingsUiText.logoutLabel}
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="rounded-xl bg-white p-6 shadow">
          <dl className="grid gap-4 md:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 p-4">
                <dt className="text-sm font-bold text-gray-700">{label}</dt>
                <dd className="mt-2 text-lg text-black">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
