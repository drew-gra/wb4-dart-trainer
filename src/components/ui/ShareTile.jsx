import React, { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { GOLD_GRADIENT } from '../../utils/constants';

// Share icon SVG
const ShareIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

/**
 * Share button — sits inside the YOUR METRICS card header
 */
export const ShareButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2a2f42] bg-[#252a3a] text-slate-400 text-xs font-semibold hover:text-gray-300 hover:bg-[#2a2f42] transition-all"
  >
    <ShareIcon size={14} />
    Share
  </button>
);

/**
 * The 1080×1080 share tile — rendered off-screen for capture
 * 
 * Uses solid gold (#ffd700) instead of gradient for background-clip: text
 * compatibility with html-to-image. The gradient doesn't survive
 * SVG foreignObject rendering in all browsers.
 */
const ShareTile = ({ metrics, playerName, playerTeam, totalDarts }) => {
  const exportGold = { color: '#ffd700', fontWeight: 900, lineHeight: 1 };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      style={{
        width: '1080px',
        height: '1080px',
        background: '#030712',
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '48px',
        padding: '64px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top spacer */}
      <div style={{ flex: 1 }} />

      {/* Name + Team */}
      <div style={{ textAlign: 'center' }}>
        {playerName && (
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#f3f4f6',
              lineHeight: 1.2,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {playerName}
          </div>
        )}
        {playerTeam && (
          <div
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: '#6b7280',
              marginTop: '8px',
            }}
          >
            {playerTeam}
          </div>
        )}
      </div>

      {/* Metrics 2×2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '56px 96px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>
            3-DART AVG
          </div>
          <div style={{ ...exportGold, fontSize: '144px' }}>{metrics.unified3DA}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>
            MARKS / ROUND
          </div>
          <div style={{ ...exportGold, fontSize: '144px' }}>{metrics.unifiedMPR}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>
            DOUBLE-IN %
          </div>
          <div style={{ ...exportGold, fontSize: '144px' }}>
            {metrics.doubleInPct}<span style={{ ...exportGold, fontSize: '72px' }}>%</span>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>
            CHECKOUT %
          </div>
          <div style={{ ...exportGold, fontSize: '144px' }}>
            {metrics.checkoutPct}<span style={{ ...exportGold, fontSize: '72px' }}>%</span>
          </div>
        </div>
      </div>

      {/* Gold line */}
      <div
        style={{
          width: '60%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #eab308, transparent)',
        }}
      />

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: 'auto',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em' }}>
          {timeStr} · {dateStr}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em' }}>
          {totalDarts.toLocaleString()} darts thrown
        </div>
        <div style={{ fontSize: '32px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em' }}>
          www.wb4darts.com
        </div>
      </div>
    </div>
  );
};

/**
 * Share Preview Overlay — shows scaled tile preview + export actions
 */
export const SharePreviewOverlay = ({ isOpen, onClose, metrics, playerName, playerTeam, totalDarts }) => {
  const tileRef = useRef(null);

  const handleExport = useCallback(async () => {
    if (!tileRef.current) return;

    try {
      const dataUrl = await toPng(tileRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 1,
      });

      // Try native share (mobile), fall back to download (desktop)
      if (navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'wb4-training-report.png', { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'WB4 Training Report',
          });
          onClose();
          return;
        }
      }

      // Desktop fallback: download
      const link = document.createElement('a');
      link.download = 'wb4-training-report.png';
      link.href = dataUrl;
      link.click();
      onClose();
    } catch (err) {
      // User cancelled share sheet, or export failed
      if (err.name !== 'AbortError') {
        console.error('Export failed:', err);
      }
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-85 flex flex-col items-center justify-center z-50 p-6">
      {/* Scaled preview */}
      <div
        className="rounded-xl overflow-hidden shadow-2xl border border-[#2a2f42] mb-5"
        style={{ width: '340px', height: '340px' }}
      >
        <div
          style={{
            transform: `scale(${340 / 1080})`,
            transformOrigin: 'top left',
            width: '1080px',
            height: '1080px',
          }}
        >
          {/* Preview clone — visible to user */}
          <ShareTile
            metrics={metrics}
            playerName={playerName}
            playerTeam={playerTeam}
            totalDarts={totalDarts}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3" style={{ width: '340px' }}>
        <button
          onClick={handleExport}
          className="flex-1 py-3.5 rounded-lg font-bold text-base border-2 border-amber-500 text-yellow-500 hover:bg-yellow-500 hover:bg-opacity-10 transition-all"
        >
          {navigator.canShare ? 'Share' : 'Save Image'}
        </button>
        <button
          onClick={onClose}
          className="px-5 py-3.5 rounded-lg font-semibold text-base border border-[#2a2f42] bg-[#252a3a] text-slate-400 hover:bg-[#2a2f42] transition-all"
        >
          Close
        </button>
      </div>

      {/* Hidden full-size tile for capture */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
        }}
      >
        <div ref={tileRef}>
          <ShareTile
            metrics={metrics}
            playerName={playerName}
            playerTeam={playerTeam}
            totalDarts={totalDarts}
          />
        </div>
      </div>
    </div>
  );
};
