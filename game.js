const peer = new Peer();
let playerId, roomId, players = [], myCards = [], turn = 0, conn;
const objects = ["Cat", "Dog", "Monkey", "Lion"];

peer.on("open", (id) => {
    playerId = id;
    console.log("Connected as", playerId);
});

// Create a game and share the room ID
function createGame() {
    roomId = playerId; // Use peer ID as the room ID
    document.getElementById("roomId").innerText = roomId;
    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.getElementById("player").innerText = "Host";

    players.push(playerId); // Host is the first player
    myCards = generateRandomCards();
    renderCards();

    peer.on("connection", (conn) => {
        conn.on("open", () => {
            console.log("New player joined!");
            players.push(conn.peer);
            conn.send({ type: "welcome", players });
        });

        conn.on("data", (data) => handleGameData(data, conn));
    });
}

// Join an existing game
function joinGame() {
    roomId = document.getElementById("gameCode").value;
    if (!roomId) return alert("Enter a game code!");

    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.getElementById("player").innerText = "Player";

    conn = peer.connect(roomId);
    conn.on("open", () => {
        console.log("Connected to the game host!");
        conn.send({ type: "join", playerId });
    });

    conn.on("data", (data) => handleGameData(data, conn));
}

// Generate random cards
function generateRandomCards() {
    let cards = [];
    while (cards.length < 4) {
        let card = objects[Math.floor(Math.random() * objects.length)];
        cards.push(card);
    }
    return cards;
}

// Render cards
function renderCards() {
    let cardContainer = document.getElementById("cards");
    cardContainer.innerHTML = "";
    myCards.forEach((card, index) => {
        let cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerText = card;
        cardElement.onclick = () => selectCard(index);
        cardContainer.appendChild(cardElement);
    });
}

// Select and pass a card
function selectCard(index) {
    if (turn !== players.indexOf(playerId)) return alert("Not your turn!");
    
    let selectedCard = myCards[index];
    myCards.splice(index, 1);
    let nextPlayer = (turn + 1) % players.length;

    if (conn) {
        conn.send({ type: "passCard", card: selectedCard, nextTurn: nextPlayer });
    } else {
        broadcast({ type: "passCard", card: selectedCard, nextTurn: nextPlayer });
    }

    turn = nextPlayer;
    renderCards();
}

// Pass the card to the next player
function passCard() {
    document.getElementById("passBtn").disabled = true;
}

// Handle incoming game data
function handleGameData(data, conn) {
    if (data.type === "welcome") {
        players = data.players;
        myCards = generateRandomCards();
        renderCards();
    } else if (data.type === "passCard") {
        myCards.push(data.card);
        turn = data.nextTurn;
        renderCards();
        checkWinCondition();
    }
}

// Broadcast data to all connected players
function broadcast(data) {
    players.forEach((player) => {
        if (player !== playerId) {
            let connection = peer.connect(player);
            connection.on("open", () => connection.send(data));
        }
    });
}

// Check win condition
function checkWinCondition() {
    let count = {};
    myCards.forEach(card => count[card] = (count[card] || 0) + 1);

    for (let key in count) {
        if (count[key] === 3) {
            document.getElementById("status").innerText = "You win!";
            return;
        }
    }

    document.getElementById("status").innerText = `Waiting for Player ${turn + 1}'s turn...`;
    document.getElementById("passBtn").disabled = turn !== players.indexOf(playerId);
}
