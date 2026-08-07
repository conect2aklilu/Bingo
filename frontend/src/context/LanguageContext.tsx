import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'am';

const translations: Record<string, Record<Language, string>> = {
  brand: { en: 'AJ Bingo', am: 'AJ ቢንጎ' },
  brandTitle: { en: 'AJ Bingo', am: 'AJ ቢንጎ' },
  brandSubtitle: { en: 'Live Amharic bingo with style', am: 'የአማርኛ ቢንጎ በዋና ግምገማ' },
  loginTitle: { en: 'Welcome back', am: 'እንኳን በደህና ተመለሱ' },
  registerTitle: { en: 'Create account', am: 'መለያ ይፍጠሩ' },
  username: { en: 'Username', am: 'የተጠቃሚ ስም' },
  password: { en: 'Password', am: 'የይለፍ ቃል' },
  passwordHint: { en: 'Password (min 8 chars, include a letter and number)', am: 'የይለፍ ቃል (ቢያንስ 8 ቁምፊ, ፊደል እና ቁጥር ያካትት)' },
  loginButton: { en: 'Log in', am: 'ግባ' },
  registerButton: { en: 'Register', am: 'መዝግብ' },
  noAccount: { en: 'No account?', am: 'መለያ የለህም?' },
  haveAccount: { en: 'Already have an account?', am: 'መለያ አለህ?' },
  lobbyTitle: { en: 'Lobby', am: 'ሎብቢ' },
  walletTitle: { en: 'Wallet', am: 'ዋሌት' },
  backToLobby: { en: '← Back to Lobby', am: '← ወደ ሎብቢ ተመለስ' },
  balance: { en: 'Balance', am: 'ቀሪ ሂሳብ' },
  deposit: { en: 'Deposit', am: 'ተቀማጭ' },
  depositInstructions: {
    en: 'Send to the CBE account or Telebirr phone below, then submit the deposit details for verification.',
    am: 'ወደ ዝቅተኛው የCBE ሂሳብ ወይም የTelebirr ስልክ ቁጥር ገንዘብ ላክ፣ በኋላ ዝርዝሩን ያስገቡ።',
  },
  cbeAccount: { en: 'CBE account', am: 'የCBE ሂሳብ' },
  telebirrPhone: { en: 'Telebirr phone', am: 'የTelebirr ስልክ' },
  telebirrPhoneNumber: { en: '0925660565', am: '0925660565' },
  cbeAccountNumber: { en: '1000181219398', am: '1000181219398' },
  withdraw: { en: 'Withdraw', am: 'ይውጣ' },
  amount: { en: 'Amount', am: 'መጠን' },
  transactionReference: { en: 'Transaction reference', am: 'የግብይት ማጣቀሻ' },
  accountDetails: { en: 'Account details', am: 'የመለያ ዝርዝሮች' },
  submitDeposit: { en: 'Submit Deposit Request', am: 'የተቀማጭ ጥያቄ ላክ' },
  submitWithdraw: { en: 'Submit Withdrawal Request', am: 'የወጪ ጥያቄ ላክ' },
  history: { en: 'History', am: 'ታሪክ' },
  table: { en: 'Table', am: 'ጠረጴዛ' },
  status: { en: 'Status', am: 'ሁኔታ' },
  players: { en: 'Players', am: 'ተጫዋቾች' },
  joinTable: { en: 'Join Table', am: 'ጠረጴዛ ተቀላቀል' },
  inProgress: { en: 'In progress', am: 'በሂደት ላይ' },
  cards: { en: 'Cards', am: 'ካርዶች' },
  gameStartsIn: { en: 'Game starts in', am: 'ጨዋታ ይጀምራል በ' },
  seconds: { en: 'seconds', am: 'ሰከንዶች' },
  calledNumbers: { en: 'Called numbers', am: 'የተጠራ ቁጥሮች' },
  latestNumber: { en: 'Latest number', am: 'የቅርብ ጊዜ ቁጥር' },
  claimBingo: { en: 'Claim Bingo', am: 'ቢንጎ አስመዝግብ' },
  winningMessage: { en: 'Not a winning card yet — keep playing!', am: 'አሁንም አሸናፊ ካርድ አይደለም — ቀጥል!' },
  roundCancelled: { en: 'Round cancelled — stakes refunded.', am: 'ዙር ተሰርዟል — ተቀማጭ ተመለሳል.' },
  winner: { en: 'Winner', am: 'አሸናፊ' },
  payout: { en: 'Payout', am: 'ክፍያ' },
  adminPanel: { en: 'Admin Panel', am: 'የአስተዳደር ፓነል' },
  pendingRequests: { en: 'Pending Deposit / Withdrawal Requests', am: 'በመጠባበቅ ላይ ያሉ የተቀማጭ/የወጭ ጥያቄዎች' },
  playersList: { en: 'Players', am: 'ተጫዋቾች' },
  approve: { en: 'Approve', am: 'አረጋግጥ' },
  reject: { en: 'Reject', am: 'እምቢ' },
  ban: { en: 'Ban', am: 'አግድ' },
  unban: { en: 'Unban', am: 'አታግድ' },
  noPending: { en: 'No pending requests.', am: 'ምንም በመጠባበቅ ላይ ያሉ ጥያቄዎች የሉም.' },
  depositMin: { en: 'Minimum deposit is 50 Birr', am: 'ዝቅተኛ ተቀማጭ 50 ብር ነው' },
  insufficientBalance: { en: 'Insufficient balance', am: 'በቂ ሂሳብ የለም' },
  invalidAmount: { en: 'Please enter a valid amount', am: 'እባክዎ ትክክለኛ መጠን ያስገቡ' },
  validationError: { en: 'Please check your input', am: 'እባክዎ ግብዓትዎን ይመልከቱ' },
  language: { en: 'Language', am: 'ቋንቋ' },
  english: { en: 'English', am: 'እንግሊዝኛ' },
  amharic: { en: 'Amharic', am: 'አማርኛ' },
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem('yene_language');
  return stored === 'am' ? 'am' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem('yene_language', language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translations[key]?.[language] || translations[key]?.en || key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
