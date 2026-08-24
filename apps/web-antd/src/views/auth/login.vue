<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { LockOutlined, UserOutlined } from '@ant-design/icons-vue';
import { Button, Form, FormItem, Input, InputPassword } from 'ant-design-vue';

import { errorMessage } from '#/lib/trading';
import { useAuthStore } from '#/store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const error = ref('');
const form = reactive({ password: '', username: '' });

async function submit() {
  error.value = '';
  try {
    await authStore.authLogin(form, async () => {
      await router.replace(String(route.query.returnTo || '/'));
    });
  } catch (error_) {
    error.value = errorMessage(error_);
  }
}
</script>

<template>
  <section class="login-panel" aria-labelledby="login-title">
    <div class="login-kicker">MARKET DIARY</div>
    <h1 id="login-title">登录研究终端</h1>
    <p>使用 Trading Cloud 账户继续访问你的研究与交易复盘。</p>

    <Form :model="form" layout="vertical" @finish="submit">
      <FormItem label="账号" name="username" :rules="[{ required: true, message: '请输入账号' }]">
        <Input v-model:value="form.username" autocomplete="username" placeholder="输入账号">
          <template #prefix><UserOutlined /></template>
        </Input>
      </FormItem>
      <FormItem label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
        <InputPassword v-model:value="form.password" autocomplete="current-password" placeholder="输入密码">
          <template #prefix><LockOutlined /></template>
        </InputPassword>
      </FormItem>
      <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      <Button block html-type="submit" :loading="authStore.loginLoading" type="primary">
        {{ authStore.loginLoading ? '正在验证' : '登录' }}
      </Button>
    </Form>
  </section>
</template>
