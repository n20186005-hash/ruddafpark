const measurementId = 'G-HXM22WWPKP';
const preferenceKey = 'ruddaf-analytics-v2';
const vetoKey = 'ruddaf-analytics-denied';
type StorageKind = 'localStorage' | 'sessionStorage';
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; ruddafConsent?: { choose: (grant: boolean) => { allowed: boolean; persisted: boolean; sessionSaved: boolean }; readonly allowed: boolean }; [key: `ga-disable-${string}`]: boolean };
const analyticsWindow = window as unknown as AnalyticsWindow;
const read = (kind: StorageKind, key: string): string | null => { try { return window[kind].getItem(key); } catch { return 'unavailable'; } };
const write = (kind: StorageKind, key: string, value: string): boolean => { try { window[kind].setItem(key, value); return window[kind].getItem(key) === value; } catch { return false; } };
const clear = (kind: StorageKind, key: string): boolean => { try { window[kind].removeItem(key); return window[kind].getItem(key) === null; } catch { return false; } };
analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
analyticsWindow.gtag = analyticsWindow.gtag || ((...args: unknown[]) => { analyticsWindow.dataLayer!.push(args); });
let allowed = false;
let loaded = Boolean(document.querySelector('script[data-ruddaf-analytics]'));
analyticsWindow[`ga-disable-${measurementId}`] = true;
analyticsWindow.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
function apply(grant: boolean) {
  allowed = grant;
  analyticsWindow[`ga-disable-${measurementId}`] = !grant;
  analyticsWindow.gtag!('consent', 'update', { analytics_storage: grant ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  if (grant && !loaded) {
    loaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.ruddafAnalytics = 'true';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
    analyticsWindow.gtag!('js', new Date());
    analyticsWindow.gtag!('config', measurementId, { anonymize_ip: true });
  }
}
// A failed storage read or an unreadable veto never restores a stored grant.
apply(read('localStorage', preferenceKey) === 'yes' && read('sessionStorage', vetoKey) === null);
const checkbox = document.querySelector<HTMLInputElement>('#analytics');
const status = document.querySelector<HTMLElement>('#status');
function choose(grant: boolean) {
  // Deny the running library before any persistence operation can fail.
  if (!grant) apply(false);
  const persisted = write('localStorage', preferenceKey, grant ? 'yes' : 'no');
  const sessionSaved = grant ? clear('sessionStorage', vetoKey) : write('sessionStorage', vetoKey, 'yes');
  if (grant) apply(persisted && sessionSaved);
  try { document.cookie = 'ruddaf_consent=; Path=/; Max-Age=0; SameSite=Lax; Secure'; } catch { /* Legacy cookie is not read by this controller. */ }
  if (checkbox) checkbox.checked = allowed;
  if (status) status.textContent = persisted && sessionSaved
    ? (allowed ? 'تم السماح بإحصاءات جوجل وحفظ القرار.' : 'إحصاءات جوجل متوقفة الآن، وحُفظ قرار الرفض.')
    : (grant ? 'تعذر حفظ القرار بالكامل؛ إحصاءات جوجل متوقفة في هذه الصفحة. راجع الإعداد بعد التحديث أو فتح تبويب جديد.' : 'أوقفنا إحصاءات جوجل في هذه الصفحة. تعذر حفظ القرار بالكامل؛ قد يقتصر الرفض على هذه الصفحة أو هذا التبويب. راجع الإعداد بعد التحديث أو فتح تبويب جديد.');
  return { allowed, persisted, sessionSaved };
}
analyticsWindow.ruddafConsent = { choose, get allowed() { return allowed; } };
if (checkbox) checkbox.checked = allowed;
document.querySelector('#save')?.addEventListener('click', () => choose(Boolean(checkbox?.checked)));
document.querySelector('#reject')?.addEventListener('click', () => choose(false));
document.querySelector('#clear')?.addEventListener('click', () => choose(false));
window.addEventListener('storage', (event) => { if (event.key === preferenceKey && event.newValue !== 'yes') { apply(false); if (checkbox) checkbox.checked = false; } });
export {};
