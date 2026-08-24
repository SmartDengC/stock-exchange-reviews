import type { GenerateMenuAndRoutesOptions } from '@vben/types';

import { generateAccessible } from '@vben/access';

const forbiddenComponent = () =>
  import('#/views/_core/fallback/forbidden.vue');

function generateAccess(options: GenerateMenuAndRoutesOptions) {
  return generateAccessible('frontend', {
    ...options,
    forbiddenComponent,
  });
}

export { generateAccess };
