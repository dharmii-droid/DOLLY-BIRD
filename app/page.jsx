"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 360;
const H = 640;
const BIRD_X = 105;
const BIRD_R = 19;
const PIPE_W = 62;
const GAP = 168;
const GROUND_H = 72;

export default function Home() {
  const canvasRef = useRef(null);
  const faceRef = useRef(null);
  const audioRef = useRef(null);
  const frameRef = useRef(0);
  const gameRef = useRef(null);
  const [mode, setMode] = useState("ready"); // ready | playing | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);

  const startGame = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = muted;
      try {
        await audio.play(); // Browsers allow this because it follows a user tap/click.
      } catch (e) {
        console.warn("Audio could not start. Tap the sound button to try again.", e);
      }
    }
    gameRef.current = {
      birdY: H * 0.44,
      velocity: 0,
      pipes: [{ x: W + 35, gapY: 275, passed: false }],
      frame: 0,
      score: 0,
      mode: "playing"
    };
    setScore(0);
    setMode("playing");
  }, [muted]);

  const flap = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.mode !== "playing") return;
    g.velocity = -6.1;
  }, []);

  const endGame = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.mode !== "playing") return;
    g.mode = "over";
    setMode("over");
    setBest((old) => {
      const next = Math.max(old, g.score);
      try { localStorage.setItem("dolly-bird-best", String(next)); } catch {}
      return next;
    });
    if (audioRef.current) audioRef.current.pause();
  }, []);

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("dolly-bird-best") || 0)); } catch {}
    const face = new Image();
    face.src = "/dolly-face.jpg";
    face.onload = () => { faceRef.current = face; };
    const audio = new Audio("/dolly-music.mp3");
    audio.loop = true;
    audio.volume = 0.65;
    audioRef.current = audio;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = 0;

    const roundedRect = (x, y, w, h, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    const draw = (time) => {
      const dt = Math.min((time - (last || time)) / 16.67, 2);
      last = time;
      const g = gameRef.current;

      // Sky and distant scenery
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#71d5ff");
      sky.addColorStop(1, "#d5f5ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,.8)";
      for (let i = 0; i < 4; i++) {
        const x = ((i * 115 - (g?.frame || 0) * 0.35) % (W + 100) + W + 100) % (W + 100) - 45;
        const y = 92 + (i % 3) * 75;
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.arc(x + 19, y - 8, 22, 0, Math.PI * 2);
        ctx.arc(x + 42, y, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft hills
      ctx.fillStyle = "#9be18b";
      ctx.beginPath();
      ctx.moveTo(0, H - GROUND_H - 28);
      ctx.quadraticCurveTo(95, 435, 190, H - GROUND_H - 20);
      ctx.quadraticCurveTo(275, 455, W, H - GROUND_H - 25);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

      if (g?.mode === "playing") {
        g.frame += dt;
        g.velocity += 0.34 * dt;
        g.birdY += g.velocity * dt;

        g.pipes.forEach((p) => {
          p.x -= 2.35 * dt;
          if (!p.passed && p.x + PIPE_W < BIRD_X) {
            p.passed = true;
            g.score += 1;
            setScore(g.score);
          }
        });
        if (g.pipes[g.pipes.length - 1].x < W - 190) {
          const gapY = 155 + Math.random() * 270;
          g.pipes.push({ x: W + 8, gapY, passed: false });
        }
        g.pipes = g.pipes.filter((p) => p.x > -PIPE_W - 5);

        // Pipes
        g.pipes.forEach((p) => {
          const topH = p.gapY - GAP / 2;
          const bottomY = p.gapY + GAP / 2;
          roundedRect(p.x, 0, PIPE_W, topH, 5, "#24b84a");
          roundedRect(p.x - 5, topH - 19, PIPE_W + 10, 19, 5, "#159b3a");
          roundedRect(p.x, bottomY, PIPE_W, H - GROUND_H - bottomY, 5, "#24b84a");
          roundedRect(p.x - 5, bottomY, PIPE_W + 10, 19, 5, "#159b3a");

          const hitX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
          const hitY = g.birdY - BIRD_R < topH || g.birdY + BIRD_R > bottomY;
          if (hitX && hitY) endGame();
        });

        if (g.birdY - BIRD_R < 0 || g.birdY + BIRD_R > H - GROUND_H) endGame();
      }

      // Draw pipes also while showing the ready/over screen if present
      if (g && g.mode !== "playing") {
        g.pipes.forEach((p) => {
          const topH = p.gapY - GAP / 2;
          const bottomY = p.gapY + GAP / 2;
          roundedRect(p.x, 0, PIPE_W, topH, 5, "#24b84a");
          roundedRect(p.x - 5, topH - 19, PIPE_W + 10, 19, 5, "#159b3a");
          roundedRect(p.x, bottomY, PIPE_W, H - GROUND_H - bottomY, 5, "#24b84a");
          roundedRect(p.x - 5, bottomY, PIPE_W + 10, 19, 5, "#159b3a");
        });
      }

      // Ground
      ctx.fillStyle = "#d9b36c";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = "#78cf50";
      ctx.fillRect(0, H - GROUND_H, W, 13);
      ctx.strokeStyle = "rgba(120,85,35,.25)";
      ctx.lineWidth = 2;
      for (let x = -20; x < W + 30; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, H - 34); ctx.lineTo(x + 14, H - 23); ctx.stroke();
      }

      // Face character: circular crop with white outline
      const birdY = g ? g.birdY : H * 0.44 + Math.sin(time / 250) * 8;
      ctx.save();
      ctx.translate(BIRD_X, birdY);
      if (g?.mode === "playing") ctx.rotate(Math.max(-0.45, Math.min(0.65, g.velocity * 0.065)));
      ctx.beginPath(); ctx.arc(0, 0, BIRD_R + 3, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2); ctx.clip();
      if (faceRef.current) {
        ctx.drawImage(faceRef.current, -BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
      } else {
        ctx.fillStyle = "#f2c7a5"; ctx.fillRect(-BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
      }
      ctx.restore();
      ctx.strokeStyle = "#27364b"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      // Score
      ctx.textAlign = "center";
      ctx.font = "bold 34px system-ui";
      ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.strokeText(String(g?.score || 0), W / 2, 58);
      ctx.fillStyle = "#fff"; ctx.fillText(String(g?.score || 0), W / 2, 58);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [endGame]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (mode === "playing") flap();
        else startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, flap, startGame]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
      if (!next && mode === "playing") audioRef.current.play().catch(() => {});
    }
  };

  const handlePlayArea = () => {
    if (mode === "playing") flap();
    else startGame();
  };

  return (
    <main className="page">
      <header className="header">
        <div className="eyebrow">A PERSONAL ARCADE GAME</div>
        <h1>DOLLY <span>BIRD</span></h1>
        <p>Tap to fly. Try not to bonk your face.</p>
      </header>

      <section className="gameShell">
        <div className="hud">
          <div><small>BEST</small><strong>{best}</strong></div>
          <button className="soundButton" onClick={toggleMute} aria-label={muted ? "Unmute music" : "Mute music"}>
            {muted ? "🔇 SOUND OFF" : "🔊 SOUND ON"}
          </button>
        </div>
        <div className="canvasWrap" onPointerDown={handlePlayArea}>
          <canvas ref={canvasRef} width={W} height={H} />
          {mode !== "playing" && (
            <div className="overlay">
              {mode === "ready" ? (
                <>
                  <div className="pill">READY?</div>
                  <h2>DOLLY BIRD</h2>
                  <p>Your face. Your flight. Your soundtrack.</p>
                  <button className="playButton" onPointerDown={(e) => e.stopPropagation()} onClick={startGame}>START GAME</button>
                  <small>Tap / click / press SPACE to flap</small>
                </>
              ) : (
                <>
                  <div className="pill">GAME OVER</div>
                  <h2>OOPS, DOLLY!</h2>
                  <p>You scored <b>{score}</b>. Best: <b>{best}</b>.</p>
                  <button className="playButton" onPointerDown={(e) => e.stopPropagation()} onClick={startGame}>PLAY AGAIN</button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="below">
          <span>🏆 SCORE <b>{score}</b></span>
          <span>SPACE / TAP TO FLY</span>
        </div>
      </section>
      <footer>Made for fun • DOLLY BIRD</footer>
      <audio ref={audioRef} src="/dolly-music.mp3" loop preload="auto" />
    </main>
  );
}
