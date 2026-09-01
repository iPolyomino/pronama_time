"use strict";

const ALARM_NAME = "hourly_time_signal";
const LEGACY_ALARM_NAME = "ALARM";
const NOTIFICATION_ID = "k_notification";

initialize();

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.action.onClicked.addListener(async () => {
  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  await set_property(!alarm_enable);
});

async function initialize() {
  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  await chrome.alarms.clear(LEGACY_ALARM_NAME);
  await set_property(alarm_enable);
}

async function set_property(alarm_state) {
  await chrome.storage.sync.set({
    alarm_enable: alarm_state,
  });

  if (alarm_state) {
    await chrome.action.setIcon({
      path: "icon/icon128.png",
    });
    await alarms_create();
  } else {
    await chrome.action.setIcon({
      path: "icon/icon128_white.png",
    });
    await chrome.alarms.clear(ALARM_NAME);
  }
}

async function alarms_create() {
  const next_alarm = new Date();

  next_alarm.setMinutes(0, 0, 0);
  next_alarm.setHours(next_alarm.getHours() + 1);

  await chrome.alarms.create(ALARM_NAME, {
    when: next_alarm.getTime(),
    periodInMinutes: 60,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) {
    return;
  }

  const { alarm_enable = true } = await chrome.storage.sync.get("alarm_enable");
  if (alarm_enable) {
    await run();
  }
});

async function run() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  await notify(hour, minute);
  await audio_play(hour);
}

async function notify(hour, minute) {
  const message = [
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

  const options = {
    iconUrl: "icon/icon128.png",
    type: "list",
    title: hour + "時" + minute + "分",
    message: "",
    priority: 1,
    items: [
      {
        title: message[hour],
        message: "",
      },
    ],
  };

  await chrome.notifications.create(NOTIFICATION_ID, options);
}

async function audio_play(hour) {
  const time = `voice/kei2_voice_${("00" + (hour + 81)).slice(-3)}.wav`;

  await createOffscreenDocument();

  await chrome.runtime.sendMessage({
    type: "play_audio",
    path: time,
  });
}

async function createOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")],
  });

  if (contexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "プロ生ちゃんの時報音声を再生するため",
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "audio_ended") {
    return;
  }

  chrome.notifications.clear(NOTIFICATION_ID);
  chrome.offscreen.closeDocument();
});
