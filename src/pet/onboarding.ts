export type PermissionStatus = Readonly<{
  desktop: boolean;
  input: boolean;
  desktopItemCount: number;
  message?: string;
}>;

export const ONBOARDING_STORAGE_KEY = "mewi.onboarding.v1.complete";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
}

export function markOnboardingComplete(): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch (error) {
    console.error("Unable to store Mewi onboarding state", error);
  }
}
