<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const searchQuery = ref(typeof route.query.q === "string" ? route.query.q : "");
const dateFrom = ref(typeof route.query.dateFrom === "string" ? route.query.dateFrom : "");
const dateTo = ref(typeof route.query.dateTo === "string" ? route.query.dateTo : "");

const filters = computed(() => ({
  kind: "daily" as const,
  q: searchQuery.value || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
}));

const { data: reviews, status, refresh } = useResearchReviewList(filters);

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
  title: "日复盘归档 · 市场日记",
  description: "所有日度市场复盘归档，支持按日期和关键词筛选。",
});
</script>

<template>
  <AppShell module="research" title="日复盘归档" :subtitle="`${reviews?.length ?? 0} 篇日度研究`">
    <template #actions>
      <NuxtLink class="secondary-link" to="/research/edit/daily">新建日复盘</NuxtLink>
    </template>

    <section class="research-filter-bar panel">
      <div class="filter-row">
        <input v-model="searchQuery" type="text" placeholder="搜索标题或内容..." class="filter-input" @input="syncUrl">
        <input v-model="dateFrom" type="date" class="filter-date" @change="syncUrl">
        <span class="filter-sep">—</span>
        <input v-model="dateTo" type="date" class="filter-date" @change="syncUrl">
        <button v-if="searchQuery || dateFrom || dateTo" type="button" class="filter-clear" @click="clearFilters">清除</button>
      </div>
    </section>

    <section class="research-archive-page panel">
      <div v-if="status === 'pending'" class="loading-state">加载中...</div>
      <div v-else-if="reviews?.length" class="research-archive-grid daily">
        <NuxtLink
          v-for="item in reviews"
          :key="item.id"
          :to="`/report/daily/${item.slug}`"
        >
          <span>{{ item.slug }}</span>
          <b>{{ item.title.replace(/^\d{4}年/, "") }}</b>
          <small>{{ item.dateLabel }}</small>
        </NuxtLink>
      </div>
      <p v-else class="empty-copy">暂无日复盘数据</p>
    </section>
  </AppShell>
</template>
