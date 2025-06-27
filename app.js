const express = require('express');
const socket = require('socket.io');
const http = require("http");
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
        socket.emit("waitingForPlayer");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");

        // Both players are ready, send board state
        io.to(players.white).emit("boardState", chess.fen());
        io.to(players.black).emit("boardState", chess.fen());
    } else {
        socket.emit("spectatorRole");
        socket.emit("boardState", chess.fen());  // Spectators still need it
    }

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
    });

    socket.on("move", (move) => {
        try {
            if (chess.turn() === 'w' && socket.id !== players.white) return;
            if (chess.turn() === 'b' && socket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move:", move);
                socket.emit("invalidMove", move);
            }
        } catch (err) {
            console.error(err);
            socket.emit("invalidMove", move);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
