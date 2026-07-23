<script setup lang="ts">
import { useState, useUserSession } from "#imports";
import { MdEditor } from "md-editor-v3";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useTheme } from "~/composables/use-theme";
import type { ReviewRecord } from "~/lib/reviews";
import { sanitizeMarkdownHtml } from "~/lib/markdown-sanitize";
import type {
  ReviewSaveResponse,
  ReviewSourceResponse,
} from "../../shared/types/review-editor";

type Mode = "edit" | "preview";
type Status = {
  kind: "error" | "success";
  message: string;
  url?: string;
} | null;

const props = defineProps<{ review: ReviewRecord }>();
const { theme } = useTheme();
const {
  ready: sessionReady,
  loggedIn,
  fetch: refreshSession,
} = useUserSession();

const sourceCache = useState<Record<string, string>>("review-source-cache", () => ({}));
const loginVisible = ref(false);
const password = ref("");
const loggingIn = ref(false);
const loadingSource = ref(false);
const saving = ref(false);
const editing = ref(false);
const mode = ref<Mode>("edit");
const baseContent = ref("");
const draft = ref("");
const sha = ref("");
const status = ref<Status>(null);

const reviewKey = computed(() => `${props.review.kind}/${props.review.slug}`);
const displayedContent = computed(() => sourceCache.value[reviewKey.value] ?? props.review.raw);
const dirty = computed(() => editing.value && draft.value !== baseContent.value);
const editorToolbars = [
  "bold",
  "underline",
  "italic",
  "-",
  "title",
  "quote",
  "unorderedList",
  "orderedList",
  "-",
  "codeRow",
  "code",
  "link",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "pageFullscreen",
  "fullscreen",
] as const;

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const payload = "data" in error ? error.data : null;
    if (payload && typeof payload === "object") {
      if ("message" in payload && typeof payload.message === "string") {
        return payload.message;
      }
      if ("statusMessage" in payload && typeof payload.statusMessage === "string") {
        return payload.statusMessage;
      }
    }
    if ("message" in error && typeof error.message === "string") return error.message;
  }
  return "操作失败，请稍后重试";
}

function confirmDiscard() {
  if (!dirty.value || !import.meta.client) return true;
  return window.confirm("当前修改尚未保存，确定要放弃吗？");
}

async function login() {
  if (!password.value || loggingIn.value) return;
  loggingIn.value = true;
  status.value = null;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { password: password.value },
    });
    await refreshSession();
    password.value = "";
    loginVisible.value = false;
    status.value = { kind: "success", message: "管理员已登录，可以开始编辑。" };
  } catch (error) {
    status.value = { kind: "error", message: errorMessage(error) };
  } finally {
    loggingIn.value = false;
  }
}

async function logout() {
  if (!confirmDiscard()) return;
  editing.value = false;
  status.value = null;
  await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  await refreshSession();
}

async function startEditing() {
  if (loadingSource.value) return;
  loadingSource.value = true;
  status.value = null;
  try {
    const source = await $fetch<ReviewSourceResponse>(
      `/api/reviews/${props.review.kind}/${props.review.slug}`,
    );
    sourceCache.value[reviewKey.value] = source.content;
    baseContent.value = source.content;
    draft.value = source.content;
    sha.value = source.sha;
    mode.value = "edit";
    editing.value = true;
  } catch (error) {
    status.value = { kind: "error", message: errorMessage(error) };
  } finally {
    loadingSource.value = false;
  }
}

function cancelEditing() {
  if (!confirmDiscard()) return;
  draft.value = baseContent.value;
  editing.value = false;
  mode.value = "edit";
  status.value = null;
}

