"use strict";

const ALARM_NAME = "hourly_time_signal";
const LEGACY_ALARM_NAME = "ALARM";
const NOTIFICATION_ID = "k_notification";
let creatingOffscreenDocument;

initialize().catch(reportError);

chrome.runtime.onInstalled.addListener(() => initialize().catch(reportError));
chrome.runtime.onStartup.addListener(() => initialize().catch(reportError));
chrome.action.onClicked.addListener(() => toggleAlarm().catch(reportError));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    handleAlarm(alarm).catch(reportError);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.target === "service_worker" && message.type === "audio_ended") {
    cleanUpAudio().catch(reportError);
  }
});

async function initialize() {
  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  await chrome.alarms.clear(LEGACY_ALARM_NAME);
  await applyAlarmState(alarm_enable);
}

async function toggleAlarm() {
  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  const nextState = !alarm_enable;

  await chrome.storage.sync.set({ alarm_enable: nextState });
  await applyAlarmState(nextState);
}

async function applyAlarmState(alarmState) {
  await chrome.action.setIcon({
    path: alarmState ? "icon/icon128.png" : "icon/icon128_white.png",
  });

  if (alarmState) {
    await ensureAlarm();
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }
}

async function ensureAlarm() {
  const alarm = await chrome.alarms.get(ALARM_NAME);

  // Replace the repeating alarm used by the previous implementation.
  if (alarm && alarm.periodInMinutes == null) {
    return;
  }

  if (alarm) {
    await chrome.alarms.clear(ALARM_NAME);
  }

  await createAlarm();
}

async function createAlarm() {
  const nextAlarm = new Date();
  nextAlarm.setMinutes(0, 0, 0);
  nextAlarm.setHours(nextAlarm.getHours() + 1);

  await chrome.alarms.create(ALARM_NAME, {
    when: nextAlarm.getTime(),
  });
}

async function handleAlarm(alarm) {
  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  if (!alarm_enable) {
    return;
  }

  // One-shot alarms are recalculated so a delayed alarm does not shift later ones.
  await createAlarm();

  const now = new Date();

  // Do not announce an old alarm delivered late after the device resumes.
  if (now.getTime() - alarm.scheduledTime < 60 * 1000) {
    await run(now);
  }
}

async function run(now = new Date()) {
  const hour = now.getHours();
  const minute = now.getMinutes();

  await notify(hour, minute);
  await playAudio(hour);
}

async function notify(hour, minute) {
  const messages = [
    "0時だ～日付変わっちゃった",
    "1時～そろそろ寝る～？",
    "2時！ えっ？ まだ寝ないよ",
    "3時でーす もしもし…",
    "4時…",
    "5時～",
    "6時",
    "7時！ さぁ起きた起きた～",
    "8時！ ほら早く起きなよ～",
    "9時！ はりきっていこう！",
    "10時！ さーこれからだー！",
    "11時！ そうその調子！",
    "12時！ あ～お腹減ったぁ",
    "13時 聞こえない？",
    "14時！ あ～お腹いっぱい～",
    "15時…",
    "16時！ さぁバリバリいくよ～",
    "17時！ 日が沈んでくるかな",
    "18時！ お疲れ様！",
    "19時！ よーしゆっくり休むぞ～",
    "20時！ あ、20時！",
    "21時！ さーてプログラミングするかな～",
    "22時！ テンションあがってきたー！",
    "23時！ ひゃっほう！",
  ];

  await chrome.notifications.create(NOTIFICATION_ID, {
    iconUrl: "icon/icon128.png",
    type: "basic",
    title: `${hour}時${minute}分`,
    message: messages[hour],
    priority: 1,
  });
}

async function playAudio(hour) {
  const path = `voice/kei2_voice_${("00" + (hour + 81)).slice(-3)}.wav`;

  await createOffscreenDocument();
  await sendAudioMessage(path);
}

async function sendAudioMessage(path) {
  const message = { type: "play_audio", target: "offscreen", path };

  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (!String(error).includes("No SW")) {
      throw error;
    }

    // A stale offscreen context can remain briefly after an extension reload.
    const contexts = await getOffscreenContexts();
    if (contexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }

    await createOffscreenDocument();
    await chrome.runtime.sendMessage(message);
  }
}

async function createOffscreenDocument() {
  const contexts = await getOffscreenContexts();
  if (contexts.length > 0) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "プロ生ちゃんの時報音声を再生するため",
    }).finally(() => {
      creatingOffscreenDocument = undefined;
    });
  }

  await creatingOffscreenDocument;
}

async function cleanUpAudio() {
  await chrome.notifications.clear(NOTIFICATION_ID);

  const contexts = await getOffscreenContexts();
  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

function getOffscreenContexts() {
  return chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")],
  });
}

function reportError(error) {
  console.error(error);
}
