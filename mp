<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>501 Multiplayer Demo - WB4 Darts</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
  
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Hide number input spinners */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"] {
      -moz-appearance: textfield;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef } = React;

    // ============================================================================
    // FIREBASE CONFIG - Keep this for both demo and production
    // ============================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyC-2P0ZK-q-hY4MhF_8v1yJV_AxgU8y5F4",
      authDomain: "wb4-darts.firebaseapp.com",
      databaseURL: "https://wb4-darts-default-rtdb.firebaseio.com",
      projectId: "wb4-darts",
      storageBucket: "wb4-darts.firebasestorage.app",
      messagingSenderId: "179763980072",
      appId: "1:179763980072:web:4f9a40b0a0e9163c4c121d"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    // ============================================================================
    // CORE MULTIPLAYER 501 COMPONENT - Copy this into main app
    // ============================================================================
    const Multiplayer501 = () => {
      // State management
      const [view, setView] = useState('menu'); // 'menu', 'create', 'join', 'game'
      const [playerName, setPlayerName] = useState('');
      const [teamName, setTeamName] = useState('');
      const [gameCode, setGameCode] = useState('');
      const [joinCode, setJoinCode] = useState('');
      const [gameState, setGameState] = useState(null);
      const [playerId, setPlayerId] = useState(null);
      const [scoreInput, setScoreInput] = useState('');
      const [statusMessage, setStatusMessage] = useState('');
      
      const gameRef = useRef(null);

      // Constants
      const MAX_PLAYER_NAME = 20;
      const MAX_TEAM_NAME = 25;

      // Styling
      const goldGradient = {
        background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
      };

      // Utility functions
      const generateGameCode = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
      };

      const calculate3DA = (history) => {
        if (!history || history.length === 0) return '0.00';
        const total = history.reduce((sum, score) => {
          return sum + (score === 'BUST' ? 0 : score);
        }, 0);
        return (total / history.length).toFixed(2);
      };

      const calculateScoreFromHistory = (history) => {
        if (!history || history.length === 0) return 501;
        const total = history.reduce((sum, score) => {
          return sum + (score === 'BUST' ? 0 : score);
        }, 0);
        return 501 - total;
      };

      const showStatus = (msg, timeout = 2000) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), timeout);
      };

      // Firebase functions
      const createGame = () => {
        if (!playerName.trim()) {
          showStatus('⚠️ Please enter your name');
          return;
        }

        const code = generateGameCode();
        const gameData = {
          code: code,
          player1: {
            name: playerName,
            team: teamName || '',
            score: 501,
            previousScore: 501,
            history: []
          },
          player2: null,
          currentPlayer: 'player1',
          lastPlayer: null,
          turn: 1,
          status: 'waiting',
          createdAt: Date.now()
        };

        database.ref(`games/${code}`).set(gameData).then(() => {
          setGameCode(code);
          setPlayerId('player1');
          setView('game');
          listenToGame(code);
          showStatus('🎯 Game created!');
        }).catch(err => {
          showStatus('❌ Error creating game');
          console.error(err);
        });
      };

      const joinGame = () => {
        if (!playerName.trim()) {
          showStatus('⚠️ Please enter your name');
          return;
        }
        if (!joinCode.trim()) {
          showStatus('⚠️ Please enter game code');
          return;
        }

        database.ref(`games/${joinCode}`).once('value').then(snapshot => {
          const game = snapshot.val();
          
          if (!game) {
            showStatus('❌ Game not found');
            return;
          }
          
          if (game.status === 'finished') {
            showStatus('❌ Game has ended');
            return;
          }
          
          if (game.status === 'abandoned') {
            showStatus('❌ Game was abandoned');
            return;
          }
          
          if (game.player2) {
            showStatus('❌ Game is full');
            return;
          }

          // Join as player 2
          database.ref(`games/${joinCode}/player2`).set({
            name: playerName,
            team: teamName || '',
            score: 501,
            previousScore: 501,
            history: []
          }).then(() => {
            database.ref(`games/${joinCode}/status`).set('playing');
            setGameCode(joinCode);
            setPlayerId('player2');
            setView('game');
            listenToGame(joinCode);
            showStatus('🎯 Joined game!');
          });
        }).catch(err => {
          showStatus('❌ Error joining game');
          console.error(err);
        });
      };

      const listenToGame = (code) => {
        gameRef.current = database.ref(`games/${code}`);
        gameRef.current.on('value', (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setGameState(data);
          }
        });
      };

      const recordScore = () => {
        if (!scoreInput || scoreInput === '0') return;
        
        const points = parseInt(scoreInput);
        if (points > 180) {
          showStatus('❌ Maximum score is 180');
          return;
        }

        const player = gameState[gameState.currentPlayer];
        const newScore = player.score - points;

        if (newScore < 0) {
          showStatus('❌ Score would go below 0 - BUST!');
          return;
        }

        const newHistory = [...(player.history || []), points];
        const updates = {};
        updates[`${gameState.currentPlayer}/score`] = newScore;
        updates[`${gameState.currentPlayer}/previousScore`] = player.score;
        updates[`${gameState.currentPlayer}/history`] = newHistory;
        updates['lastPlayer'] = gameState.currentPlayer;

        // Check for winner
        if (newScore === 0) {
          updates['status'] = 'finished';
        } else {
          // Switch turns
          const wasPlayer2 = gameState.currentPlayer === 'player2';
          updates['currentPlayer'] = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
          if (wasPlayer2) {
            updates['turn'] = gameState.turn + 1;
          }
        }

        database.ref(`games/${gameCode}`).update(updates);
        setScoreInput('');
      };

      const recordBust = () => {
        const player = gameState[gameState.currentPlayer];
        const newHistory = [...(player.history || []), 'BUST'];
        const updates = {};
        updates[`${gameState.currentPlayer}/score`] = player.previousScore;
        updates[`${gameState.currentPlayer}/history`] = newHistory;
        updates['lastPlayer'] = gameState.currentPlayer;

        // Switch turns
        const wasPlayer2 = gameState.currentPlayer === 'player2';
        updates['currentPlayer'] = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
        if (wasPlayer2) {
          updates['turn'] = gameState.turn + 1;
        }

        database.ref(`games/${gameCode}`).update(updates);
        setScoreInput('');
      };

      const undoLastScore = () => {
        if (!gameState.lastPlayer) return;
        
        const lastPlayer = gameState[gameState.lastPlayer];
        if (!lastPlayer.history || lastPlayer.history.length === 0) return;
        
        const newHistory = [...lastPlayer.history];
        newHistory.pop();
        
        const newScore = calculateScoreFromHistory(newHistory);
        const updates = {};
        updates[`${gameState.lastPlayer}/score`] = newScore;
        updates[`${gameState.lastPlayer}/previousScore`] = newScore;
        updates[`${gameState.lastPlayer}/history`] = newHistory;
        updates['currentPlayer'] = gameState.lastPlayer;
        updates['lastPlayer'] = null;

        // Decrement turn if going back to player 2 from player 1's turn
        if (gameState.currentPlayer === 'player1' && gameState.lastPlayer === 'player2') {
          updates['turn'] = Math.max(1, gameState.turn - 1);
        }

        database.ref(`games/${gameCode}`).update(updates);
      };

      const copyCode = () => {
        navigator.clipboard.writeText(gameCode).then(() => {
          showStatus('✅ Code copied to clipboard!');
        }).catch(() => {
          showStatus('⚠️ Could not copy code');
        });
      };

      const shareViaText = () => {
        const appUrl = 'https://www.wb4darts.com/mp';
        const message = `Join my WB4 Darts game!\n${appUrl}\nCode: ${gameCode}`;
        window.location.href = `sms:?body=${encodeURIComponent(message)}`;
        showStatus('📱 Opening Messages app...');
      };

      const leaveGame = () => {
        if (gameRef.current) {
          gameRef.current.off();
        }
        database.ref(`games/${gameCode}/status`).set('abandoned');
        setView('menu');
        setGameState(null);
        setGameCode('');
        setPlayerId(null);
        setScoreInput('');
      };

      // Cleanup
      useEffect(() => {
        return () => {
          if (gameRef.current) {
            gameRef.current.off();
          }
        };
      }, []);

      // Render helpers
      const isMyTurn = gameState && gameState.currentPlayer === playerId;
      const isGameOver = gameState && gameState.status === 'finished';
      const canUndo = gameState && gameState.lastPlayer && gameState[gameState.lastPlayer].history && gameState[gameState.lastPlayer].history.length > 0;

      // ============================================================================
      // RENDER VIEWS
      // ============================================================================

      // Menu View
      if (view === 'menu') {
        return (
          <div className="min-h-screen bg-black text-white p-4" style={{background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'}}>
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2" style={goldGradient}>501 MULTIPLAYER</h1>
                <p className="text-sm text-gray-400">Play darts with friends in real-time</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setView('create')}
                  className="w-full py-4 rounded-lg font-bold text-white bg-green-600 border-2 border-green-500 hover:bg-green-700 transition-all text-lg"
                >
                  🎯 CREATE GAME
                </button>
                
                <button 
                  onClick={() => setView('join')}
                  className="w-full py-4 rounded-lg font-bold text-white bg-blue-600 border-2 border-blue-500 hover:bg-blue-700 transition-all text-lg"
                >
                  🔗 JOIN GAME
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Create Game View
      if (view === 'create') {
        return (
          <div className="min-h-screen bg-black text-white p-4" style={{background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'}}>
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2" style={goldGradient}>CREATE GAME</h1>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2">
                    Your Name ({playerName.length}/{MAX_PLAYER_NAME})
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={MAX_PLAYER_NAME}
                    className="w-full text-lg font-bold text-center bg-gray-800 text-white rounded p-3 border-2 border-gray-700 focus:border-yellow-500 focus:outline-none"
                    placeholder="Enter name"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-xs text-gray-400 mb-2">
                    Team Name ({teamName.length}/{MAX_TEAM_NAME}) - Optional
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={MAX_TEAM_NAME}
                    className="w-full text-base text-center bg-gray-800 text-gray-300 rounded p-3 border-2 border-gray-700 focus:border-yellow-500 focus:outline-none"
                    placeholder="Enter team"
                  />
                </div>

                <button
                  onClick={createGame}
                  disabled={!playerName.trim()}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                    !playerName.trim()
                      ? 'bg-gray-700 cursor-not-allowed opacity-50'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  CREATE GAME
                </button>
              </div>

              <button
                onClick={() => setView('menu')}
                className="w-full py-3 rounded-lg font-bold bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              >
                ← BACK
              </button>

              {statusMessage && (
                <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-yellow-600 text-center">
                  <div className="text-sm text-yellow-300 font-semibold">{statusMessage}</div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Join Game View
      if (view === 'join') {
        return (
          <div className="min-h-screen bg-black text-white p-4" style={{background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'}}>
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2" style={goldGradient}>JOIN GAME</h1>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mb-6">
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2">
                    Your Name ({playerName.length}/{MAX_PLAYER_NAME})
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={MAX_PLAYER_NAME}
                    className="w-full text-lg font-bold text-center bg-gray-800 text-white rounded p-3 border-2 border-gray-700 focus:border-yellow-500 focus:outline-none"
                    placeholder="Enter name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2">
                    Team Name ({teamName.length}/{MAX_TEAM_NAME}) - Optional
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={MAX_TEAM_NAME}
                    className="w-full text-base text-center bg-gray-800 text-gray-300 rounded p-3 border-2 border-gray-700 focus:border-yellow-500 focus:outline-none"
                    placeholder="Enter team"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-xs text-gray-400 mb-2">Game Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    maxLength={4}
                    className="w-full text-3xl font-bold text-center bg-gray-800 text-yellow-400 rounded p-3 border-2 border-yellow-500 focus:border-yellow-300 focus:outline-none tracking-widest"
                    placeholder="0000"
                    inputMode="numeric"
                  />
                </div>

                <button
                  onClick={joinGame}
                  disabled={!playerName.trim() || !joinCode.trim()}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                    !playerName.trim() || !joinCode.trim()
                      ? 'bg-gray-700 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  JOIN GAME
                </button>
              </div>

              <button
                onClick={() => setView('menu')}
                className="w-full py-3 rounded-lg font-bold bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              >
                ← BACK
              </button>

              {statusMessage && (
                <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-yellow-600 text-center">
                  <div className="text-sm text-yellow-300 font-semibold">{statusMessage}</div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Game View
      if (view === 'game' && gameState) {
        const player1 = gameState.player1;
        const player2 = gameState.player2;
        const waiting = gameState.status === 'waiting';

        return (
          <div className="min-h-screen bg-black text-white p-4" style={{background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'}}>
            <div className="max-w-md mx-auto">
              
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2" style={goldGradient}>501 MULTIPLAYER</h1>
                
                {/* Game Code with Share Buttons */}
                <div className="bg-gray-900 rounded-lg p-3 border border-yellow-600 mb-2">
                  <div className="text-xs text-gray-400 mb-1">GAME CODE</div>
                  <div className="text-3xl font-black tracking-widest mb-3" style={goldGradient}>{gameCode}</div>
                  
                  {waiting && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          onClick={shareViaText}
                          className="py-2 px-4 rounded-lg font-bold text-sm bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 transition-all"
                        >
                          📱 Share via Text
                        </button>
                        <button
                          onClick={copyCode}
                          className="py-2 px-4 rounded-lg font-bold text-sm bg-purple-600 text-white border border-purple-500 hover:bg-purple-700 transition-all"
                        >
                          📋 Copy Code
                        </button>
                      </div>
                      <div className="text-sm text-yellow-400">⏳ Waiting for opponent...</div>
                    </>
                  )}
                </div>
              </div>

              {/* Player Scoreboards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Player 1 */}
                <div className={`bg-gray-900 rounded-lg p-4 border-2 transition-all ${
                  gameState.currentPlayer === 'player1' && !isGameOver
                    ? 'border-green-500' 
                    : 'border-gray-700'
                }`}>
                  <div className="text-base font-bold text-blue-400 text-center">
                    {player1.name}
                    {gameState.currentPlayer === 'player1' && !isGameOver && (
                      <span className="ml-1 text-green-400">🎯</span>
                    )}
                  </div>
                  {player1.team && (
                    <div className="text-xs text-gray-400 text-center mb-2">{player1.team}</div>
                  )}
                  <div className="text-4xl font-black text-center mb-1" style={goldGradient}>
                    {player1.score}
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    3DA: <span className="text-yellow-400 font-bold">{calculate3DA(player1.history)}</span>
                  </div>
                </div>

                {/* Player 2 */}
                <div className={`bg-gray-900 rounded-lg p-4 border-2 transition-all ${
                  gameState.currentPlayer === 'player2' && !isGameOver
                    ? 'border-green-500' 
                    : 'border-gray-700'
                }`}>
                  {player2 ? (
                    <>
                      <div className="text-base font-bold text-red-400 text-center">
                        {player2.name}
                        {gameState.currentPlayer === 'player2' && !isGameOver && (
                          <span className="ml-1 text-green-400">🎯</span>
                        )}
                      </div>
                      {player2.team && (
                        <div className="text-xs text-gray-400 text-center mb-2">{player2.team}</div>
                      )}
                      <div className="text-4xl font-black text-center mb-1" style={goldGradient}>
                        {player2.score}
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        3DA: <span className="text-yellow-400 font-bold">{calculate3DA(player2.history)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-base font-bold text-gray-500">---</div>
                      <div className="text-xs text-gray-600 mt-2">Waiting...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Winner Display */}
              {isGameOver && (
                <div className="bg-gray-900 rounded-lg p-4 border-2 border-yellow-500 text-center mb-6">
                  <div className="text-xl font-bold text-white">
                    {player1.score === 0 ? player1.name : player2.name} wins!
                  </div>
                </div>
              )}

              {/* Score Input and Controls */}
              {!isGameOver && !waiting && (
                <>
                  {isMyTurn ? (
                    <>
                      {/* Input Row */}
                      <div className="grid grid-cols-3 gap-3 mb-3 items-end">
                        <div></div>
                        <div className="text-center">
                          <input
                            type="text"
                            value={scoreInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d+$/.test(value)) {
                                setScoreInput(value);
                              }
                            }}
                            className="text-3xl font-bold text-center bg-gray-800 text-yellow-400 rounded p-3 w-full border-2 border-yellow-500 focus:border-yellow-300 focus:outline-none"
                            inputMode="numeric"
                            placeholder="0"
                            maxLength="3"
                          />
                        </div>
                        <div className="text-center pb-3">
                          <div className="text-xs text-gray-400 mb-1">TURN</div>
                          <div className="text-2xl font-black text-yellow-400">{gameState.turn}</div>
                        </div>
                      </div>

                      {/* Buttons Row */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <button 
                          onClick={recordScore}
                          disabled={!scoreInput || scoreInput === '0'}
                          className={`py-3 px-6 rounded-lg font-bold text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all ${
                            !scoreInput || scoreInput === '0' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          SUBMIT
                        </button>
                        <button 
                          onClick={recordBust}
                          className="py-3 px-6 rounded-lg font-bold text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all"
                        >
                          BUST
                        </button>
                        <button 
                          onClick={undoLastScore}
                          disabled={!canUndo}
                          className={`py-3 px-6 rounded-lg font-bold text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all ${
                            !canUndo ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          UNDO
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-900 rounded-lg p-6 border border-yellow-600 text-center mb-6">
                      <div className="text-yellow-400 font-bold text-lg">⏳ Waiting for opponent's turn...</div>
                    </div>
                  )}
                </>
              )}

              {/* Leave Game Button */}
              <button
                onClick={leaveGame}
                className="w-full py-3 rounded-lg font-bold bg-red-900 text-red-300 border border-red-700 hover:bg-red-800 text-sm transition-all"
              >
                LEAVE GAME
              </button>

              {/* Status Messages */}
              {statusMessage && (
                <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-yellow-600 text-center">
                  <div className="text-sm text-yellow-300 font-semibold">{statusMessage}</div>
                </div>
              )}
            </div>
          </div>
        );
      }

      return null;
    };

    // ============================================================================
    // RENDER APP - This is demo scaffolding, not needed in main app
    // ============================================================================
    ReactDOM.render(<Multiplayer501 />, document.getElementById('root'));
  </script>
</body>
</html>
