const API_KEY = 'AIzaSyDZoZTZYtxaLnr3gwHYMDLz6KepCCRlY5E'; // ここにAPIキーを設定
const CHANNEL_ID = 'UCA0dCpx0rxFfu9nnYByQSpA'; // ここにチャンネルIDを設定

let player;
let allVideoIds = [];
let doneVideoInfo = JSON.parse(localStorage.getItem('doneVideoInfo')) || [];

// YouTube IFrame Player APIの準備
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        events: {
            'onReady': onPlayerReady
        }
    });
}

// プレイヤーの準備ができたら呼ばれる
function onPlayerReady(event) {
    fetchVideoIds();
    renderDoneList();
}

// チャンネルの動画IDリストを取得
async function fetchVideoIds() {
    let uploadsPlaylistId;
    try {
        // チャンネル情報からアップロード動画のプレイリストIDを取得
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
        const channelData = await channelResponse.json();
        uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // プレイリストから動画IDを取得
        let nextPageToken = '';
        while (true) {
            const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${API_KEY}`);
            const playlistData = await playlistResponse.json();
            allVideoIds.push(...playlistData.items.map(item => item.snippet.resourceId.videoId));
            nextPageToken = playlistData.nextPageToken;
            if (!nextPageToken) break;
        }
        playRandomVideo();
    } catch (error) {
        console.error('Error fetching video list:', error);
        alert('動画リストの取得に失敗しました。APIキーまたはチャンネルIDを確認してください。');
    }
}

// ランダムな動画を再生
function playRandomVideo() {
    const doneVideoIds = doneVideoInfo.map(info => info.id);
    const availableVideos = allVideoIds.filter(id => !doneVideoIds.includes(id));

    if (availableVideos.length === 0) {
        alert('すべての動画を視聴済みです！');
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableVideos.length);
    const videoId = availableVideos[randomIndex];
    player.loadVideoById(videoId);
}

// 「次の動画」ボタンの処理
document.getElementById('next-video').addEventListener('click', () => {
    playRandomVideo();
});

// 「できたよ！」ボタンの処理
document.getElementById('mark-as-done').addEventListener('click', () => {
    const currentVideoId = player.getVideoData().video_id;
    const currentVideoTitle = player.getVideoData().title;
    const timestamp = new Date(); // 記録日時を取得

    if (currentVideoId && !doneVideoInfo.some(info => info.id === currentVideoId)) {
        doneVideoInfo.push({ id: currentVideoId, title: currentVideoTitle, date: timestamp.toISOString() });
        localStorage.setItem('doneVideoInfo', JSON.stringify(doneVideoInfo));
        renderDoneList();
    }
});

// 収穫した豆もやしの表示
function renderDoneList() {
    const doneList = document.getElementById('done-list');
    doneList.innerHTML = '';
    for (const info of doneVideoInfo) {
        const listItem = document.createElement('li');
        
        // 動画タイトルリンク
        const link = document.createElement('a');
        link.href = `https://www.youtube.com/watch?v=${info.id}`;
        link.textContent = info.title;
        link.target = '_blank';
        listItem.appendChild(link);

        // 日時表示
        if (info.date) {
            const date = new Date(info.date);
            const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}時${date.getMinutes()}分`;
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${formattedDate})`;
            timeSpan.style.fontSize = '0.9em';
            timeSpan.style.color = '#888';
            listItem.appendChild(timeSpan);
        }
        
        doneList.appendChild(listItem);
    }
}

// 「リセット」ボタンの処理
document.getElementById('reset-list').addEventListener('click', () => {
    if (confirm('本当に収穫した豆もやしをリセットしますか？')) {
        doneVideoInfo = [];
        localStorage.removeItem('doneVideoInfo');
        renderDoneList();
        alert('収穫した豆もやしをリセットしました。');
    }
});
