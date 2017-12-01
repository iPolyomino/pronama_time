'use strict';

let alarm_flag = true;

chrome.storage.sync.get(strage_data => {
    if (strage_data.alarm_enable != null) {
        alarm_flag = strage_data.alarm_enable;
    }
    set_property(alarm_flag);
});

chrome.browserAction.onClicked.addListener(() => {
    if (alarm_flag) {
        alarm_flag = false;
        set_property(alarm_flag);
    } else {
        alarm_flag = true;
        set_property(alarm_flag);
    }
});

function set_property(alarm_state) {
    if (alarm_state) {
        chrome.browserAction.setIcon({path: 'icon/icon128.png'});
        chrome.storage.sync.set({'alarm_enable': alarm_state});
        alarms_create();
    } else {
        chrome.browserAction.setIcon({path: 'icon/icon128_white.png'});
        chrome.storage.sync.set({'alarm_enable': alarm_state});
        chrome.alarms.clearAll();
    }
}

function alarms_create() {
    const next_alarm = moment().add(1, 'hour');
    next_alarm.set({minute: 0, second: 0, millisecond: 0});
    chrome.alarms.create('ALARM', {
        when: next_alarm.unix() * 1000
    });
}

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name == 'ALARM' && alarm_flag) {
        run();
    }
});

function run() {
    const hour = moment().hour();
    const minute = moment().minute();

    notify(hour, minute);
    audio_play(hour, minute);
}

function notify(hour, minute) {
    const message = [
        '0時だ～日付変わっちゃった',
        '1時～そろそろ寝る～？',
        '2時！ えっ？ まだ寝ないよ',
        '3時でーす もしもし…',
        '4時…',
        '5時～',
        '6時',
        '7時！ さぁ起きた起きた～',
        '8時！ ほら早く起きなよ～',
        '9時！ はりきっていこう！',
        '10時！ さーこれからだー！',
        '11時！ そうその調子！',
        '12時！ あ～お腹減ったぁ',
        '13時 聞こえない？',
        '14時！ あ～お腹いっぱい～',
        '15時…',
        '16時！ さぁバリバリいくよ～',
        '17時！ 日が沈んでくるかな',
        '18時！ お疲れ様！',
        '19時！ よーしゆっくり休むぞ～',
        '20時！ あ、20時！',
        '21時！ さーてプログラミングするかな～',
        '22時！ テンションあがってきたー！',
        '23時！ ひゃっほう！'
    ];

    const options = {
        iconUrl: 'icon/icon128.png',
        type: 'list',
        title: hour + '時' + minute + '分',
        message: '',
        priority: 1,
        items: [
            {
                title: message[hour],
                message: ''
            }
        ]
    };
    chrome.notifications.create('k_notification', options);
}

function audio_play(hour, minute) {
    const time = `voice/kei2_voice_${ ('00' + (hour + 81)).slice(-3)}.wav`;
    const audio = new Audio(time);
    audio.play();
    audio.addEventListener('ended', () => {
        chrome.notifications.clear('k_notification');
    }, false);

    alarms_create();
}
