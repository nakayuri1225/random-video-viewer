let player;
let allVideoIds = [];
let doneVideoInfo = [];
let apiKey = '';
const CHANNEL_ID = 'UCA0dCpx0rxFfu9nnYByQSpA'; // チャンネルIDは公開情報なのでそのままでOK

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const apiKeySection = document.getElementById('api-key-section');
    const mainContent = document.getElementById('main-content');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const nextVideoBtn = document.getElementById('next-video');
    const markAsDoneBtn = document.getElementById('mark-as-done');
    const resetListBtn = document.getElementById('reset-list');

    // --- Initialization ---
    function initializeApp() {
        apiKey = localStorage.getItem('youtubeApiKey');
        doneVideoInfo = JSON.parse(localStorage.getItem('doneVideoInfo')) || [];

        if (apiKey) {
            apiKeySection.style.display = 'none';
            mainContent.style.display = 'block';
            // YouTube APIスクリプトを動的にロード
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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
            apiKeyInput.value = '';
            initializeApp();
        } else {
            alert('APIキーを入力してください。');
        }
    });

    nextVideoBtn.addEventListener('click', playRandomVideo);
    markAsDoneBtn.addEventListener('click', markAsDone);
    resetListBtn.addEventListener('click', resetList);

    // --- Core Functions ---
    function onPlayerReady(event) {
        fetchVideoIds();
        renderDoneList();
    }

    async function fetchVideoIds() {
        let uploadsPlaylistId;
        try {
            const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`);
            const channelData = await channelResponse.json();
            if (channelData.error) throw new Error(channelData.error.message);
            uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            let nextPageToken = '';
            allVideoIds = []; // Reset before fetching
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
            // APIキーが不正な可能性があるので、設定画面に戻す
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
            renderDoneList();
        }
    }

    function renderDoneList() {
        const doneList = document.getElementById('done-list');
        doneList.innerHTML = '';
        for (const info of doneVideoInfo) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `https://www.youtube.com/watch?v=${info.id}`;
            link.textContent = info.title;
            link.target = '_blank';
            listItem.appendChild(link);

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

    function resetList() {
        if (confirm('本当に完了済みリストをリセットしますか？')) {
            doneVideoInfo = [];
            localStorage.removeItem('doneVideoInfo');
            renderDoneList();
            alert('完了済みリストをリセットしました。');
        }
    }

    // --- Global function for YouTube API ---
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            events: {
                'onReady': onPlayerReady
            }
        });
    };

    // --- Start the app ---
    initializeApp();
});