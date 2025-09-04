var player;
var interval;
var flag;

function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%",
        width: "100%",
        videoId: VIDEO_ID,
        playerVars: {
            controls: 1,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onPlaybackRateChange: onPlayerPlaybackRateChange,
        }
    });
}

function telemetry(reason) {
    return fetch("telemetry", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            reason: reason,
            player: {
                state: player.getPlayerState(),
                time: player.getCurrentTime(),
                rate: player.getPlaybackRate(),
                volume: player.getVolume(),
                muted: player.isMuted(),
                loaded: player.getVideoLoadedFraction(),
                duration: player.getDuration(),
                url: player.getVideoUrl(),
            },
            document: {
                visibility: document.visibilityState,
                fullscreen: !!document.fullscreenElement,
                agent: navigator.userAgent,
            },
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error && data.error === "Incorrect video") {
            window.location.href = "..";
        }
        const progressContainer = document.getElementById("progress-container");
        progressContainer.innerHTML = "";
        const coverages = [
            { intervals: data.coverage.invalid, type: "invalid-coverage" },
            { intervals: data.coverage.valid, type: "valid-coverage" }
        ];
        coverages.forEach(({ intervals, type }) => {
            intervals.forEach(([startTime, endTime]) => {
                const start = (startTime / player.getDuration()) * 100;
                const end = (endTime / player.getDuration()) * 100;
                const bar = document.createElement("div");
                bar.classList.add("progress-bar", type);
                Object.assign(bar.style, {
                    left: `${start}%`,
                    width: `${end - start}%`,
                });
                bar.addEventListener("click", () => {
                    if (type === "invalid-coverage") {
                        player.seekTo(Math.max(startTime - 2, 0));
                        player.playVideo();
                    }
                    if (type === "valid-coverage") {
                        player.seekTo(Math.max(endTime - 2, 0));
                        player.playVideo();
                    }
                });
                bar.addEventListener("mouseover", () => {
                    bar.style.opacity = 1.0;
                });
                bar.addEventListener("mouseout", () => {
                    bar.style.opacity = "";
                });
                progressContainer.appendChild(bar);
            });
        });
        if (data.flag) {
            flag = data.flag;
        }
    });
}

function onPlayerReady(event) {
    interval = setInterval(() => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            telemetry("interval");
        }
    }, 10000);
    player.playVideo();
}

function onPlayerStateChange(event) {
    telemetry("player-state-change").then(() => {
        if (flag && event.data === YT.PlayerState.ENDED) {
            const flagModal = document.getElementById("flag-modal");
            const flagText = document.getElementById("flag-text");
            flagText.textContent = flag;
            flagModal.showModal();
        }
    });
    switch (event.data) {
        case YT.PlayerState.UNSTARTED:
            color = "grey";
            break;
        case YT.PlayerState.ENDED:
            color = "green";
            break;
        case YT.PlayerState.PLAYING:
            color = "yellow";
            break;
        case YT.PlayerState.PAUSED:
            color = "red";
            break;
        case YT.PlayerState.BUFFERING:
            color = "orange";
            break;
        case YT.PlayerState.CUED:
            color = "purple";
            break;
        default:
            color = "white";
            break;
    }
    document.getElementById("player-container").style.borderColor = color;
}

function onPlayerPlaybackRateChange(event) {
    telemetry("playback-rate-change");
}

document.addEventListener("visibilitychange", () => telemetry("document-visibility-change"));
document.addEventListener("fullscreenchange", () => telemetry("fullscreen-change"));
