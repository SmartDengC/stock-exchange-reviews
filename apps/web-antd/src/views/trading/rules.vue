<script lang="ts" setup>
import type { TradingRule, TradingRuleInput } from '#/shared/types/trading';

import { computed, onMounted, reactive, ref } from 'vue';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  createTradingRule,
  deleteTradingRule,
  listTradingRules,
  updateTradingRule,
} from '#/api';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage } from '#/lib/trading';

const rules = ref<TradingRule[]>([]);
const loading = ref(true);
const failure = ref('');
const status = ref('');
const statusTone = ref<'error' | 'success'>('success');

// 筛选
const query = ref('');
const statusFilter = ref<'' | 'active' | 'inactive'>('');

const filteredRules = computed(() => {
  let items = rules.value;
  if (query.value) {
    const q = query.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }
  if (statusFilter.value === 'active') {
    items = items.filter((item) => item.active);
  } else if (statusFilter.value === 'inactive') {
    items = items.filter((item) => !item.active);
  }
  return items;
});

// 详情查看
const detailRule = ref<null | TradingRule>(null);

function openDetail(rule: TradingRule) {
  detailRule.value = rule;
}

function closeDetail() {
  detailRule.value = null;
}

// 新建 / 编辑
const modalOpen = ref(false);
const editing = ref<null | TradingRule>(null);
const saving = ref(false);
const form = reactive<TradingRuleInput>({
  title: '',
  description: '',
  sortOrder: 0,
  active: true,
});

function openCreate() {
  editing.value = null;
  form.title = '';
  form.description = '';
  form.sortOrder = rules.value.length + 1;
  form.active = true;
  modalOpen.value = true;
}

function openEdit(rule: TradingRule) {
  editing.value = rule;
  form.title = rule.title;
  form.description = rule.description;
  form.sortOrder = rule.sortOrder;
  form.active = rule.active;
  modalOpen.value = true;
}

async function save() {
  const title = form.title.trim();
  if (!title) {
    status.value = '请输入规则标题。';
    statusTone.value = 'error';
    return;
  }
  saving.value = true;
  status.value = '';
  const editingId = editing.value?.id;
  try {
    if (editing.value) {
      await updateTradingRule(editing.value.id, {
        ...form,
        title,
        version: editing.value.version,
      });
      status.value = '规则已更新。';
    } else {
      await createTradingRule({ ...form, title });
      status.value = '规则已新增。';
    }
    statusTone.value = 'success';
    modalOpen.value = false;
    await load();
    if (editingId) {
      detailRule.value = rules.value.find((rule) => rule.id === editingId) ?? null;
    }
  } catch (error) {
    status.value = errorMessage(error);
    statusTone.value = 'error';
  } finally {
    saving.value = false;
  }
}

