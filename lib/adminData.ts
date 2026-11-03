import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminSessionCookieName, isValidAdminSession } from '@/lib/adminAuth';
import { mockInquiryRecords } from '@/app/admin/mockData';
import { getAppSettings } from '@/lib/appSettings';
import { appPaths } from '@/lib/securityPolicy';
import { logSecurityEvent } from '@/lib/apiSecurity';

export const requireAdmin = async (path: string) => {
  let authenticated = false;
  try {
    authenticated = await isValidAdminSession((await cookies()).get(adminSessionCookieName)?.value);
  } catch {
    logSecurityEvent('authorization_store_unavailable');
  }
  if (!authenticated) redirect(`${appPaths.login}?redirect=${encodeURIComponent(path)}`);
};

export const getAdminInquiries = async () => {
  await requireAdmin(appPaths.admin);
  return mockInquiryRecords;
};

export const getAdminSettings = async () => {
  await requireAdmin(appPaths.settings);
  return getAppSettings();
};
