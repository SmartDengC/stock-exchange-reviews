import { Button, Tag, Tooltip } from "@arco-design/web-vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Button);
  nuxtApp.vueApp.use(Tag);
  nuxtApp.vueApp.use(Tooltip);
});
