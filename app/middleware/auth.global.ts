export default defineNuxtRouteMiddleware((to) => {
  if (to.path === "/login") return;
  
  const { loggedIn, fetch } = useUserSession();
  fetch().catch(() => undefined);
  
  if (!loggedIn.value) {
    return navigateTo({
      path: "/login",
      query: { returnTo: to.fullPath },
    });
  }
});
