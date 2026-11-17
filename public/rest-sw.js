/* Rest timer alerts. The page sends the end timestamp; this worker waits and notifies. */
let restGeneration = 0;

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "rest-timer") return;

  const generation = ++restGeneration;
  if (data.action === "cancel") return;

  const endAt = data.endAt;
  if (typeof endAt !== "number") return;

  event.waitUntil(
    (async () => {
      const delay = endAt - Date.now();
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      if (generation !== restGeneration) return;
      await self.registration.showNotification("Rest finished", {
        body: "Time for the next set.",
        tag: "workout-rest",
        renotify: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const scope = self.registration.scope;
      for (const client of clients) {
        if (client.url.startsWith(scope) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(scope);
    }),
  );
});
