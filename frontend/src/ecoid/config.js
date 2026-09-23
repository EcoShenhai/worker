// EcoID dual authentication — public configuration only (never secrets; blueprint Rule 9).
export const ECOID = {
  origin: import.meta.env.VITE_ECOID_ORIGIN || 'https://ecoid.eshcloud.com',
  clientId: import.meta.env.VITE_ECOID_CLIENT_ID || 'worker',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  telegramBot: import.meta.env.VITE_TELEGRAM_BOT || '',
};
