<script lang="ts" setup>
import type {
  TradingOption,
  TradingOptionKind,
  TradingOptionsResponse,
} from '#/shared/types/trading';

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
} from 'ant-design-vue';

import {
  deleteTradingOption,
  getTradingOptions,
  updateTradingOption,
  updateTradingOptions,
} from '#/api';
import PageFrame from '#/components/page-frame.vue';
import { errorMessage } from '#/lib/trading';

const kindLabels: Record<TradingOptionKind, string> = {
  emotion: '情绪',
  error_tag: '错误标签',
  instrument_code: '证券代码',
  strategy: '策略',
  symbol: '标的',
  timeframe: '周期',
};
const kindOptions = Object.entries(kindLabels).map(([value, label]) => ({ label, value }));
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const data = ref<null | TradingOptionsResponse>(null);
const loading = ref(true);
const failure = ref('');
const activeAction = ref('');  // 当前正在执行操作的选项 ID（用于显示 loading 状态）
const deletingOptionId = ref('');  // 正在删除的选项 ID（用于显示 loading 状态）
const status = ref('');
const statusTone = ref<'error' | 'success'>('success');

// 筛选
const query = ref('');
const kindFilter = ref<TradingOptionKind | ''>('instrument_code');
const statusFilter = ref<'' | 'active' | 'inactive'>('');

const filteredOptions = computed(() => {
  let items = data.value?.options ?? [];
  if (query.value) {
    const q = query.value.toLowerCase();
    items = items.filter((item) => item.label.toLowerCase().includes(q));
  }
  if (kindFilter.value) {
    items = items.filter((item) => item.kind === kindFilter.value);
  }
  if (statusFilter.value === 'active') {
    items = items.filter((item) => item.active);
  } else if (statusFilter.value === 'inactive') {
    items = items.filter((item) => !item.active);
  }
  return items;
});

// 新建 / 编辑弹窗
const modalOpen = ref(false);
const editing = ref<TradingOption | null>(null);
const form = reactive<{ kind: TradingOptionKind; label: string; sortOrder: number }>({
  kind: 'strategy',
  label: '',
  sortOrder: 0,
});
const saving = ref(false);

function openCreate() {
  editing.value = null;
  form.kind = 'strategy';
  form.label = '';
  form.sortOrder = data.value?.options.length ?? 0;
  modalOpen.value = true;
}

function openEdit(item: TradingOption) {
  editing.value = item;
  form.kind = item.kind;
  form.label = item.label;
  form.sortOrder = item.sortOrder;
  modalOpen.value = true;
}

async function saveOption() {
  const label = form.label.trim();
  if (!label) {
    status.value = '请输入字段名称。';
    statusTone.value = 'error';
    return;
  }
  saving.value = true;
  status.value = '';
  try {
    // 编辑模式：使用 updateTradingOption 按 ID 更新单个选项
    if (editing.value) {
      await updateTradingOption(editing.value.id, {
        active: editing.value.active,
        kind: form.kind,
        label,
        sortOrder: form.sortOrder,
      });
    } else {
      // 新建模式：使用 updateTradingOptions 批量创建选项
      await updateTradingOptions({
        options: [
          {
            active: true,
            kind: form.kind,
            label,
            sortOrder: form.sortOrder,
          },
        ],
      });
    }
    modalOpen.value = false;
    status.value = editing.value ? '字段已更新。' : '字段已新增。';
    statusTone.value = 'success';
    await load();
  } catch (error) {
    status.value = errorMessage(error);
    statusTone.value = 'error';
  } finally {
    saving.value = false;
  }
}

/**
 * 切换选项启用/停用状态
 * 使用 updateTradingOption 按 ID 更新单个选项的 active 状态
 * @param item 待切换的选项
 */
function toggleOption(item: TradingOption) {
  if (activeAction.value) return;
  activeAction.value = item.id;
  status.value = '';
  updateTradingOption(item.id, {
    active: !item.active,
    kind: item.kind,
    label: item.label,
    sortOrder: item.sortOrder,
  })
    .then(async () => {
      status.value = `${item.label}已${item.active ? '停用' : '启用'}。`;
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

/**
 * 删除交易选项
 * 弹出确认对话框，确认后调用 API 删除选项
 * @param item 待删除的选项
 * @note 删除后重新加载选项列表
 */
function removeOption(item: TradingOption) {
  Modal.confirm({
    title: '删除录入字段',
    content: `确定删除"${item.label}"吗？此操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      deletingOptionId.value = item.id;  // 设置删除中状态，显示 loading
      status.value = '';
      try {
        data.value = await deleteTradingOption(item.id);
        status.value = '字段已删除。';
        statusTone.value = 'success';
      } catch (error) {
        status.value = errorMessage(error);
        statusTone.value = 'error';
      } finally {
        deletingOptionId.value = '';  // 清除删除中状态
      }
    },
  });
}

function clearFilters() {
  query.value = '';
  kindFilter.value = '';
  statusFilter.value = '';
}

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    data.value = await getTradingOptions();
  } catch (error) {
    failure.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <PageFrame kicker="INPUT OPTIONS" title="录入字段" subtitle="维护交易录入时使用的下拉选项，支持按分类和状态筛选。">
    <template #actions>
      <Button type="primary" @click="openCreate"><PlusOutlined />新建字段</Button>
    </template>

    <Alert v-if="status" :type="statusTone" show-icon :message="status" style="margin-bottom: 1rem;" />

    <section class="market-panel ledger-filters">
      <Input v-model:value="query" allow-clear placeholder="搜索字段名称" aria-label="搜索字段名称" />
      <Select v-model:value="kindFilter" :options="[{ label: '全部分类', value: '' }, ...kindOptions]" />
      <Select v-model:value="statusFilter" :options="statusOptions" />
      <Button v-if="query || kindFilter || statusFilter" @click="clearFilters">清除筛选</Button>
    </section>

    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <Alert v-else-if="failure" type="error" show-icon :message="failure">
      <template #extra><Button @click="load">重试</Button></template>
    </Alert>
    <section v-else class="market-panel ledger-panel">
      <div class="ledger-summary"><strong>{{ filteredOptions.length }}</strong><span>个字段</span></div>
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>字段分类</th><th>字段名称</th><th>排序</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredOptions" :key="item.id">
              <td>{{ kindLabels[item.kind] }}</td>
              <td><strong>{{ item.label }}</strong></td>
              <td>{{ item.sortOrder }}</td>
              <td><Switch :checked="item.active" :loading="activeAction === item.id" @change="toggleOption(item)" /></td>
              <td>
                <Button size="small" @click="openEdit(item)">编辑</Button>
                <Button
                  danger
                  size="small"
                  :loading="deletingOptionId === item.id"
                  style="margin-left: 0.5rem;"
                  @click="removeOption(item)"
                >
                  删除
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-if="filteredOptions.length === 0" description="没有匹配的录入字段" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </section>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑字段' : '新建字段'"
      :confirm-loading="saving"
      @ok="saveOption"
    >
      <Form layout="vertical">
        <FormItem label="字段分类">
          <Select v-model:value="form.kind" :options="kindOptions" />
        </FormItem>
        <FormItem label="字段名称">
          <Input v-model:value="form.label" placeholder="例：趋势突破" @press-enter="saveOption" />
        </FormItem>
        <FormItem label="排序">
          <InputNumber v-model:value="form.sortOrder" :min="0" style="width: 100%;" />
        </FormItem>
      </Form>
    </Modal>
  </PageFrame>
</template>
