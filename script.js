let player;
let allVideoIds = [];
let doneVideoInfo = [];
let apiKey = '';
const CHANNEL_ID = 'UCA0dCpx0rxFfu9nnYByQSpA';

let currentDate = new Date(); // カレンダーの現在表示月
let selectedDate = null; // カレンダーで選択された日付

// --- DOM Elements ---
const apiKeySection = document.getElementById('api-key-section');
const mainContent = document.getElementById('main-content');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const nextVideoBtn = document.getElementById('next-video');
const markAsDoneBtn = document.getElementById('mark-as-done');
const resetListBtn = document.getElementById('reset-list');

const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthYearSpan = document.getElementById('current-month-year');
const calendarGrid = document.getElementById('calendar-grid');
const dailyVideoListDiv = document.getElementById('daily-video-list');
const doneListUl = document.getElementById('done-list'); // 元のdone-listは非表示

// --- Initialization ---
function initializeApp() {
    apiKey = localStorage.getItem('youtubeApiKey');
    doneVideoInfo = JSON.parse(localStorage.getItem('doneVideoInfo')) || [];

    if (apiKey) {
        apiKeySection.style.display = 'none';
        mainContent.style.display = 'block';
        // YouTube APIスクリプトはHTMLでdefer読み込みなので、ここでは何もしない
    } else {
        apiKeySection.style.display = 'block';
        mainContent.style.display = 'none';
    }
}

// --- Event Listeners ---
saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('youtubeApiKey', key);
        window.location.reload(); // ページをリロードして、クリーンな状態で初期化
    } else {
        alert('APIキーを入力してください。');
    }
});

nextVideoBtn.addEventListener('click', playRandomVideo);
markAsDoneBtn.addEventListener('click', markAsDone);
resetListBtn.addEventListener('click', resetList);

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// --- Core Functions ---
// YouTube IFrame Player APIの準備ができたときに呼ばれるグローバル関数
window.onYouTubeIframeAPIReady = function() {
    if (localStorage.getItem('youtubeApiKey')) {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            events: {
                'onReady': onPlayerReady
            }
        });
    }
};

function onPlayerReady(event) {
    fetchVideoIds();
    renderCalendar(); // プレイヤー準備完了後にカレンダーも描画
}

async function fetchVideoIds() {
    let uploadsPlaylistId;
    try {
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`);
        const channelData = await channelResponse.json();
        if (channelData.error) throw new Error(channelData.error.message);
        uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        let nextPageToken = '';
        allVideoIds = [];
        while (true) {
            const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`);
            const playlistData = await playlistResponse.json();
            if (playlistData.error) throw new Error(playlistData.error.message);
            allVideoIds.push(...playlistData.items.map(item => item.snippet.resourceId.videoId));
            nextPageToken = playlistData.nextPageToken;
            if (!nextPageToken) break;
        }
        playRandomVideo();
    } catch (error) {
        console.error('Error fetching video list:', error);
        alert(`動画リストの取得に失敗しました。APIキーが正しいか確認してください。\nエラー: ${error.message}`);
        localStorage.removeItem('youtubeApiKey');
        initializeApp();
    }
}

function playRandomVideo() {
    const doneVideoIds = doneVideoInfo.map(info => info.id);
    const availableVideos = allVideoIds.filter(id => !doneVideoIds.includes(id));

    if (availableVideos.length === 0) {
        if(allVideoIds.length > 0) alert('すべての動画を視聴済みです！');
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableVideos.length);
    const videoId = availableVideos[randomIndex];
    player.loadVideoById(videoId);
}

function markAsDone() {
    const currentVideoData = player.getVideoData();
    if (!currentVideoData || !currentVideoData.video_id) return;

    const { video_id: currentVideoId, title: currentVideoTitle } = currentVideoData;
    const timestamp = new Date();

    if (currentVideoId && !doneVideoInfo.some(info => info.id === currentVideoId)) {
        doneVideoInfo.push({ id: currentVideoId, title: currentVideoTitle, date: timestamp.toISOString() });
        localStorage.setItem('doneVideoInfo', JSON.stringify(doneVideoInfo));
        renderCalendar(); // 完了したらカレンダーを再描画
        renderDailyVideoList(selectedDate); // もし日付が選択されていればリストも更新
    }
}

function resetList() {
    if (confirm('本当に完了済みリストをリセットしますか？')) {
        doneVideoInfo = [];
        localStorage.removeItem('doneVideoInfo');
        renderCalendar(); // リセットしたらカレンダーを再描画
        renderDailyVideoList(null); // 日別リストもクリア
        alert('完了済みリストをリセットしました。');
    }
}

// --- Calendar Functions ---
function renderCalendar() {
    calendarGrid.innerHTML = '';
    dailyVideoListDiv.innerHTML = ''; // 日別リストをクリア
    selectedDate = null; // 選択された日付をリセット

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthYearSpan.textContent = `${year}年${month + 1}月`;

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0:日, 1:月, ..., 6:土
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    dayNames.forEach(day => {
        const dayNameCell = document.createElement('div');
        dayNameCell.classList.add('day-name');
        dayNameCell.textContent = day;
        calendarGrid.appendChild(dayNameCell);
    });

    // 前月の空白セル
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty');
        calendarGrid.appendChild(emptyCell);
    }

    // 今月の日付セル
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        dayCell.textContent = day;
        dayCell.dataset.date = new Date(year, month, day).toISOString();

        const currentDay = new Date(year, month, day);
        const hasVideos = doneVideoInfo.some(info => {
            const videoDate = new Date(info.date);
            return videoDate.getFullYear() === currentDay.getFullYear() &&
                   videoDate.getMonth() === currentDay.getMonth() &&
                   videoDate.getDate() === currentDay.getDate();
        });

        if (hasVideos) {
            dayCell.classList.add('has-videos');
        }

        dayCell.addEventListener('click', () => {
            // 選択状態をリセット
            document.querySelectorAll('.day-cell.selected').forEach(cell => {
                cell.classList.remove('selected');
            });
            // 新しい日付を選択状態に
            dayCell.classList.add('selected');
            selectedDate = new Date(dayCell.dataset.date);
            renderDailyVideoList(selectedDate);
        });

        calendarGrid.appendChild(dayCell);
    }
}

function renderDailyVideoList(date) {
    dailyVideoListDiv.innerHTML = '';
    if (!date) return; // 日付が選択されていなければ何もしない

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const videosForSelectedDay = doneVideoInfo.filter(info => {
        const videoDate = new Date(info.date);
        return videoDate.getFullYear() === year &&
               videoDate.getMonth() === month &&
               videoDate.getDate() === day;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // 時系列順にソート

    if (videosForSelectedDay.length > 0) {
        const ul = document.createElement('ul');
        videosForSelectedDay.forEach(info => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `https://www.youtube.com/watch?v=${info.id}`;
            link.textContent = info.title;
            link.target = '_blank';
            listItem.appendChild(link);

            const date = new Date(info.date);
            const formattedTime = `${date.getHours()}時${date.getMinutes()}分`;
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${formattedTime})`;
            timeSpan.style.fontSize = '0.9em';
            timeSpan.style.color = '#888';
            listItem.appendChild(timeSpan);

            ul.appendChild(listItem);
        });
        dailyVideoListDiv.appendChild(ul);
    } else {
        const p = document.createElement('p');
        p.textContent = 'この日に完了した動画はありません。';
        dailyVideoListDiv.appendChild(p);
    }
}

// --- Start the app ---
initializeApp();