function remove(rule: TradingRule) {
  Modal.confirm({
    title: '删除规则',
    content: `确定删除"${rule.title}"吗？此操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteTradingRule(rule.id, rule.version);
        status.value = '规则已删除。';
        statusTone.value = 'success';
        if (detailRule.value?.id === rule.id) closeDetail();
        await load();
      } catch (error) {
        status.value = errorMessage(error);
        statusTone.value = 'error';
      }
    },
  });
}

function clearFilters() {
  query.value = '';
  statusFilter.value = '';
}

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    rules.value = await listTradingRules();
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <PageFrame
    kicker="TRADING DISCIPLINE"
    title="交易规则"
    subtitle="把纪律放在观点之前，每笔交易前必读。"
  >
    <template #actions>
      <Button type="primary" @click="openCreate"><PlusOutlined />新建规则</Button>
    </template>

    <Alert
      v-if="status"
      :type="statusTone"
      show-icon
      :message="status"
      style="margin-bottom: 1rem;"
    />

    <section class="market-panel ledger-filters">
      <Input
        v-model:value="query"
        allow-clear
        placeholder="搜索标题或描述"
        aria-label="搜索标题或描述"
      />
      <Select
        v-model:value="statusFilter"
        :options="[
          { label: '全部状态', value: '' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
        ]"
      />
      <Button v-if="query || statusFilter" @click="clearFilters">清除筛选</Button>
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert
      v-else-if="failure"
      type="error"
      show-icon
      :message="failure"
    >
      <template #extra><Button @click="load">重试</Button></template>
    </Alert>
    <section v-else class="market-panel ledger-panel">
      <div class="ledger-summary">
        <strong>{{ filteredRules.length }}</strong><span>条规则</span>
      </div>
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>序号</th><th>标题</th><th>描述</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in filteredRules" :key="rule.id" class="rule-row" @click="openDetail(rule)">
              <td>{{ rule.sortOrder }}</td>
              <td>
                <button type="button" class="table-link rule-select" @click.stop="openDetail(rule)">
                  <strong>{{ rule.title }}</strong>
                </button>
              </td>
              <td class="rule-description-cell">
                <button type="button" class="table-link rule-description-full" @click.stop="openDetail(rule)">
                  {{ rule.description }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty
        v-if="filteredRules.length === 0"
        description="没有匹配的交易规则"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </section>

    <!-- 右侧详情 -->
    <Drawer
      :open="Boolean(detailRule)"
      placement="right"
      width="min(36rem, 92vw)"
      :destroy-on-close="true"
      class="rules-detail-drawer"
      @close="closeDetail"
    >
      <template v-if="detailRule" #title>
        <div class="detail-title">
          <span>TRADING RULE</span>
          <strong>{{ detailRule.title }}</strong>
        </div>
      </template>
      <template v-if="detailRule" #extra>
        <div class="rules-detail-actions">
          <Button type="primary" @click="openEdit(detailRule)">
            <EditOutlined />编辑
          </Button>
          <Button danger @click="remove(detailRule)">
            <DeleteOutlined />删除
          </Button>
        </div>
      </template>
      <div v-if="detailRule" class="rule-detail">
        <section class="market-panel rule-detail-content">
          <div class="page-kicker">DISCIPLINE NOTE</div>
          <p class="rule-detail-desc">{{ detailRule.description || '暂无规则描述。' }}</p>
          <div class="rule-detail-meta">
            <Tag>序号 {{ detailRule.sortOrder }}</Tag>
            <Tag :color="detailRule.active ? 'green' : 'red'">
              {{ detailRule.active ? '启用' : '停用' }}
            </Tag>
          </div>
        </section>
        <Alert
          type="info"
          show-icon
          message="把纪律放在观点之前"
          description="每笔交易前复读这条规则，确认当前决策符合自己的交易纪律。"
        />
      </div>
    </Drawer>

    <!-- 新建/编辑弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑规则' : '新建规则'"
      :confirm-loading="saving"
      @ok="save"
    >
      <Form layout="vertical">
        <FormItem label="标题">
          <Input
            v-model:value="form.title"
            placeholder="例：不教人投资"
            @press-enter="save"
          />
        </FormItem>
        <FormItem label="描述">
          <Input.TextArea
            v-model:value="form.description"
            :rows="4"
            placeholder="规则的详细说明"
          />
        </FormItem>
        <FormItem label="排序">
          <InputNumber v-model:value="form.sortOrder" :min="0" style="width: 100%;" />
        </FormItem>
        <FormItem label="状态">
          <Switch v-model:checked="form.active" />
        </FormItem>
      </Form>
    </Modal>
  </PageFrame>
</template>

<style scoped>
.rule-description-cell {
  max-width: 24rem;
}
.rule-description-full {
  display: block;
  max-width: 24rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: normal;
  width: 100%;
}
.rule-select:focus-visible,
.rule-description-full:focus-visible {
  outline: 2px solid var(--md-accent);
  outline-offset: 3px;
}
.rules-detail-actions {
  display: flex;
  gap: 0.5rem;
}
.rule-detail {
  display: grid;
  gap: 1rem;
}
.rule-detail-content {
  margin: 0;
}
.rule-detail-desc {
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 1rem;
}
.rule-detail-meta {
  display: flex;
  gap: 0.5rem;
}
</style>
