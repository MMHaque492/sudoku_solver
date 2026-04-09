// script.js
// ---------- DOM Elements ----------
const gridContainer = document.getElementById('sudoku-grid');
const timerDisplay = document.getElementById('timerDisplay');
const moveCounterSpan = document.getElementById('moveCounter');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const noteModeBtn = document.getElementById('noteModeBtn');
const hintBtn = document.getElementById('hintBtn');
const autoSolveBtn = document.getElementById('autoSolveBtn');
const saveGameBtn = document.getElementById('saveGameBtn');
const resumeGameBtn = document.getElementById('resumeGameBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const themeToggle = document.getElementById('themeToggle');
const messageToast = document.getElementById('messageToast');

// ---------- Game State ----------
let board = Array(9).fill().map(() => Array(9).fill(0));   // current numbers
let notes = Array(9).fill().map(() => Array(9).fill().map(() => Array(9).fill(false))); // [row][col][digit-1]
let solution = null;          // original solution for current puzzle
let difficulty = 'medium';
let timerSeconds = 0;
let timerInterval = null;
let moveCount = 0;
let isGameActive = true;
let noteMode = false;

// Undo/Redo stacks
let undoStack = [];
let redoStack = [];

// Selected cell
let selectedRow = -1, selectedCol = -1;

// Predefined puzzles (fallback)
const fallbackPuzzles = {
    easy: [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],
    medium: [[0,0,0,2,6,0,7,0,1],[6,8,0,0,7,0,0,9,0],[1,9,0,0,0,4,5,0,0],[8,2,0,1,0,0,0,4,0],[0,0,4,6,0,2,9,0,0],[0,5,0,0,0,3,0,2,8],[0,0,9,3,0,0,0,7,4],[0,4,0,0,5,0,0,3,6],[7,0,3,0,1,8,0,0,0]],
    hard: [[0,0,0,6,0,0,4,0,0],[7,0,0,0,0,3,6,0,0],[0,5,0,0,0,0,0,0,1],[0,0,7,0,8,0,0,6,0],[0,0,0,0,0,0,0,9,0],[0,2,0,0,9,0,5,0,0],[3,0,0,0,0,0,0,1,0],[0,0,9,8,0,0,0,0,7],[0,0,6,0,0,5,0,0,9]]
};

// ---------- Helper Functions ----------
function showMessage(msg, isError = false) {
    messageToast.textContent = msg;
    messageToast.classList.add('show');
    setTimeout(() => messageToast.classList.remove('show'), 2000);
}

function updateTimerDisplay() {
    timerDisplay.textContent = timerSeconds;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isGameActive) {
            timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function incrementMove() {
    moveCount++;
    moveCounterSpan.textContent = moveCount;
}

// Push current state to undo stack
function pushState() {
    const boardCopy = board.map(row => [...row]);
    const notesCopy = notes.map(row => row.map(cell => [...cell]));
    undoStack.push({ board: boardCopy, notes: notesCopy });
    redoStack = []; // clear redo on new action
}

function undo() {
    if (undoStack.length === 0) {
        showMessage("Nothing to undo");
        return;
    }
    const currentState = { board: board.map(row => [...row]), notes: notes.map(row => row.map(cell => [...cell])) };
    const prevState = undoStack.pop();
    redoStack.push(currentState);
    board = prevState.board;
    notes = prevState.notes;
    renderBoard();
    checkWinCondition();
    showMessage("Undo done");
}

function redo() {
    if (redoStack.length === 0) {
        showMessage("Nothing to redo");
        return;
    }
    const nextState = redoStack.pop();
    const currentState = { board: board.map(row => [...row]), notes: notes.map(row => row.map(cell => [...cell])) };
    undoStack.push(currentState);
    board = nextState.board;
    notes = nextState.notes;
    renderBoard();
    checkWinCondition();
    showMessage("Redo done");
}

// Conflict detection
function hasConflict(row, col, num) {
    if (num === 0) return false;
    for (let j = 0; j < 9; j++) {
        if (j !== col && board[row][j] === num) return true;
    }
    for (let i = 0; i < 9; i++) {
        if (i !== row && board[i][col] === num) return true;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
            if ((i !== row || j !== col) && board[i][j] === num) return true;
        }
    }
    return false;
}

function renderBoard() {
    gridContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (selectedRow === i && selectedCol === j) cell.classList.add('selected');
            const value = board[i][j];
            const isGiven = solution && solution[i][j] !== 0 && board[i][j] !== 0 && (originalPuzzle && originalPuzzle[i][j] !== 0);
            if (isGiven) cell.classList.add('given');
            
            // Check conflict
            if (value !== 0 && hasConflict(i, j, value)) {
                cell.classList.add('conflict');
            }
            
            if (value !== 0) {
                cell.textContent = value;
            } else {
                // Render notes
                const notesDiv = document.createElement('div');
                notesDiv.className = 'notes-container';
                for (let d = 1; d <= 9; d++) {
                    const noteSpan = document.createElement('span');
                    noteSpan.className = 'note-digit';
                    if (notes[i][j][d-1]) {
                        noteSpan.textContent = d;
                    } else {
                        noteSpan.textContent = '';
                    }
                    notesDiv.appendChild(noteSpan);
                }
                cell.appendChild(notesDiv);
            }
            
            cell.addEventListener('click', (function(r, c) { return function() { selectCell(r, c); }; })(i, j));
            gridContainer.appendChild(cell);
        }
    }
}

