import { useState } from 'react';
import type { HAEntity } from '../hooks/useHA';

interface Props {
  entity: HAEntity;
  onBrightness: (value: number) => void;
  onColor: (rgb: [number, number, number]) => void;
}

const PRESET_COLORS: { name: string; rgb: [number, number, number] }[] = [
  { name: 'Branco', rgb: [255, 255, 255] },
  { name: 'Quente', rgb: [255, 180, 100] },
  { name: 'Vermelho', rgb: [255, 30, 30] },
  { name: 'Laranja', rgb: [255, 140, 0] },
  { name: 'Amarelo', rgb: [255, 230, 50] },
  { name: 'Verde', rgb: [0, 255, 100] },
  { name: 'Ciano', rgb: [0, 230, 255] },
  { name: 'Azul', rgb: [40, 80, 255] },
  { name: 'Roxo', rgb: [160, 50, 255] },
  { name: 'Rosa', rgb: [255, 60, 150] },
];

export default function LightControls({ entity, onBrightness, onColor }: Props) {
  const modes = (entity.attributes.supported_color_modes || []) as string[];
  const supportsBrightness = modes.some((m) => m !== 'onoff');
  const supportsColor = modes.some((m) => ['hs', 'rgb', 'xy', 'rgbw', 'rgbww'].includes(m));

  const currentBrightness = entity.attributes.brightness ?? 255;
  const pct = Math.round((currentBrightness / 255) * 100);
  const currentRgb = entity.attributes.rgb_color || [255, 255, 255];

  const [localPct, setLocalPct] = useState(pct);
  const [dragging, setDragging] = useState(false);

  if (!supportsBrightness && !supportsColor) return null;

  function handleBrightnessChange(val: number) {
    setLocalPct(val);
    const brightness = Math.round((val / 100) * 255);
    onBrightness(brightness);
  }

  return (
    <div className="light-controls">
      {supportsBrightness && (
        <div className="brightness-control">
          <div className="brightness-header">
            <span className="brightness-label">☀ Brilho</span>
            <span className="brightness-value">{dragging ? localPct : pct}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={dragging ? localPct : pct}
            onChange={(e) => {
              setDragging(true);
              setLocalPct(Number(e.target.value));
            }}
            onMouseUp={() => { setDragging(false); handleBrightnessChange(localPct); }}
            onTouchEnd={() => { setDragging(false); handleBrightnessChange(localPct); }}
            className="brightness-slider"
            style={{
              background: `linear-gradient(90deg, var(--neon-amber) ${dragging ? localPct : pct}%, rgba(255,255,255,0.06) ${dragging ? localPct : pct}%)`,
            }}
          />
        </div>
      )}

      {supportsColor && (
        <div className="color-control">
          <span className="brightness-label">🎨 Cor</span>
          <div className="color-grid">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.name}
                className={`color-swatch ${
                  currentRgb[0] === c.rgb[0] && currentRgb[1] === c.rgb[1] && currentRgb[2] === c.rgb[2] ? 'active' : ''
                }`}
                style={{ background: `rgb(${c.rgb.join(',')})` }}
                onClick={() => onColor(c.rgb)}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
