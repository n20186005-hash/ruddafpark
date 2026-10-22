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
let deniedInPage = false;
const stateText = () => allowed ? 'إحصاءات جوجل مفعلة في هذا التبويب.' : 'إحصاءات جوجل متوقفة في هذا التبويب.';
function sync(message?: string) {
  if (checkbox) checkbox.checked = allowed;
  if (status && message !== undefined) status.textContent = message;
}
function choose(grant: boolean) {
  let persisted = false;
  let sessionSaved = false;
  let rollbackSaved = false;
  let rollbackRemoved = false;
  if (!grant) {
    deniedInPage = true;
    apply(false);
    persisted = write('localStorage', preferenceKey, 'no');
    sessionSaved = write('sessionStorage', vetoKey, 'yes');
  } else {
    // Verify veto removal and readability before publishing a shared grant.
    const readable = read('localStorage', preferenceKey) !== 'unavailable';
    sessionSaved = readable && clear('sessionStorage', vetoKey);
    persisted = sessionSaved && write('localStorage', preferenceKey, 'yes');
    if (persisted && sessionSaved) {
      deniedInPage = false;
      apply(true);
    } else {
      // Best-effort rollback if the shared grant could not be confirmed.
      rollbackSaved = write('localStorage', preferenceKey, 'no');
      if (!rollbackSaved) rollbackRemoved = clear('localStorage', preferenceKey);
      deniedInPage = true;
      sessionSaved = write('sessionStorage', vetoKey, 'yes');
      apply(false);
    }
  }
  try { document.cookie = 'ruddaf_consent=; Path=/; Max-Age=0; SameSite=Lax; Secure'; } catch { /* Legacy cookie is not read by this controller. */ }
  let message: string;
  if (grant && allowed) message = 'تم السماح بإحصاءات جوجل وحفظ القرار.';
  else if (!grant && persisted && sessionSaved) message = 'إحصاءات جوجل متوقفة الآن، وحُفظ قرار الرفض.';
  else if ((!grant && persisted) || rollbackSaved) message = 'إحصاءات جوجل متوقفة الآن، وحُفظ الرفض في التخزين المحلي. لم نؤكد السماح أو حفظ جميع إعدادات التبويب؛ قد يغيّر تبويب آخر القرار المشترك لاحقًا.';
  else if (rollbackRemoved) message = 'إحصاءات جوجل متوقفة الآن، وأزلنا السماح المحفوظ بعد تعذر تأكيده. لم تكتمل عملية السماح؛ راجع الإعداد قبل السماح مجددًا.';
  else if (sessionSaved) message = 'إحصاءات جوجل متوقفة في هذا التبويب، وحُفظ رفض التبويب عند التنقل وإعادة التحميل. تعذر تأكيد الرفض الدائم أو إزالة السماح المحفوظ؛ قد تستخدم تبويبات أخرى سماحًا ما زال محفوظًا. امسح بيانات الموقع لإزالته.';
  else message = 'إحصاءات جوجل متوقفة في هذه الصفحة فقط. تعذر تأكيد حفظ الرفض أو إزالة السماح المحفوظ؛ قد يبقى سماح يمكن أن تستخدمه تبويبات أخرى. امسح بيانات الموقع من المتصفح قبل التنقل أو إعادة التحميل.';
  sync(message);
  return { allowed, persisted, sessionSaved };
}
analyticsWindow.ruddafConsent = { choose, get allowed() { return allowed; } };
sync();
checkbox?.addEventListener('change', () => { if (status) status.textContent = 'تعديل لم يُحفظ بعد. ' + stateText(); });
document.querySelector('#save')?.addEventListener('click', () => choose(Boolean(checkbox?.checked)));
document.querySelector('#reject')?.addEventListener('click', () => choose(false));
document.querySelector('#clear')?.addEventListener('click', () => choose(false));
window.addEventListener('storage', (event) => {
  if (event.key !== preferenceKey && event.key !== null) return;
  if (event.newValue !== 'yes') {
    deniedInPage = true;
    write('sessionStorage', vetoKey, 'yes');
  }
  apply(!deniedInPage && read('localStorage', preferenceKey) === 'yes' && read('sessionStorage', vetoKey) === null);
  sync(stateText());
});
export {};
