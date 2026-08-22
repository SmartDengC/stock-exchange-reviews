<script setup lang="ts">
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
const preview = ref(false);

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
  }
  loading.value = false;
}, { immediate: true });

function generateSlug(): string {
  return generateReviewSlug(kind, dateLabel.value, title.value);
}

async function save() {
  error.value = "";
  const targetSlug = slug || generateSlug();
  if (!targetSlug) {
    error.value = kind === "weekly"
      ? "无法生成编号：请在日期标签填写日期（如 2026年8月10日-14日）或周号（2026-W33），或在标题中注明“2026年第33周”"
      : "无法生成编号：请在日期标签填写日期，如 2026年8月14日（周五）或 2026-08-14";
    return;
  }
  if (!title.value.trim()) {
    error.value = "标题不能为空";
    return;
  }
  if (!content.value.trim()) {
    error.value = "内容不能为空";
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
    router.push(`/report/${kind}/${result.slug}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "保存失败";
    error.value = msg;
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!slug || !confirm("确认删除这份复盘？")) return;
  try {
    await deleteResearchReview(kind, slug);
    router.push(`/research/${kind}`);
  } catch {
    error.value = "删除失败";
  }
}

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
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>正在载入复盘…</p>
      </div>
      <template v-else>
      <div class="editor-fields">
        <div class="field-row">
          <label>
            <span>标题</span>
            <input v-model="title" type="text" placeholder="例：2026年第33周 市场周报">
          </label>
        </div>
        <div class="field-row">
          <label>
            <span>日期标签</span>
            <input v-model="dateLabel" type="text" :placeholder="kind === 'weekly' ? '例：2026年8月10日-14日 或 2026-W33' : '例：2026年8月14日（周五）或 2026-08-14'">
          </label>
          <label>
            <span>编号 (slug)</span>
            <input :value="slug || generateSlug()" type="text" disabled :placeholder="kind === 'weekly' ? '例：2026-W33' : '例：2026-08-14'">
          </label>
        </div>
      </div>

      <div class="editor-toolbar">
        <button type="button" :class="{ active: !preview }" @click="preview = false">编辑</button>
        <button type="button" :class="{ active: preview }" @click="preview = true">预览</button>
      </div>

      <div v-if="!preview" class="editor-pane">
        <textarea v-model="content" class="editor-textarea" placeholder="粘贴或输入 Markdown 内容..." />
      </div>
      <div v-else class="editor-pane preview-pane">
        <MarkdownDocument :markdown="content" />
      </div>

      <div v-if="error" class="editor-error">{{ error }}</div>

      <div class="editor-actions">
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? "保存中..." : "保存" }}
        </button>
        <button v-if="isEdit" type="button" class="btn-danger" @click="remove">删除</button>
      </div>
      </template>
    </section>
  </AppShell>
</template>
