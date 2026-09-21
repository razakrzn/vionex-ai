import React, { createContext, useContext } from "react";
import { useLanguageStore } from "@/stores/languageStore";

type Language = "en" | "ar" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.mySpace": "My Space",
    "nav.myDrive": "My Drive",
    "nav.myNeeds": "My Needs",
    "nav.hotProperties": "Hot Properties",
    "nav.login": "Login",
    "nav.partner": "Sign Up",
    "nav.settings": "Settings",
    "nav.chat": "Messages",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.dark": "Dark",
    "settings.light": "Light",
    "viewAll.spaces": "All Spaces",
    "viewAll.vehicles": "All Vehicles",
    "viewAll.needs": "All Needs",
    "pagination.previous": "Previous",
    "pagination.next": "Next",
    "chat.title": "Messages",
    "chat.search": "Search conversations...",
    "chat.typeMessage": "Type a message...",
    "chat.online": "Online",
    "chat.offline": "Offline",
    "search.placeholder": "Search",
    "filter.type": "Type",
    "filter.all": "All",
    "filter.usage": "Usage",
    "filter.beds": "Beds",
    "filter.any": "Any",
    "filter.minPrice": "Min",
    "filter.maxPrice": "Max",
    "badge.hot": "Hot",
    "footer.brandDescription": "Your AI-powered marketplace for properties, vehicles, and personal needs in UAE.",
    "footer.newsletter.placeholder": "Your email",
    "footer.links.services": "Services",
    "footer.links.company": "Company",
    "footer.newsletter.title": "Stay Updated",
    "footer.newsletter.desc": "Subscribe for the latest listings and offers.",
    "footer.company.about": "About Us",
    "footer.company.pricing": "Pricing",
    "footer.company.terms": "Terms & Conditions",
    "footer.company.privacy": "Privacy Policy",
    "footer.copyright": "© 2024 Vionex Nova. All rights reserved.",
    "footer.disclaimer": "Vionex Nova acts as a broker. Both parties negotiate and close deals independently. 5% VAT applicable.",
  },
  ar: {
    "nav.mySpace": "مساحتي",
    "nav.myDrive": "سيارتي",
    "nav.myNeeds": "احتياجاتي",
    "nav.hotProperties": "عروض مميزة",
    "nav.login": "تسجيل الدخول",
    "nav.partner": "شريك معنا",
    "nav.settings": "الإعدادات",
    "nav.chat": "الرسائل",
    "settings.title": "الإعدادات",
    "settings.language": "اللغة",
    "settings.theme": "المظهر",
    "settings.dark": "داكن",
    "settings.light": "فاتح",
    "viewAll.spaces": "جميع المساحات",
    "viewAll.vehicles": "جميع المركبات",
    "viewAll.needs": "جميع الاحتياجات",
    "pagination.previous": "السابق",
    "pagination.next": "التالي",
    "chat.title": "الرسائل",
    "chat.search": "البحث في المحادثات...",
    "chat.typeMessage": "اكتب رسالة...",
    "chat.online": "متصل",
    "chat.offline": "غير متصل",
  },
  zh: {
    "nav.mySpace": "我的空间",
    "nav.myDrive": "我的车辆",
    "nav.myNeeds": "我的需求",
    "nav.hotProperties": "热门房产",
    "nav.login": "登录",
    "nav.partner": "成为合作伙伴",
    "nav.settings": "设置",
    "nav.chat": "消息",
    "settings.title": "设置",
    "settings.language": "语言",
    "settings.theme": "主题",
    "settings.dark": "深色",
    "settings.light": "浅色",
    "viewAll.spaces": "所有空间",
    "viewAll.vehicles": "所有车辆",
    "viewAll.needs": "所有需求",
    "pagination.previous": "上一页",
    "pagination.next": "下一页",
    "chat.title": "消息",
    "chat.search": "搜索对话...",
    "chat.typeMessage": "输入消息...",
    "chat.online": "在线",
    "chat.offline": "离线",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language: languageFromStore, setLanguage: setLanguageStore } = useLanguageStore();
  
  // Cast to Language type (store uses string, but we know it's one of the valid languages)
  const language = (languageFromStore as Language) || "en";
  
  const setLanguage = (lang: Language) => {
    setLanguageStore(lang);
  };

  // Do NOT modify `document.documentElement.dir` here —
  // we only change visible text via translations. Keeping
  // layout direction unchanged prevents alignment flips when
  // switching languages (e.g., Arabic).

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
