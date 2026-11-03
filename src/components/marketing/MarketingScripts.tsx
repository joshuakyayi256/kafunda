/**
 * Third-party marketing scripts, loaded after the page is interactive.
 * Each one only renders when its env var is set in Vercel:
 *  - NEXT_PUBLIC_GOOGLE_ADS_ID      (AW-XXXXXXXXX)  Google Ads conversions
 *  - NEXT_PUBLIC_GA4_ID             (G-XXXXXXXXXX)  Google Analytics (optional)
 *  - NEXT_PUBLIC_ONESIGNAL_APP_ID   OneSignal web push
 */
import Script from "next/script";

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || "";
// Public App ID (safe to ship). Env var overrides; works with no Vercel setup.
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "b32cacdc-557b-4892-80a5-99262c592d34";

export default function MarketingScripts() {
  const gtagId = ADS_ID || GA4_ID;

  return (
    <>
      {gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('js',new Date());
${ADS_ID ? `gtag('config',${JSON.stringify(ADS_ID)},{allow_enhanced_conversions:true});` : ""}
${GA4_ID ? `gtag('config',${JSON.stringify(GA4_ID)});` : ""}`}
          </Script>
        </>
      )}

      {ONESIGNAL_APP_ID && (
        <>
          <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
          <Script id="onesignal-init" strategy="afterInteractive">
            {`window.OneSignalDeferred=window.OneSignalDeferred||[];
OneSignalDeferred.push(async function(OneSignal){
  await OneSignal.init({
    appId:${JSON.stringify(ONESIGNAL_APP_ID)},
    serviceWorkerPath:"OneSignalSDKWorker.js",
    allowLocalhostAsSecureOrigin:true,
    notifyButton:{enable:false},
    promptOptions:{slidedown:{prompts:[{type:"push",autoPrompt:false,text:{
      actionMessage:"Get today's offers and order updates from Kafunda — no spam.",
      acceptButton:"Allow",cancelButton:"Not now"}}]}}
  });
});`}
          </Script>
        </>
      )}
    </>
  );
}
