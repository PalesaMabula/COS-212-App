import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Button, Choices } from '../ui/primitives';
import LessonSection from './LessonSection';
import CampusMap, { QueueStrip, useLabel } from './CampusMap';
import SceneStage from './SceneStage';
import { useSettings } from '../../context/SettingsContext';
import { useTracker } from '../../hooks/useStudyTracker';
import useRippleTone from '../../hooks/useRippleTone';
import useApi from '../../api/useApi';
import useVideoClock from '../../hooks/useVideoClock';
import { markDone } from '../../data/stores';

export const CHAPTER_SECONDS = 5;
const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

/*
 * A code-drawn animation (no sound): 5 seconds per chapter, with captions,
 * chapters, speed, a transcript, and a live announcement of each chapter for
 * screen readers. Labelled honestly as "Animation · no sound".
 *   section.bfs set  -> the picture is real BFS frames from the server
 *   otherwise        -> each chapter's scene from the course content
 * Each animation has its own clock unless the page passes one in.
 * Captions sit under the picture, so they never cover a vertex.
 */
export default function VideoSection({ section, clock: given, number, topicId }) {
  const { settings } = useSettings();
  const own = useVideoClock({
    duration: section.chapters.length * CHAPTER_SECONDS,
    chapterLen: CHAPTER_SECONDS,
    stepMode: settings.speedA === 'step',
    initialSpeed: settings.speedA === 'slow' ? 0.75 : 1,
  });
  const clock = given || own;
  const { signal, act } = useTracker();
  const tone = useRippleTone();
  const labelOf = useLabel(settings.labels);
  const [captions, setCaptions] = useState(settings.captions);
  const bfs = useApi(section.bfs ? `/api/bfs?start=${encodeURIComponent(section.bfs)}` : null);
  const chapters = section.chapters;
  const total = chapters.length * CHAPTER_SECONDS;
  const ch = Math.min(clock.chapter, chapters.length - 1);
  const caption = chapters[ch].caption;
  const stepMode = settings.speedA === 'step';
  const frame = bfs.data?.frames[Math.min(ch, bfs.data.frames.length - 1)];

  useEffect(() => setCaptions(settings.captions), [settings.captions]);

  useEffect(() => {
    signal('video', clock.playing);
    if (clock.playing) act('Watching');
  }, [clock.playing, signal, act]);

  useEffect(() => {
    if (clock.ended && topicId === '3') markDone('watched');
  }, [clock.ended, topicId]);

  // Settings > Hear the ripple: a rising tone as each place is served.
  const last = useRef(-1);
  useEffect(() => {
    if (clock.playing && ch !== last.current && frame) {
      const served = frame.order.at(-1);
      if (served) tone(frame.hop[served]);
    }
    last.current = ch;
  }, [ch, clock.playing, frame, tone]);

  return (
    <LessonSection
      id="watch"
      icon="video"
      label={`${number} · Animation · no sound · captions and transcript · ${total} seconds`}
      title={section.title || 'Watch the animation'}
      minor={!section.title}
    >
      <Screen>
        {/* The picture is one image for screen readers; the play button sits beside it, not inside it. */}
        <div className="pic" role="img" aria-label={`Animation (no sound), chapter ${ch + 1} of ${chapters.length}: ${caption}`}>
          {section.bfs ? (
            frame && (
              <>
                <div className="stage">
                  <CampusMap frame={frame} variant="video" progress={clock.progress} labels={settings.labels} />
                </div>
                <QueueStrip queue={frame.q} variant="video" progress={clock.progress} added={frame.added} labels={settings.labels} />
              </>
            )
          ) : (
            <SceneStage scene={chapters[ch].scene || {}} p={clock.started ? clock.progress : 0} labelOf={labelOf} />
          )}
          <span className="vlabel" aria-hidden="true">
            Chapter {ch + 1} of {chapters.length} · {chapters[ch].label}
          </span>
        </div>
        {!clock.started && (
          <button type="button" className="big" aria-label="Play the animation" onClick={clock.play}>
            <Icon name="play" size={34} />
          </button>
        )}
      </Screen>
      {captions && (
        <p className="cap-below" aria-hidden="true">
          {caption}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {clock.started ? caption : ''}
      </p>

      <Controls>
        <Button $icon $variant="primary" aria-label={clock.playing ? 'Pause animation' : 'Play animation'} onClick={clock.toggle}>
          <Icon name={clock.playing ? 'pause' : 'play'} />
        </Button>
        <Button $icon aria-label="Restart animation" onClick={clock.restart}>
          <Icon name="refresh" />
        </Button>
        {stepMode && clock.started && !clock.playing && !clock.ended && (
          <Button onClick={clock.play}>
            Next chapter <Icon name="arrow" size={18} />
          </Button>
        )}
        <div className="track" aria-hidden="true">
          <span style={{ width: `${(clock.t / total) * 100}%` }} />
        </div>
        <span className="small time">
          {fmt(clock.t)} / {fmt(total)}
        </span>
        <Button aria-pressed={captions} onClick={() => setCaptions((c) => !c)}>
          CC {captions ? 'on' : 'off'}
        </Button>
        <Button aria-label={`${clock.speed}× speed, change playback speed`} onClick={clock.cycleSpeed}>
          {clock.speed}× speed
        </Button>
      </Controls>

      <Choices role="group" aria-label="Chapters" style={{ marginTop: 10 }}>
        {chapters.map((c, i) => (
          <Button key={c.label} $on={clock.started && ch === i} aria-pressed={clock.started && ch === i} onClick={() => clock.seekChapter(i)}>
            {i + 1}. {c.label}
          </Button>
        ))}
      </Choices>

      <details style={{ marginTop: 10 }}>
        <summary className="sum">Full transcript</summary>
        <ol style={{ margin: '8px 0 0', paddingLeft: 22 }}>
          {chapters.map((c) => (
            <li key={c.label}>
              <strong>{c.label}.</strong> {c.caption}
            </li>
          ))}
        </ol>
      </details>
    </LessonSection>
  );
}

const Screen = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  background: #0b1424;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--edge);
  font-size: 15px;

  .pic {
    position: absolute;
    inset: 0;
  }
  .stage {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 74%;
  }
  .vlabel {
    position: absolute;
    top: 10px;
    left: 12px;
    padding: 2px 10px;
    border-radius: 6px;
    background: #000000b3;
    color: #fff;
    font-size: 14px;
  }
  .big {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 3px solid #fff;
    background: #0f3a2c;
    color: #8debc5;
    cursor: pointer;
    display: grid;
    place-items: center;
    box-shadow: 0 0 30px #8debc566;
  }

  /* Phones: a taller picture. */
  @media (max-width: 560px) {
    aspect-ratio: 4 / 3;
    .vlabel {
      display: none;
    }
    .stage {
      height: 76%;
    }
  }
  & + .cap-below {
    margin-top: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: #000;
    color: #fff;
    text-align: center;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  .track {
    flex: 1 1 160px;
    height: 10px;
    border-radius: 10px;
    background: var(--soft);
    overflow: hidden;
  }
  .track > span {
    display: block;
    height: 100%;
    background: var(--mint);
  }
  .time {
    font-variant-numeric: tabular-nums;
  }
`;
