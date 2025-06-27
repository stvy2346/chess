const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
const roleDisplay = document.getElementById("roleDisplay");
const turnDisplay = document.getElementById("turnDisplay");
const statusOverlay = document.getElementById("statusOverlay");
const toast = document.getElementById("toast");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const unicodePieces = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};

const getPieceUnicode = (piece) => {
    return unicodePieces[piece.color][piece.type] || '';
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);

                pieceElement.draggable = (playerRole === square.color && chess.turn() === square.color);

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: colIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece && sourceSquare) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });
};

const handleMove = (source, target) => {
    if ((playerRole === 'w' && chess.turn() !== 'w') || (playerRole === 'b' && chess.turn() !== 'b')) {
        return;
    }

    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    };

    socket.emit("move", move);
};

const updateStatusOverlay = (message) => {
    statusOverlay.style.display = "flex";
    statusOverlay.innerText = message;
};

const hideOverlay = () => {
    statusOverlay.style.display = "none";
};

const showTurn = () => {
    const turn = chess.turn();
    turnDisplay.textContent = `Turn: ${turn === 'w' ? "White" : "Black"}`;
};

const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
};

socket.on("playerRole", (role) => {
    playerRole = role.toLowerCase();
    boardElement.classList.toggle("flipped", playerRole === 'b');
    roleDisplay.textContent = `Role: ${playerRole === 'w' ? 'White' : 'Black'}`;
    hideOverlay();
    renderBoard();
    showTurn();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    roleDisplay.textContent = "Role: Spectator";
    boardElement.classList.remove("flipped");
    hideOverlay();
    renderBoard();
    showTurn();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
    showTurn();

    if (chess.game_over()) {
        const winner =
            chess.in_checkmate() ? (chess.turn() === 'w' ? 'Black' : 'White') + " Wins!" :
            "Draw";
        updateStatusOverlay(`Game Over - ${winner}`);
    } else {
        hideOverlay();
    }
});

socket.on("invalidMove", (move) => {
    showToast(`Invalid move: ${move.from} → ${move.to}`);
});

socket.on("waitingForPlayer", () => {
    console.log("Received waitingForPlayer");
    updateStatusOverlay("Waiting for other player to join...");
});