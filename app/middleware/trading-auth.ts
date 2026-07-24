export default defineNuxtRouteMiddleware(async (to) => {
  const { fetch, loggedIn } = useUserSession();
  await fetch().catch(() => undefined);
  if (!loggedIn.value) {
    return navigateTo({
      path: "/trading/login",
      query: { returnTo: to.fullPath },
    });
  }
});
