const READY_MS = 4000;
let audio: AudioContext | null = null;

export function armBeep(): void {
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audio) audio = new AudioCtx();
  void audio.resume();
}

export function requestNotifyPermission(): void {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  void Notification.requestPermission().catch(() => undefined);
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), READY_MS)),
  ]);
}

export async function scheduleRestAlert(endAt: number): Promise<void> {
  const registration = await readyRegistration();
  registration?.active?.postMessage({ type: "rest-timer", action: "start", endAt });
}

export async function cancelRestAlert(): Promise<void> {
  const registration = await readyRegistration();
  registration?.active?.postMessage({ type: "rest-timer", action: "cancel" });
}

export async function finishRestAlert(): Promise<void> {
  const canNotify = "Notification" in window && Notification.permission === "granted";
  if (!canNotify) {
    beep();
    vibrate();
    return;
  }
  vibrate();
  try {
    const registration = await readyRegistration();
    if (!registration) {
      beep();
      return;
    }
    await registration.showNotification("Rest finished", {
      body: "Time for the next set.",
      tag: "workout-rest",
      vibrate: [200, 100, 200, 100, 200],
    } as NotificationOptions);
  } catch {
    beep();
  }
}

function vibrate(): void {
  navigator.vibrate?.([200, 100, 200, 100, 200]);
}

function beep(): void {
  if (!audio) armBeep();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.36);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
