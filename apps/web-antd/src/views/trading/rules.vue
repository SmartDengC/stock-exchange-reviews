<script lang="ts" setup>
import type { TradingRule, TradingRuleInput } from '#/shared/types/trading';

import { computed, onMounted, reactive, ref } from 'vue';

import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
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
const activeAction = ref('');
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
const detailOpen = ref(false);
const detailRule = ref<TradingRule | null>(null);

function openDetail(rule: TradingRule) {
  detailRule.value = rule;
  detailOpen.value = true;
}

// 新建 / 编辑
const modalOpen = ref(false);
const editing = ref<TradingRule | null>(null);
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
  } catch (error) {
    status.value = errorMessage(error);
    statusTone.value = 'error';
  } finally {
    saving.value = false;
  }
}

function toggleActive(rule: TradingRule) {
  if (activeAction.value) return;
  activeAction.value = rule.id;
  updateTradingRule(rule.id, {
    title: rule.title,
    description: rule.description,
    sortOrder: rule.sortOrder,
    active: !rule.active,
    version: rule.version,
  })
    .then(async () => {
      status.value = `${rule.title}已${rule.active ? '停用' : '启用'}。`;
      statusTone.value = 'success';
      await load();
    })
    .catch((error) => {
      status.value = errorMessage(error);
      statusTone.value = 'error';
    })
    .finally(() => {
      activeAction.value = '';
    });
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
              <th>序号</th><th>标题</th><th>描述</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in filteredRules" :key="rule.id">
              <td>{{ rule.sortOrder }}</td>
              <td>
                <strong>{{ rule.title }}</strong>
              </td>
              <td class="rule-desc">{{ rule.description }}</td>
              <td>
                <Switch
                  :checked="rule.active"
                  :loading="activeAction === rule.id"
                  @change="toggleActive(rule)"
                />
              </td>
              <td>
                <Button size="small" @click="openDetail(rule)">查看</Button>
                <Button size="small" @click="openEdit(rule)">编辑</Button>
                <Button size="small" danger @click="remove(rule)">删除</Button>
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

    <!-- 详情弹窗 -->
    <Modal
      v-model:open="detailOpen"
      :title="detailRule?.title"
      :footer="null"
    >
      <div v-if="detailRule">
        <p class="rule-detail-desc">{{ detailRule.description }}</p>
        <div class="rule-detail-meta">
          <Tag>序号 {{ detailRule.sortOrder }}</Tag>
          <Tag :color="detailRule.active ? 'green' : 'red'">
            {{ detailRule.active ? '启用' : '停用' }}
          </Tag>
        </div>
      </div>
    </Modal>

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
.rule-desc {
  max-width: 24rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
