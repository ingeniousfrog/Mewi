import { useCallback, useState } from "react";
import type { PermissionStatus } from "../pet/onboarding";
import { markOnboardingComplete } from "../pet/onboarding";

type OnboardingOverlayProps = Readonly<{
  onRequestDesktopAccess: () => Promise<PermissionStatus>;
  onRequestInputAccess: () => Promise<PermissionStatus>;
  onComplete: () => void;
}>;

export function OnboardingOverlay({
  onRequestDesktopAccess,
  onRequestInputAccess,
  onComplete,
}: OnboardingOverlayProps) {
  const [status, setStatus] = useState<PermissionStatus>({
    desktop: false,
    input: false,
    desktopItemCount: 0,
  });
  const [busy, setBusy] = useState<"desktop" | "input" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async (request: () => Promise<PermissionStatus>) => {
    const nextStatus = await request();
    setStatus(nextStatus);
    setMessage(nextStatus.message ?? null);
    return nextStatus;
  }, []);

  const handleDesktopAllow = useCallback(async () => {
    setBusy("desktop");
    try {
      await refreshStatus(onRequestDesktopAccess);
    } finally {
      setBusy(null);
    }
  }, [onRequestDesktopAccess, refreshStatus]);

  const handleInputAllow = useCallback(async () => {
    setBusy("input");
    try {
      await refreshStatus(onRequestInputAccess);
    } finally {
      setBusy(null);
    }
  }, [onRequestInputAccess, refreshStatus]);

  const handleContinue = useCallback(() => {
    markOnboardingComplete();
    onComplete();
  }, [onComplete]);

  return (
    <div className="onboardingOverlay" role="dialog" aria-modal="true" aria-label="Welcome to Mewi">
      <div className="onboardingCard">
        <p className="onboardingEyebrow">Welcome</p>
        <h1 className="onboardingTitle">让 Mewi 活起来</h1>
        <p className="onboardingCopy">
          点 Allow 后，macOS 会弹出系统授权框。请选择允许；如果没看到弹窗，请看下方提示。
        </p>

        <div className="onboardingActions">
          <button
            className="onboardingButton"
            type="button"
            disabled={busy !== null}
            onClick={() => void handleDesktopAllow()}
          >
            {busy === "desktop" ? "等待授权…" : status.desktop ? "桌面探索已开启" : "Allow 桌面探索"}
          </button>
          <p className="onboardingHint">
            {status.desktop
              ? `已看到 ${status.desktopItemCount} 个桌面文件夹/图片，Mewi 会去嗅嗅它们。`
              : "允许后，小猫会走向桌面文件夹和图片。"}
          </p>

          <button
            className="onboardingButton onboardingButton-secondary"
            type="button"
            disabled={busy !== null}
            onClick={() => void handleInputAllow()}
          >
            {busy === "input" ? "等待授权…" : status.input ? "打字/点击镜像已开启" : "Allow 打字和点击镜像"}
          </button>
          <p className="onboardingHint">
            {status.input
              ? "你打字时 Mewi 也会敲键盘，你点鼠标时它会敲架子鼓。"
              : "允许辅助功能后，Mewi 能跟着你一起敲键盘和打鼓。"}
          </p>
        </div>

        {message ? <p className="onboardingMessage">{message}</p> : null}

        <div className="onboardingFooter">
          <button className="onboardingContinue" type="button" onClick={handleContinue}>
            {status.desktop || status.input ? "开始养猫" : "稍后再说，先开始"}
          </button>
        </div>
      </div>
    </div>
  );
}
