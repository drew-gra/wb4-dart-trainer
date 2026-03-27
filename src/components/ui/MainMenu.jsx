import { useState, useEffect } from 'react';
import { MENU_CATEGORIES, GOLD_GRADIENT } from '../../utils/constants';

const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('wb4_install_dismissed') === 'true'
  );

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isStandalone]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('wb4_install_dismissed', 'true');
  };

  const showBanner = !isInstalled && !isStandalone && !dismissed;

  return { showBanner, isIOS, install, dismiss, canInstall: !!deferredPrompt };
};

const SafariShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-text-bottom mx-0.5">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const MainMenu = ({ onModeChange }) => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { showBanner, isIOS, install, dismiss, canInstall } = useInstallPrompt();

  const handleCategoryClick = (category) => {
    if (category.disabled) return;
    onModeChange(category.defaultMode);
  };

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={GOLD_GRADIENT}>
          WB4 Darts Practice App
        </h1>
      </div>

      {/* Install Banner */}
      {showBanner && (
        <div className="mb-6 pl-4 pr-8 py-3 text-center relative">
          <button
            onClick={dismiss}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-300 text-lg"
          >
            &times;
          </button>
          {isIOS ? (
            <p className="text-sm text-gray-300">
              Install for offline access. Tap the share icon <SafariShareIcon />, then <span className="text-yellow-400 font-semibold">'Add to Home Screen'</span>
            </p>
          ) : canInstall ? (
            <div>
              <p className="text-sm text-gray-300 mb-2">Install for offline access.</p>
              <button
                onClick={install}
                className="text-sm font-bold text-yellow-400 border border-yellow-400/50 rounded px-4 py-1.5 hover:bg-yellow-400/10 transition-colors"
              >
                Install WB4
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-300">
              Install for offline access. Use your browser menu to add this app to your home screen.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {/* Practice Categories */}
        {MENU_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            disabled={category.disabled}
            className={`w-full py-6 px-6 rounded-lg text-center transition-all shadow-xl border-2 border-pink-400 ${
              category.disabled 
                ? 'cursor-not-allowed' 
                : 'hover:border-pink-300 transform hover:scale-105'
            }`}
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
          >
            <div 
              className="text-2xl font-black"
              style={GOLD_GRADIENT}
            >
              {category.label}
              {category.comingSoon && <span className="text-sm font-normal text-slate-400 ml-2">(Coming soon)</span>}
            </div>
          </button>
        ))}

        {/* About Section */}
        <div>
          <div className="flex justify-center">
            <button
              onClick={() => setAboutOpen(!aboutOpen)}
              className="py-3 px-6 text-yellow-400 flex flex-col items-center"
            >
              <span className="text-sm font-bold">ABOUT</span>
              <span className="text-3xl">{aboutOpen ? '↑' : '↓'}</span>
            </button>
          </div>

          {aboutOpen && (
            <div className="px-5 pb-2">
              <div className="text-sm text-gray-300 leading-relaxed space-y-4 text-center">
                <p>
                  WB4 is a free darts practice app for solo play. It saves and provides analytics on your last 200 solo practice sessions across six modes:
                </p>
                <div className="space-y-1 text-yellow-400 font-semibold">
                  <p>Double-in (DI): Practice getting in</p>
                  <p>Double-out (DO): Practice getting out</p>
                  <p>Triples (Trips): Practice hitting cricket marks</p>
                  <p>First nine (F9): Practice 501 scoring</p>
                </div>
                <p>
                  It also has modes to practice 501 and cricket alone. The targets in DO and Trips are randomized. Using the app over time produces a data-rich profile of the player's strengths, weaknesses, and overall progress.
                </p>
                <p>
                  No account is needed to use the app and all data is exportable. Switching devices or clearing the browser memory will erase all session data.
                </p>
                <p>
                  Created at The Westbury Inn of the Park Slope Darts League in Brooklyn, New York.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* History & Insights */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onModeChange('history')}
            className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
            style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
          >
            📊 HISTORY
          </button>
          <button
            onClick={() => onModeChange('insights')}
            className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
            style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
          >
            💡 INSIGHTS
          </button>
        </div>
      </div>
    </>
  );
};

export default MainMenu;