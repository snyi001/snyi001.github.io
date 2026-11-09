const e=`import { useSyncExternalStore } from "react";
import type { DeviceId } from "@/desk/devices";
import { sydneyEvening } from "@/lib/sydneySun";
import type { SpeakerState } from "@/desk/scene/Speaker";

/** Where a device's screen sits on the page once the camera has arrived at it. */
export type ScreenRect = { left: number; top: number; width: number; height: number; radius: number };

export type DeskState = {
  /** The device the camera is at, or flying to. */
  focus: DeviceId | null;
  hover: DeviceId | null;
  /** True once the camera has settled in front of the focused screen. */
  arrived: boolean;
  rect: ScreenRect | null;
  /** The 3D scene has drawn its first frame. */
  ready: boolean;
  /** Receipts the printer has been asked to print. Each new one prints once. */
  printJob: PrintJob | null;
  /** The camera has stepped back from the tablet to watch the printer. */
  printing: boolean;
  /** The latest receipt has finished printing and hangs from the printer, ready to tear off. */
  paperOut: boolean;
  /** A receipt is in hand, held up in front of the camera at the printer. */
  holding: boolean;
  /** The receipt in hand is folded in half. */
  folded: boolean;
  /** A project (by slug) to open on the laptop straight away, or LAPTOP_ABOUT / LAPTOP_CONTACT for those windows. */
  laptopProject: string | null;
  /** When the laptop was last asked for something, so an open laptop follows a new ask (from the speaker, say). */
  laptopAsk: number;
  /** The free band between the headline and the buttons, in pixels from the top of the hero. */
  frame: { top: number; bottom: number } | null;
  /** The desk lamp is on: the room goes dim and warm, like an evening at the desk. */
  evening: boolean;
  /** The diary is open: the camera is over the notebook and its pages are up. */
  diary: boolean;
  /** The camera is in front of the games console, straight on, where its power button can be pressed. */
  consoleView: boolean;
  /** The games console is on. */
  consoleOn: boolean;
  /** The laptop is showing Xueying Station, the console's screen, rather than its own desktop. */
  stationOpen: boolean;
  /**
   * How far Xueying Station has got since the console was switched on: starting up, waiting for a controller, or at
   * home. Going back to the laptop and in again picks up where it was; switching off starts it all again.
   */
  stationStage: "boot" | "connect" | "home";
  /** The code phones join with, made once each time the console's switched on. */
  stationRoom: string | null;
  /** What's driving it: a phone, or (no phone handy) the laptop's keyboard. */
  stationInput: "phone" | "keyboard" | null;
  /** The phone playing on this computer (its name, and its colour until a race gives it its bike's); station/link.ts keeps it up to date. */
  stationPhone: { color: string; name: string } | null;
  /** A friend's race to join once a controller's picked up: the code from a link they sent (?join=CODE). */
  stationJoin: string | null;
  /** The game being played on the station, if one is. */
  stationGame: string | null;
  /** My business card is in hand, held up in front of the camera. */
  card: boolean;
  /** One of the sticky notes on the laptop (0 to 3) is in hand, or none. */
  note: number | null;
  /** The X-ray glasses are on: the desk is drawn as a technical drawing that shows how each thing is made. */
  xray: boolean;
  /** With the glasses on, the part picked to read about (an id from xrayParts), or none. */
  xrayPick: string | null;
  /** With the glasses on, what's on the desk, counted: each part's meshes and triangles. */
  xrayCounts: Record<string, { meshes: number; triangles: number }> | null;
  /** Some of the X-ray drawing is on screen: from the sweep starting until it has all swept away again. */
  xrayLive: boolean;
  /** Receipts printed on the desk by everyone: how many, and the latest few, which lie in front of the printer. */
  dockets: { count: number; latest: PrintJob[] } | null;
  /** What the speaker is doing, which its light shows. */
  speaker: SpeakerState;
  /** What's said to the speaker and what it says back, shown as captions while they talk; null when it's quiet. */
  caption: { heard: string; reply: string; hint: string } | null;
  /**
   * "Hey Snow": "on" while the speaker listens for it (only ever on this device), "possible" where it could once
   * the mic is allowed (a first tap does that), "pack" while the browser fetches its on-device speech pack, "off" if
   * the visitor switched it off, "no" where the browser can't hear on the device.
   */
  wake: "on" | "possible" | "pack" | "off" | "no";
  /** The station the speaker is playing, if any. */
  music: string | null;
  /** The "Request a song" card is open: adding your favourite song to the record player's mix. */
  songRequest: boolean;
  /** The "喂我的猫" window is open. */
  feeding: boolean;
  /** Someone has just fed my cat and come back: their name (or "" if they didn't give one), for the thanks. */
  fedBy: string | null;
  /** The share window is open: for their vote, their song, or whatever they did ("auto"). */
  share: "auto" | "vote" | "song" | null;
  /** The vote card is open, out of the box on the desk. */
  pollOpen: boolean;
  /**
   * The song this visitor has added to the mix (one each, for good), once known; null if they haven't. With their
   * card's number and date (cards from before numbering have neither).
   */
  mySong: { id: string; title: string; artist: string; by: string; no?: number; at?: number } | null;
};

/** Things on the desk that act on their own when asked: the plant is watered, the coffee sipped, Zoro bobbled. */
export type Poke = "water" | "sip" | "bobble" | "cat";

/**
 * The lamp follows the sun in Sydney: on at sunset, off at sunrise. Switching
 * it by hand holds until the next sunrise or sunset, then it's back on the
 * clock. That choice is remembered; storage can be missing or blocked, and
 * then the lamp simply follows the clock.
 */
/** A code phones join Xueying Station with: four letters and numbers that can't be mistaken for each other. */
const ROOM_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRoom = () => Array.from({ length: 4 }, () => ROOM_LETTERS[Math.floor(Math.random() * ROOM_LETTERS.length)]).join("");

const LAMP_KEY = "xueyinglabs:lamp";
const lampNow = () => {
  const auto = sydneyEvening();
  try {
    const saved = JSON.parse(localStorage.getItem(LAMP_KEY) ?? "null") as { evening: boolean; until: number } | null;
    if (saved && Date.now() < saved.until) return saved.evening;
  } catch {
    // Fall back to the clock.
  }
  return auto.evening;
};

export type PrintJob = { id: number; lines: string[] };

/** Opens the laptop on its "关于我" window. The site has no About section of its own. */
export const LAPTOP_ABOUT = "about";
/** Opens the laptop on its "联系" window. */
export const LAPTOP_CONTACT = "contact";
/** Opens the laptop on my Instagram, in its browser. */
export const LAPTOP_INSTAGRAM = "instagram";
/** Opens the laptop on my cat's window: who fed it. */
export const LAPTOP_CAT = "cat";
/** Opens the laptop on a project's case study: this, then the project's slug. */
export const LAPTOP_CASE = "case:";
/** Opens the laptop on its "作品" window, every project. */
export const LAPTOP_WORK = "work";

let state: DeskState = {
  focus: null,
  hover: null,
  arrived: false,
  rect: null,
  ready: false,
  printJob: null,
  printing: false,
  paperOut: false,
  holding: false,
  folded: false,
  laptopProject: null,
  laptopAsk: 0,
  frame: null,
  evening: lampNow(),
  diary: false,
  consoleView: false,
  consoleOn: false,
  stationOpen: false,
  stationStage: "boot",
  stationRoom: null,
  stationInput: null,
  stationPhone: null,
  stationJoin: null,
  stationGame: null,
  card: false,
  note: null,
  xray: false,
  xrayPick: null,
  xrayCounts: null,
  xrayLive: false,
  dockets: null,
  speaker: "idle",
  caption: null,
  wake: "no",
  music: null,
  songRequest: false,
  pollOpen: false,
  share: null,
  feeding: false,
  fedBy: null,
  mySong: null,
};
const listeners = new Set<() => void>();
const pokes = new Map<Poke, () => void>();
let docketsAsked = false;

/**
 * The 3D scene and the page around it share this small store: the page says
 * which device to open, the scene says when the camera got there and where
 * the screen ended up, so the real interface can be laid exactly over it.
 */
export const desk = {
  get: () => state,
  set(patch: Partial<DeskState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  open(id: DeviceId, laptopProject: string | null = null) {
    // Already there: no flight, the screen just goes where it was asked.
    if (state.focus === id) return desk.set({ laptopProject, laptopAsk: Date.now(), card: false, note: null });
    desk.set({ focus: id, arrived: false, rect: null, hover: null, laptopProject, laptopAsk: Date.now(), card: false, note: null });
  },
  close() {
    desk.set({
      focus: null,
      arrived: false,
      rect: null,
      printing: false,
      holding: false,
      diary: false,
      consoleView: false,
      stationOpen: false,
      card: false,
      note: null,
      xray: false,
      xrayPick: null,
      songRequest: false,
      pollOpen: false,
      share: null,
      feeding: false,
    });
  },
  /** Ask something on the desk to do its thing, as if it had been clicked. False if nothing's there to do it. */
  poke(what: Poke) {
    const act = pokes.get(what);
    act?.();
    return Boolean(act);
  },
  /** What a thing on the desk does when it's poked. Returns the way to stop listening. */
  onPoke(what: Poke, act: () => void) {
    pokes.set(what, act);
    return () => {
      if (pokes.get(what) === act) pokes.delete(what);
    };
  },
  /** Put the X-ray glasses on (or take them off). */
  setXray(on: boolean) {
    if (on && (state.focus !== null || state.diary)) return;
    desk.set({ xray: on, xrayPick: null, hover: null, card: false, note: null });
  },
  /** Fly to the notebook and open the diary. */
  openDiary() {
    if (state.focus !== null || state.diary) return;
    desk.set({ diary: true, arrived: false, hover: null, card: false, note: null });
  },
  /** Go and stand in front of the games console, to press its power button. */
  openConsole() {
    if (state.focus !== null || state.diary || state.consoleView) return;
    desk.set({ consoleView: true, arrived: false, hover: null, card: false, note: null });
  },
  /**
   * Press the console's power button. On, it gets a room code for phones to join with straight away. Off, Xueying
   * Station starts again from the beginning next time.
   */
  setConsoleOn(on: boolean) {
    desk.set(
      on
        ? { consoleOn: true, stationRoom: state.stationRoom ?? newRoom() }
        : { consoleOn: false, stationOpen: false, stationStage: "boot", stationRoom: null, stationInput: null, stationPhone: null, stationGame: null, stationJoin: null }
    );
  },
  /** The console, on, puts Xueying Station on the laptop's screen, and the camera goes to it. */
  openStation() {
    if (!state.consoleOn) return;
    desk.set({ consoleView: false, stationOpen: true });
    desk.open("laptop");
  },
  /** Switch the console off from its own screen, and go back to the desk. */
  turnOffStation() {
    desk.setConsoleOn(false);
    desk.close();
  },
  /** From Xueying Station back to the laptop's own desktop; the console stays on. */
  leaveStation() {
    desk.set({ stationOpen: false });
  },
  /** From the laptop's desktop into Xueying Station, while the console's on. */
  enterStation() {
    if (state.consoleOn) desk.set({ stationOpen: true });
  },
  /** Take one of my business cards from the stand on the desk. */
  takeCard() {
    if (state.focus !== null || state.diary) return;
    desk.set({ card: true, note: null, hover: null });
  },
  /** Peel one of the sticky notes off the laptop (or swap the one in hand for it). */
  takeNote(index: number) {
    if (state.focus !== null || state.diary) return;
    desk.set({ note: index, card: false, hover: null });
  },
  /** Put down whatever's in hand: the card back in its stand, a note back on the laptop. */
  putDown() {
    if (state.card || state.note !== null) desk.set({ card: false, note: null });
  },
  /** Loads the receipts everyone has printed, once. */
  loadDockets() {
    if (state.dockets || docketsAsked) return;
    docketsAsked = true;
    fetch("/api/receipts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count: number; latest: PrintJob[] } | null) => d && desk.set({ dockets: d }))
      .catch(() => {});
  },
  /** Send a receipt to the printer and step the camera back to watch it come out. It goes on the desk for everyone. */
  print(lines: string[]) {
    const id = Date.now();
    fetch("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, lines }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count: number; latest: PrintJob[] } | null) => d && desk.set({ dockets: d }))
      .catch(() => {});
    desk.set({
      printJob: { id, lines },
      printing: true,
      paperOut: false,
      holding: false,
      folded: false,
      arrived: false,
      rect: null,
    });
  },
  /**
   * Pick a receipt up: one just printed (torn off first) or one lying on the
   * desk. From anywhere else, the camera goes to the printer first.
   */
  pickUp() {
    const travel = state.printing ? {} : { focus: "tablet" as const, printing: true, arrived: false, rect: null, hover: null };
    desk.set({ ...travel, holding: true, folded: false });
  },
  /** Switch the desk lamp on or off by hand, until the next sunrise or sunset. */
  toggleLamp() {
    const evening = !state.evening;
    desk.set({ evening });
    try {
      localStorage.setItem(LAMP_KEY, JSON.stringify({ evening, until: sydneyEvening().until }));
    } catch {
      // Not remembered, which is fine.
    }
  },
  /** Keep the lamp in step with the Sydney clock while the page is open. */
  syncLamp() {
    const evening = lampNow();
    if (evening !== state.evening) desk.set({ evening });
  },
  /** Done at the printer: a receipt in hand is put down on the desk, and the camera goes back to the tablet. */
  backToTablet() {
    desk.set({ printing: false, holding: false, arrived: false, rect: null });
  },
};

// While developing, the store can be looked at (and tested) from the console.
if (import.meta.env.DEV) (window as unknown as { __deskStore: typeof desk }).__deskStore = desk;

export function useDesk<T>(select: (s: DeskState) => T): T {
  return useSyncExternalStore(desk.subscribe, () => select(state));
}
`;export{e as default};
