import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    compact: false,
    contentCompact: 'wide',
    contentCompactWidth: 1440,
    contentPadding: 20,
    defaultHomePath: '/',
    dynamicTitle: false,
    enableCheckUpdates: false,
    enablePreferences: true,
    locale: 'zh-CN',
    name: import.meta.env.VITE_APP_TITLE,
    timezone: 'Asia/Shanghai',
  },
  breadcrumb: {
    enable: true,
    showHome: false,
    showIcon: false,
  },
  copyright: {
    enable: false,
    settingShow: false,
  },
  footer: { enable: false },
  logo: {
    enable: true,
    source: '/favicon.svg',
    sourceDark: '/favicon.svg',
  },
  navigation: {
    accordion: true,
    split: true,
    styleType: 'rounded',
  },
  sidebar: {
    collapsed: false,
    collapsedButton: true,
    collapseWidth: 64,
    draggable: false,
    expandOnHover: false,
    width: 232,
  },
  tabbar: { enable: false },
  theme: {
    colorPrimary: 'hsl(151 34% 34%)',
    mode: 'light',
    radius: '0.5',
    semiDarkSidebar: true,
  },
  widget: {
    fullscreen: true,
    globalSearch: true,
    languageToggle: false,
    lockScreen: false,
    notification: false,
    refresh: true,
    sidebarToggle: true,
    themeToggle: true,
    timezone: false,
  },
});
