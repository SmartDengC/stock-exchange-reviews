<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router";
import { generateReviewSlug } from "~/lib/reviews";

const route = useRoute();
const router = useRouter();
const segments = (Array.isArray(route.params.params) ? route.params.params : [route.params.params]).filter(Boolean);
const kind = (segments[0] === "weekly" ? "weekly" : "daily");
const slug = segments[1];
const isEdit = Boolean(slug);

const title = ref("");
const dateLabel = ref("");
const content = ref("");
const version = ref<number | undefined>(undefined);
const saving = ref(false);
const error = ref("");
const preview = ref(route.query.preview === "1");
const errorElement = ref<HTMLElement | null>(null);
const initialSnapshot = ref("");

function editorSnapshot() {
  return JSON.stringify({ title: title.value, dateLabel: dateLabel.value, content: content.value });
}

if (!isEdit) initialSnapshot.value = editorSnapshot();
const dirty = computed(() => Boolean(initialSnapshot.value) && editorSnapshot() !== initialSnapshot.value);

async function focusError() {
  await nextTick();
  errorElement.value?.focus();
}

const loading = ref(isEdit);
const { data: existing } = useFetch<ResearchReview>(
  () => (isEdit && slug ? `/api/reviews/${kind}/${slug}` : ""),
  { lazy: true, server: false },
);

watch(existing, (value) => {
  if (value) {
    title.value = value.title;
    dateLabel.value = value.dateLabel;
    content.value = value.content;
    version.value = value.version;
    initialSnapshot.value = editorSnapshot();
  }
  loading.value = false;
}, { immediate: true });

function generateSlug(): string {
  return generateReviewSlug(kind, dateLabel.value, title.value);
}

watch(preview, (value) => {
  router.replace({ query: { ...route.query, preview: value ? "1" : undefined } });
});

async function save() {
  error.value = "";
  const targetSlug = slug || generateSlug();
  if (!targetSlug) {
    error.value = kind === "weekly"
      ? "无法生成编号：请在日期标签填写日期（如 2026年8月10日-14日）或周号（2026-W33），或在标题中注明“2026年第33周”"
      : "无法生成编号：请在日期标签填写日期，如 2026年8月14日（周五）或 2026-08-14";
    await focusError();
    return;
  }
  if (!title.value.trim()) {
    error.value = "标题不能为空，请填写标题后重试";
    await focusError();
    return;
  }
  if (!content.value.trim()) {
    error.value = "内容不能为空，请填写复盘内容后重试";
    await focusError();
    return;
  }

  saving.value = true;
  try {
    const result = await saveResearchReview(kind, targetSlug, {
      title: title.value,
      dateLabel: dateLabel.value,
      content: content.value,
      version: version.value,
    });
    initialSnapshot.value = editorSnapshot();
    router.push(`/report/${kind}/${result.slug}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "保存失败";
    error.value = `${msg}，请检查内容后重试`;
    await focusError();
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!slug || !confirm("确认删除这份复盘？")) return;
  try {
    await deleteResearchReview(kind, slug);
    initialSnapshot.value = editorSnapshot();
    router.push(`/research/${kind}`);
  } catch {
    error.value = "删除失败，请稍后重试";
    await focusError();
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onMounted(() => window.addEventListener("beforeunload", warnBeforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnBeforeUnload));
onBeforeRouteLeave(() => !dirty.value || window.confirm("复盘还有未保存的修改，确定离开吗？"));

useSeoMeta({
  title: () => `${isEdit ? "编辑" : "新建"}${kind === "weekly" ? "周复盘" : "日复盘"} · 市场日记`,
});
</script>

<template>
  <AppShell module="research" :title="`${isEdit ? '编辑' : '新建'}${kind === 'weekly' ? '周复盘' : '日复盘'}`">
    <template #actions>
      <NuxtLink class="secondary-link" :to="`/research/${kind}`">返回列表</NuxtLink>
    </template>

    <section class="review-editor panel">
      <div v-if="loading" class="loading-state" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true" />
        <p>正在载入复盘…</p>
      </div>
      <template v-else>
      <div class="editor-fields">
        <div class="field-row">
          <label>
            <span>标题</span>
            <input v-model="title" name="title" type="text" autocomplete="off" placeholder="例：2026年第33周 市场周报…">
          </label>
        </div>
        <div class="field-row">
          <label>
            <span>日期标签</span>
            <input v-model="dateLabel" name="dateLabel" type="text" autocomplete="off" :placeholder="kind === 'weekly' ? '例：2026年8月10日-14日 或 2026-W33…' : '例：2026年8月14日（周五）或 2026-08-14…'">
          </label>
          <label>
            <span>编号 (slug)</span>
            <input :value="slug || generateSlug()" name="slug" type="text" disabled :placeholder="kind === 'weekly' ? '例：2026-W33…' : '例：2026-08-14…'">
          </label>
        </div>
      </div>

      <div class="editor-toolbar">
        <button type="button" :class="{ active: !preview }" :aria-pressed="!preview" @click="preview = false">编辑</button>
        <button type="button" :class="{ active: preview }" :aria-pressed="preview" @click="preview = true">预览</button>
      </div>

      <div v-if="!preview" class="editor-pane">
        <label class="sr-only" for="review-content">复盘内容</label>
        <textarea id="review-content" v-model="content" name="content" class="editor-textarea" autocomplete="off" placeholder="例：粘贴或输入 Markdown 内容…" />
      </div>
      <div v-else class="editor-pane preview-pane">
        <MarkdownDocument :markdown="content" />
      </div>

      <div v-if="error" ref="errorElement" class="editor-error" role="alert" aria-live="polite" tabindex="-1">{{ error }}</div>

      <div class="editor-actions">
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? "保存中…" : "保存" }}
        </button>
        <button v-if="isEdit" type="button" class="btn-danger" @click="remove">删除</button>
      </div>
      </template>
    </section>
  </AppShell>
</template>
