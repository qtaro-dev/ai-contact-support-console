import { adminLoginUiText } from '@/lib/chatUiText';

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    redirect?: string;
  }>;
};

const getErrorMessage = (error?: string) => {
  if (error === 'config') {
    return adminLoginUiText.configMessage;
  }

  if (error) {
    return adminLoginUiText.invalidMessage;
  }

  return null;
};

const AdminLoginPage = async ({ searchParams }: AdminLoginPageProps) => {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const redirectPath = params.redirect?.startsWith('/') ? params.redirect : '/admin';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-8">
      <main className="w-full max-w-md rounded-xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-gray-950">{adminLoginUiText.title}</h1>
        <p className="mt-2 text-gray-700">{adminLoginUiText.description}</p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {adminLoginUiText.helperMessage}
        </p>
        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </p>
        ) : null}
        <form action="/api/admin-login" method="post" className="mt-6 space-y-5">
          <input type="hidden" name="redirect" value={redirectPath} />
          <label className="block space-y-2 text-black">
            <span className="font-bold">{adminLoginUiText.passwordLabel}</span>
            <input
              type="password"
              name="password"
              placeholder={adminLoginUiText.passwordPlaceholder}
              className="w-full rounded-lg border border-gray-700 p-3 text-black focus:text-black"
            />
          </label>
          <button type="submit" className="rounded-lg bg-blue-500 p-3 text-white">
            {adminLoginUiText.submitLabel}
          </button>
        </form>
      </main>
    </div>
  );
};

export default AdminLoginPage;