async function save() {
  if (!dirty.value || saving.value) return;
  saving.value = true;
  status.value = null;
  try {
    const result = await $fetch<ReviewSaveResponse>(
      `/api/reviews/${props.review.kind}/${props.review.slug}`,
      {
        method: "PUT",
        body: { content: draft.value, sha: sha.value },
      },
    );
    sha.value = result.sha;
    baseContent.value = draft.value;
    sourceCache.value[reviewKey.value] = draft.value;
    editing.value = false;
    mode.value = "edit";
    status.value = {
      kind: "success",
      message: "已提交 GitHub，当前预览已更新；线上指标将在 Vercel 部署完成后同步。",
      url: result.commitUrl,
    };
  } catch (error) {
    status.value = { kind: "error", message: errorMessage(error) };
  } finally {
    saving.value = false;
  }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

watch(reviewKey, () => {
  editing.value = false;
  mode.value = "edit";
  status.value = null;
});

onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload));
onBeforeRouteLeave(() => confirmDiscard());

defineExpose({ confirmDiscard });
</script>

<template>
  <section class="review-document-editor">
    <div class="review-editor-toolbar">
      <p
        v-if="status"
        class="review-editor-status"
        :class="`is-${status.kind}`"
        role="status"
      >
        {{ status.message }}
        <a v-if="status.url" :href="status.url" target="_blank" rel="noopener noreferrer">查看提交 ↗</a>
      </p>
      <p v-else-if="editing && dirty" class="review-editor-status is-pending" role="status">
        有未保存的修改
      </p>
      <span v-else class="review-editor-status-spacer" />

      <div class="review-editor-actions">
        <template v-if="editing">
          <div class="review-mode-switch" aria-label="编辑模式">
            <button
              type="button"
              :class="{ active: mode === 'edit' }"
              :aria-pressed="mode === 'edit'"
              @click="mode = 'edit'"
            >
              编辑
            </button>
            <button
              type="button"
              :class="{ active: mode === 'preview' }"
              :aria-pressed="mode === 'preview'"
              @click="mode = 'preview'"
            >
              预览
            </button>
          </div>
          <button type="button" class="editor-button" :disabled="saving" @click="cancelEditing">
            取消
          </button>
          <button
            type="button"
            class="editor-button primary"
            :disabled="!dirty || saving"
            @click="save"
          >
            {{ saving ? "保存中…" : "保存到 GitHub" }}
          </button>
        </template>

        <template v-else-if="sessionReady && loggedIn">
          <button type="button" class="editor-button subtle" @click="logout">退出管理</button>
          <button
            type="button"
            class="editor-button primary"
            :disabled="loadingSource"
            @click="startEditing"
          >
            {{ loadingSource ? "读取最新版本…" : "编辑 Markdown" }}
          </button>
        </template>

        <button
          v-else-if="sessionReady"
          type="button"
          class="editor-button"
          @click="loginVisible = true"
        >
          管理员登录
        </button>
      </div>
    </div>

    <div v-if="loadingSource" class="review-editor-loading" role="status">
      正在从 GitHub 读取最新版本…
    </div>

    <MdEditor
      v-else-if="editing && mode === 'edit'"
      v-model="draft"
      class="market-markdown-editor"
      language="zh-CN"
      :theme="theme"
      preview-theme="default"
      code-theme="github"
      :preview="false"
      :html-preview="false"
      :no-prettier="true"
      :no-mermaid="true"
      :toolbars="[...editorToolbars]"
      :sanitize="sanitizeMarkdownHtml"
    />

    <MarkdownDocument
      v-else
      :markdown="editing ? draft : displayedContent"
    />

    <AModal
      v-model:visible="loginVisible"
      title="管理员登录"
      :footer="false"
      :mask-closable="!loggingIn"
      :closable="!loggingIn"
      unmount-on-close
    >
      <form class="admin-login-form" @submit.prevent="login">
        <p>登录后可读取 GitHub 中的最新版本，并将修改直接提交到 main 分支。</p>
        <label for="admin-password">管理员密码</label>
        <AInputPassword
          id="admin-password"
          v-model="password"
          placeholder="请输入管理员密码"
          autocomplete="current-password"
          allow-clear
          autofocus
        />
        <button
          type="submit"
          class="editor-button primary admin-login-submit"
          :disabled="!password || loggingIn"
        >
          {{ loggingIn ? "登录中…" : "登录" }}
        </button>
      </form>
    </AModal>
  </section>
</template>
