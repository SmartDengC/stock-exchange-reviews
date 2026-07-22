<script setup lang="ts">
import { parseMarkdownBlocks } from "~/lib/markdown";

const props = defineProps<{ markdown: string }>();
const blocks = computed(() => parseMarkdownBlocks(props.markdown));

function headingTag(level: number) {
  return `h${Math.min(level + 1, 5)}`;
}

function cellTone(value: string, cellIndex: number) {
  if (cellIndex === 0) return "";
  if (/[-−]|跌/.test(value)) return "tone-negative";
  if (/\+|涨/.test(value)) return "tone-positive";
  return "tone-neutral";
}
</script>

<template>
  <article class="markdown-document">
    <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
      <pre v-if="block.kind === 'code'" class="report-code">{{ block.content }}</pre>

      <div v-else-if="block.kind === 'table'" class="report-table-wrap">
        <table class="report-table">
          <thead v-if="block.table.headers.length">
            <tr><th v-for="header in block.table.headers" :key="header">{{ header }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.table.rows" :key="`${row[0]}-${rowIndex}`">
              <td v-for="(value, cellIndex) in row" :key="cellIndex" :class="cellTone(value, cellIndex)">
                <InlineText :text="value" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <component
        :is="headingTag(block.level)"
        v-else-if="block.kind === 'heading'"
        :class="`report-h report-h-${block.level}`"
      >
        <InlineText :text="block.content" />
      </component>

      <blockquote v-else-if="block.kind === 'quote'"><InlineText :text="block.content" /></blockquote>

      <ul v-else-if="block.kind === 'list'">
        <li v-for="item in block.items" :key="item"><InlineText :text="item" /></li>
      </ul>

      <p v-else><InlineText :text="block.content" /></p>
    </template>
  </article>
</template>
