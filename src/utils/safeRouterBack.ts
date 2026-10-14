type RouterLike = {
  back: () => void;
  replace: (href: any) => void;
  canGoBack?: () => boolean;
};

export function safeRouterBack(router: RouterLike, fallback: any) {
  try {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // If the navigator cannot answer, use the stable fallback route below.
  }
  router.replace(fallback);
}
