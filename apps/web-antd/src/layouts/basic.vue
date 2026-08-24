<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { BasicLayout, UserDropdown } from '@vben/layouts';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import { useAuthStore } from '#/store';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const avatar = '/favicon.svg';
const menus = computed(() => [
  {
    handler: () => router.push('/trading/settings'),
    icon: 'lucide:settings-2',
    text: '设置与导出',
  },
  {
    handler: () =>
      openWindow('https://github.com/SmartDengC/stock-exchange-reviews', {
        target: '_blank',
      }),
    icon: 'lucide:github',
    text: 'GitHub',
  },
]);

function handleLogout() {
  return authStore.logout();
}
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="市场日记账户"
        tag-text="Terminal"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
  </BasicLayout>
</template>