let originalPuzzle = null;
function selectCell(row, col) {
    selectedRow = row;
    selectedCol = col;
    renderBoard();
}

function setNumber(num) {
    if (selectedRow === -1 || selectedCol === -1) {
        showMessage("Select a cell first");
        return;
    }
    if (!isGameActive) return;
    // If note mode is on
    if (noteMode) {
        pushState();
        notes[selectedRow][selectedCol][num-1] = !notes[selectedRow][selectedCol][num-1];
        if (board[selectedRow][selectedCol] !== 0) {
            board[selectedRow][selectedCol] = 0; // clear number when adding notes
        }
        incrementMove();
        renderBoard();
        return;
    }
    
    // Normal number placement
    pushState();
    // Clear notes for this cell
    notes[selectedRow][selectedCol] = Array(9).fill(false);
    if (num === 0) {
        board[selectedRow][selectedCol] = 0;
    } else {
        board[selectedRow][selectedCol] = num;
    }
    incrementMove();
    renderBoard();
    checkWinCondition();
}

function checkWinCondition() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) return false;
            if (hasConflict(i, j, board[i][j])) return false;
        }
    }
    // Win!
    if (isGameActive) {
        isGameActive = false;
        stopTimer();
        showMessage(`🎉 You won! Time: ${timerSeconds}s, Moves: ${moveCount} 🎉`);
        // Prompt for leaderboard
        const playerName = prompt("Congratulations! Enter your name for leaderboard:", "Player");
        if (playerName) {
            fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playerName, difficulty: difficulty, time: timerSeconds, moves: moveCount })
            }).then(() => showMessage("Score submitted!"));
        }
    }
    return true;
}

async function newGame(diff = difficulty) {
    stopTimer();
    pushState(); // save empty? but we reset anyway
    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty: diff })
        });
        const data = await res.json();
        if (data.puzzle) {
            board = data.puzzle.map(row => [...row]);
            solution = data.solution;
            originalPuzzle = data.puzzle.map(row => [...row]);
        } else {
            throw new Error();
        }
    } catch(e) {
        // fallback
        const fallback = fallbackPuzzles[diff];
        board = fallback.map(row => [...row]);
        solution = null;
    }
    notes = Array(9).fill().map(() => Array(9).fill().map(() => Array(9).fill(false)));
    timerSeconds = 0;
    moveCount = 0;
    isGameActive = true;
    selectedRow = -1;
    updateTimerDisplay();
    moveCounterSpan.textContent = "0";
    undoStack = [];
    redoStack = [];
    startTimer();
    renderBoard();
}

