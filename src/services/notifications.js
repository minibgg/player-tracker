// Desktop Notification and Audio Alert Service

let activeAudioElement = null;
let activeAudioContext = null;

// One shared AudioContext for the soft chime. Browsers only let a context
// start after a user gesture, so we unlock it on the first interaction; after
// that it keeps working while the tab is in the background.
let chimeContext = null;

const getChimeContext = () => {
  if (chimeContext) return chimeContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  chimeContext = new AudioContextClass();
  return chimeContext;
};

if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getChimeContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
  };
  ["pointerdown", "keydown"].forEach((evt) =>
    window.addEventListener(evt, unlock, { passive: true }),
  );
}

// Short, quiet two-note chime: "a player started a game"
export const playGameStartChime = () => {
  try {
    const ctx = getChimeContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    [
      { freq: 784, at: 0 },
      { freq: 1175, at: 0.14 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.5);
    });
  } catch (err) {
    console.warn("Could not play chime:", err);
  }
};

export const stopMatchAlertSound = () => {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {
      // ignore
    }
    activeAudioElement = null;
  }

  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch (e) {
      // ignore
    }
    activeAudioContext = null;
  }
};

// Web Audio API Synthesized Loud Emergency Siren
export const playSynthesizedSiren = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    activeAudioContext = ctx;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const cycles = 4; // 4 wailing cycles
    const cycleDuration = 0.9; // 0.9s per wail cycle
    const totalDuration = cycles * cycleDuration;

    // Dynamics compressor for maximum perceived loudness without audio clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, now);
    compressor.knee.setValueAtTime(6, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.1, now);
    compressor.connect(ctx.destination);

    // Master volume gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.9, now + 0.05);
    masterGain.gain.setValueAtTime(0.9, now + totalDuration - 0.2);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
    masterGain.connect(compressor);

    // Oscillator 1: Sawtooth wave for harsh, penetrating siren buzz
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";

    // Oscillator 2: Triangle wave for deep body punch
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";

    // Oscillator 3: Slightly detuned sawtooth for rotating siren chorus
    const osc3 = ctx.createOscillator();
    osc3.type = "sawtooth";

    const lowFreq = 580;
    const highFreq = 1050;

    for (let i = 0; i < cycles; i++) {
      const t = now + i * cycleDuration;
      const half = t + cycleDuration * 0.5;
      const end = t + cycleDuration;

      // Sweep UP
      osc1.frequency.setValueAtTime(lowFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(highFreq, half);
      // Sweep DOWN
      osc1.frequency.exponentialRampToValueAtTime(lowFreq, end);

      osc2.frequency.setValueAtTime(lowFreq, t);
      osc2.frequency.exponentialRampToValueAtTime(highFreq, half);
      osc2.frequency.exponentialRampToValueAtTime(lowFreq, end);

      osc3.frequency.setValueAtTime(lowFreq * 1.008, t);
      osc3.frequency.exponentialRampToValueAtTime(highFreq * 1.008, half);
      osc3.frequency.exponentialRampToValueAtTime(lowFreq * 1.008, end);
    }

    const gain1 = ctx.createGain();
    gain1.gain.value = 0.55;
    osc1.connect(gain1);
    gain1.connect(masterGain);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.45;
    osc2.connect(gain2);
    gain2.connect(masterGain);

    const gain3 = ctx.createGain();
    gain3.gain.value = 0.35;
    osc3.connect(gain3);
    gain3.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + totalDuration);
    osc2.stop(now + totalDuration);
    osc3.stop(now + totalDuration);

    osc1.onended = () => {
      if (activeAudioContext === ctx) {
        activeAudioContext = null;
      }
    };
  } catch (err) {
    console.warn("Could not play synthesized siren:", err);
  }
};

const checkAudioFile = async (url) => {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // In Vite dev, missing static assets return 200 with index.html (text/html)
    if (ct.includes("text/html")) return false;
    return true;
  } catch {
    return false;
  }
};

// Play match alert siren (custom audio file or synthesized fallback)
export const playMatchAlertSound = async () => {
  stopMatchAlertSound();

  const baseUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

  // Priority: User's siren.mp3 first, then wav/ogg candidates
  const candidateUrls = [
    `${cleanBase}siren.mp3`,
    `${cleanBase}sounds/siren.mp3`,
    `${cleanBase}siren.wav`,
    `${cleanBase}sounds/siren.wav`,
    `${cleanBase}siren.ogg`,
    `${cleanBase}sounds/siren.ogg`,
    `${cleanBase}alarm.mp3`,
    `${cleanBase}alarm.wav`,
  ];

  for (const url of candidateUrls) {
    const exists = await checkAudioFile(url);
    if (exists) {
      try {
        const audio = new Audio(url);
        audio.volume = 1.0; // Loud siren
        activeAudioElement = audio;

        await audio.play();

        audio.onended = () => {
          if (activeAudioElement === audio) {
            activeAudioElement = null;
          }
        };

        return true;
      } catch (err) {
        console.warn(`Could not play audio from ${url}:`, err);
        activeAudioElement = null;
      }
    }
  }

  // Fallback to synthesized siren
  playSynthesizedSiren();
  return true;
};

export const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error("Failed to request notification permission:", e);
    return Notification.permission;
  }
};

const DESKTOP_NOTIFICATION_AUTOCLOSE_MS = 6000;

export const sendDesktopNotification = (
  title,
  options = {},
  triggerSound = false,
  autoCloseMs = DESKTOP_NOTIFICATION_AUTOCLOSE_MS,
) => {
  if (triggerSound) {
    playMatchAlertSound();
  }

  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notif = new Notification(title, {
      icon: "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/29.png",
      badge:
        "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/29.png",
      tag: "lol-game-alert",
      renotify: true,
      silent: false,
      ...options,
    });

    // Auto-dismiss the desktop popup so it doesn't linger
    const closeTimer = setTimeout(() => notif.close(), autoCloseMs);
    notif.onclose = () => clearTimeout(closeTimer);

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn("Notification failed:", err);
    return null;
  }
};
