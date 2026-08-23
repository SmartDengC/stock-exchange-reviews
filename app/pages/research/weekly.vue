<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const searchQuery = ref(typeof route.query.q === "string" ? route.query.q : "");
const dateFrom = ref(typeof route.query.dateFrom === "string" ? route.query.dateFrom : "");
const dateTo = ref(typeof route.query.dateTo === "string" ? route.query.dateTo : "");

const filters = computed(() => ({
  kind: "weekly" as const,
  q: searchQuery.value || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
}));

const { data: reviews, status } = useResearchReviewList(filters);

function syncUrl() {
  const query: Record<string, string> = {};
  if (searchQuery.value) query.q = searchQuery.value;
  if (dateFrom.value) query.dateFrom = dateFrom.value;
  if (dateTo.value) query.dateTo = dateTo.value;
  router.replace({ query });
}

function clearFilters() {
  searchQuery.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  syncUrl();
}

useSeoMeta({
  title: "周复盘归档 · 市场日记",
  description: "所有周度市场复盘归档，支持按日期和关键词筛选。",
});
</script>

<template>
  <AppShell module="research" title="周复盘归档" :subtitle="`${reviews?.length ?? 0} 篇周度研究`">
    <template #actions>
      <NuxtLink class="secondary-link" to="/research/edit/weekly">新建周复盘</NuxtLink>
    </template>

    <section class="research-filter-bar panel">
      <div class="filter-row">
        <input v-model="searchQuery" name="q" type="search" placeholder="例：流动性…" class="filter-input" aria-label="搜索标题或内容" autocomplete="off" @input="syncUrl">
        <input v-model="dateFrom" name="dateFrom" type="date" class="filter-date" aria-label="开始日期" autocomplete="off" @change="syncUrl">
        <span class="filter-sep">—</span>
        <input v-model="dateTo" name="dateTo" type="date" class="filter-date" aria-label="结束日期" autocomplete="off" @change="syncUrl">
        <button v-if="searchQuery || dateFrom || dateTo" type="button" class="filter-clear" @click="clearFilters">清除</button>
      </div>
    </section>

    <section class="research-archive-page panel">
      <div v-if="status === 'pending'" class="loading-state" role="status" aria-live="polite">加载中…</div>
      <div v-else-if="reviews?.length" class="research-archive-grid">
        <NuxtLink
          v-for="item in reviews"
          :key="item.id"
          :to="`/report/weekly/${item.slug}`"
        >
          <span>{{ item.slug }}</span>
          <b>{{ item.title.replace(/^\d{4}年第\d+周\s*/, "") }}</b>
          <small>{{ item.dateLabel }}</small>
        </NuxtLink>
      </div>
      <p v-else class="empty-copy">暂无周复盘数据</p>
    </section>
  </AppShell>
</template>