async function autoSolve() {
    if (!isGameActive) return;
    pushState();
    try {
        const res = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board: board })
        });
        const data = await res.json();
        if (data.solution) {
            board = data.solution;
            notes = Array(9).fill().map(() => Array(9).fill().map(() => Array(9).fill(false)));
            renderBoard();
            checkWinCondition();
            showMessage("Auto-solved!");
        } else {
            showMessage("Cannot solve this board");
        }
    } catch(e) {
        showMessage("Solve error");
    }
}

async function getHint() {
    if (!isGameActive) return;
    try {
        const res = await fetch('/api/hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board: board })
        });
        const data = await res.json();
        if (data.row !== undefined) {
            pushState();
            board[data.row][data.col] = data.value;
            notes[data.row][data.col] = Array(9).fill(false);
            renderBoard();
            incrementMove();
            checkWinCondition();
            showMessage(`Hint: Place ${data.value} at row ${data.row+1}, col ${data.col+1}`);
        } else {
            showMessage("No hint available");
        }
    } catch(e) {
        showMessage("Hint error");
    }
}

// Save game to localStorage
function saveGame() {
    const saveData = {
        board, notes, timerSeconds, moveCount, difficulty, solution, originalPuzzle, isGameActive
    };
    localStorage.setItem('sudoku_save', JSON.stringify(saveData));
    showMessage("Game saved!");
}

function resumeGame() {
    const raw = localStorage.getItem('sudoku_save');
    if (!raw) {
        showMessage("No saved game found");
        return;
    }
    try {
        const data = JSON.parse(raw);
        board = data.board;
        notes = data.notes;
        timerSeconds = data.timerSeconds;
        moveCount = data.moveCount;
        difficulty = data.difficulty;
        solution = data.solution;
        originalPuzzle = data.originalPuzzle;
        isGameActive = data.isGameActive;
        stopTimer();
        if (isGameActive) startTimer();
        updateTimerDisplay();
        moveCounterSpan.textContent = moveCount;
        undoStack = [];
        redoStack = [];
        renderBoard();
        showMessage("Game resumed");
    } catch(e) { showMessage("Corrupted save"); }
}

// Leaderboard Modal
const modal = document.getElementById('leaderboardModal');
const closeModal = document.querySelector('.close');
const leaderboardList = document.getElementById('leaderboardList');

async function showLeaderboard(diff = 'easy') {
    const res = await fetch(`/api/leaderboard?difficulty=${diff}`);
    const scores = await res.json();
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<p>No scores yet. Play and win!</p>';
        return;
    }
    leaderboardList.innerHTML = scores.map((s, idx) => `
        <div class="leaderboard-item">
            <span>${idx+1}. ${s.name}</span>
            <span>⏱️ ${s.time}s  📊 ${s.moves} moves</span>
        </div>
    `).join('');
}

leaderboardBtn.onclick = () => {
    modal.classList.remove('hidden');
    showLeaderboard('easy');
};
closeModal.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => { if(e.target === modal) modal.classList.add('hidden'); };
document.querySelectorAll('.lb-diff-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.lb-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showLeaderboard(btn.dataset.diff);
    };
});

// Theme toggle
themeToggle.onclick = () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light' : '🌙 Dark';
};

// Event Listeners
newGameBtn.onclick = () => {
    const activeDiff = document.querySelector('.difficulty-btn.active').dataset.diff;
    difficulty = activeDiff;
    newGame(difficulty);
};
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        newGame(difficulty);
    };
});
undoBtn.onclick = undo;
redoBtn.onclick = redo;
noteModeBtn.onclick = () => {
    noteMode = !noteMode;
    noteModeBtn.textContent = noteMode ? "✏️ Notes ON" : "✏️ Notes OFF";
    noteModeBtn.style.background = noteMode ? "#fbbf24" : "";
};
hintBtn.onclick = getHint;
autoSolveBtn.onclick = autoSolve;
saveGameBtn.onclick = saveGame;
resumeGameBtn.onclick = resumeGame;

document.querySelectorAll('.num-row button').forEach(btn => {
    btn.onclick = () => {
        const num = parseInt(btn.dataset.num);
        if (btn.classList.contains('delete-btn')) setNumber(0);
        else setNumber(num);
    };
});

// Initialize
newGame('medium');