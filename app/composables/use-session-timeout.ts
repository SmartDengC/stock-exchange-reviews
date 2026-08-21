/**
 * Session 超时检测 composable
 * 
 * 功能:
 * - 记录用户登录时间
 * - 每 5 分钟检查一次是否超过预警阈值
 * - 超过阈值时触发回调
 * 
 * 使用示例:
 * ```ts
 * const sessionTimeout = useSessionTimeout(() => {
 *   // 超时处理逻辑
 * });
 * 
 * onMounted(() => sessionTimeout.init());
 * onUnmounted(() => sessionTimeout.stop());
 * ```
 */

export function useSessionTimeout(onTimeout: () => void) {
  const SESSION_DURATION = 60 * 60 * 1000; // 1 小时
  const WARNING_THRESHOLD = 55 * 60 * 1000; // 55 分钟预警
  const CHECK_INTERVAL = 5 * 60 * 1000; // 每 5 分钟检查一次

  const loginTime = ref<number | null>(null);
  const timer = ref<NodeJS.Timeout | null>(null);

  function init() {
    // 从 localStorage 读取登录时间，如果不存在则设置为当前时间
    const stored = localStorage.getItem("session_login_time");
    loginTime.value = stored ? parseInt(stored, 10) : Date.now();
    localStorage.setItem("session_login_time", String(loginTime.value));

    startCheck();
  }

  function startCheck() {
    // 立即检查一次
    checkTimeout();

    // 设置定时器定期检查
    timer.value = setInterval(checkTimeout, CHECK_INTERVAL);
  }

  function checkTimeout() {
    if (!loginTime.value) return;

    const elapsed = Date.now() - loginTime.value;

    // 超过预警阈值，触发回调
    if (elapsed >= WARNING_THRESHOLD) {
      onTimeout();
      stop();
    }
  }

  function reset() {
    loginTime.value = Date.now();
    localStorage.setItem("session_login_time", String(loginTime.value));
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  }

  return { init, reset, stop };
}
