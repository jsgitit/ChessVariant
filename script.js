"use strict";

// Represents a chess piece.
class Piece {
  constructor(type, color) {
    this.type = type;
    this.color = color;
  }
  get symbol() {
    const symbols = {
      "K": { white: "♔", black: "♚" },
      "Q": { white: "♕", black: "♛" },
      "R": { white: "♖", black: "♜" },
      "B": { white: "♗", black: "♝" },
      "N": { white: "♘", black: "♞" },
      "P": { white: "♙", black: "♟︎" }
    };
    return symbols[this.type][this.color];
  }
}

// Represents a board cell.
class Cell {
  constructor(row, col, active = false, piece = null) {
    this.row = row;
    this.col = col;
    this.active = active;
    this.piece = piece;
  }
}

// The Board class uses an 8×8 grid but “activates” only a central region that expands.
class Board {
  constructor() {
    this.size = 8;
    this.grid = [];
    // Create an 8x8 grid; initially active cells form a 4x4 region (rows/cols 2–5).
    for (let row = 0; row < 8; row++) {
      let rowCells = [];
      for (let col = 0; col < 8; col++) {
        let active = (row >= 2 && row <= 5 && col >= 2 && col <= 5);
        rowCells.push(new Cell(row, col, active));
      }
      this.grid.push(rowCells);
    }
    // Track the current contiguous active region.
    this.activeRegion = { minRow: 2, maxRow: 5, minCol: 2, maxCol: 5 };
    // Predefined expansion stages: 4×4 → 6×6 → 8×8.
    this.expansionStages = [
      { minRow: 2, maxRow: 5, minCol: 2, maxCol: 5 },
      { minRow: 1, maxRow: 6, minCol: 1, maxCol: 6 },
      { minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 }
    ];
    this.currentStageIndex = 0;
  }

  // Each turn, activate one new cell from the next-stage set.
  expandBoard() {
    if (this.currentStageIndex < this.expansionStages.length - 1) {
      const nextStage = this.expansionStages[this.currentStageIndex + 1];
      let candidates = [];
      for (let row = nextStage.minRow; row <= nextStage.maxRow; row++) {
        for (let col = nextStage.minCol; col <= nextStage.maxCol; col++) {
          if (!this.grid[row][col].active) {
            candidates.push(this.grid[row][col]);
          }
        }
      }
      if (candidates.length > 0) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        cell.active = true;
        // Update active region boundaries.
        this.activeRegion.minRow = Math.min(this.activeRegion.minRow, cell.row);
        this.activeRegion.maxRow = Math.max(this.activeRegion.maxRow, cell.row);
        this.activeRegion.minCol = Math.min(this.activeRegion.minCol, cell.col);
        this.activeRegion.maxCol = Math.max(this.activeRegion.maxCol, cell.col);
      }
      // If boundaries match the next stage, advance the stage.
      if (
        this.activeRegion.minRow === nextStage.minRow &&
        this.activeRegion.maxRow === nextStage.maxRow &&
        this.activeRegion.minCol === nextStage.minCol &&
        this.activeRegion.maxCol === nextStage.maxCol
      ) {
        this.currentStageIndex++;
      }
    }
  }

  // Renders all cells. Inactive cells get a distinct class.
  renderBoard() {
    const boardElement = document.getElementById("chess-board");
    boardElement.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = this.getCell(row, col);
        const cellDiv = document.createElement("div");
        cellDiv.classList.add("cell");
        if (!cell.active) {
          cellDiv.classList.add("inactive");
        } else {
          // Standard chessboard coloring.
          cellDiv.classList.add((row + col) % 2 === 0 ? "light" : "dark");
        }
        cellDiv.dataset.row = row;
        cellDiv.dataset.col = col;
        if (cell.piece) {
          const pieceSpan = document.createElement("span");
          pieceSpan.classList.add("piece");
          pieceSpan.textContent = cell.piece.symbol;
          pieceSpan.draggable = true;
          pieceSpan.addEventListener("dragstart", Game.handleDragStart);
          cellDiv.appendChild(pieceSpan);
        }
        if (cell.active) {
          cellDiv.addEventListener("dragover", Game.handleDragOver);
          cellDiv.addEventListener("drop", Game.handleDrop);
        }
        boardElement.appendChild(cellDiv);
      }
    }
  }

  getCell(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
    return this.grid[row][col];
  }
}

// Main Game class. It handles initialization, moves, board expansion, and undo.
class Game {
  constructor() {
    this.board = new Board();
    this.moveHistory = [];
    this.currentTurn = "white"; // Human plays white.
    this.initPieces();
    this.board.renderBoard();
    this.setupUndoButton();
  }

  // Place back rank (with randomized additional pieces) and pawn rows for both sides.
  initPieces() {
    const ar = this.board.activeRegion;
    // White (bottom of active region)
    const whiteBackRankRow = ar.maxRow;
    const whitePawnRow = whiteBackRankRow - 1;
    const whiteColumns = [ar.minCol, ar.minCol + 1, ar.minCol + 2, ar.maxCol];
    const whiteBackRank = [];
    // Ensure king is in one of the middle two positions.
    const kingPos = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < 4; i++) {
      if (i === kingPos) {
        whiteBackRank.push(new Piece("K", "white"));
      } else {
        const options = ["Q", "R", "B", "N"];
        const randomPiece = options[Math.floor(Math.random() * options.length)];
        whiteBackRank.push(new Piece(randomPiece, "white"));
      }
    }
    for (let i = 0; i < 4; i++) {
      const cell = this.board.getCell(whiteBackRankRow, whiteColumns[i]);
      if (cell) cell.piece = whiteBackRank[i];
    }
    for (let i = 0; i < 4; i++) {
      const cell = this.board.getCell(whitePawnRow, whiteColumns[i]);
      if (cell) cell.piece = new Piece("P", "white");
    }

    // Black (top of active region)
    const blackBackRankRow = ar.minRow;
    const blackPawnRow = blackBackRankRow + 1;
    const blackColumns = [ar.minCol, ar.minCol + 1, ar.minCol + 2, ar.maxCol];
    const blackBackRank = [];
    const blackKingPos = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < 4; i++) {
      if (i === blackKingPos) {
        blackBackRank.push(new Piece("K", "black"));
      } else {
        const options = ["Q", "R", "B", "N"];
        const randomPiece = options[Math.floor(Math.random() * options.length)];
        blackBackRank.push(new Piece(randomPiece, "black"));
      }
    }
    for (let i = 0; i < 4; i++) {
      const cell = this.board.getCell(blackBackRankRow, blackColumns[i]);
      if (cell) cell.piece = blackBackRank[i];
    }
    for (let i = 0; i < 4; i++) {
      const cell = this.board.getCell(blackPawnRow, blackColumns[i]);
      if (cell) cell.piece = new Piece("P", "black");
    }
  }

  // Drag-and-drop event handlers.
  static handleDragStart(e) {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      row: e.target.parentElement.dataset.row,
      col: e.target.parentElement.dataset.col
    }));
  }

  static handleDragOver(e) {
    e.preventDefault();
  }

  static handleDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const toRow = parseInt(e.currentTarget.dataset.row, 10);
    const toCol = parseInt(e.currentTarget.dataset.col, 10);
    game.processPlayerMove(parseInt(data.row, 10), parseInt(data.col, 10), toRow, toCol);
  }

  // Process the human move with basic validation.
  processPlayerMove(fromRow, fromCol, toRow, toCol) {
    const fromCell = this.board.getCell(fromRow, fromCol);
    const toCell = this.board.getCell(toRow, toCol);
    if (!fromCell || !toCell || !toCell.active) return;
    if (!fromCell.piece || fromCell.piece.color !== "white") return;
    // For MVP: allow move if destination is empty or holds an opponent piece.
    if (toCell.piece && toCell.piece.color === "white") return;
    this.moveHistory.push({
      from: { row: fromRow, col: fromCol, piece: fromCell.piece },
      to: { row: toRow, col: toCol, piece: toCell.piece }
    });
    toCell.piece = fromCell.piece;
    fromCell.piece = null;
    // Expand board and re-render.
    this.board.expandBoard();
    this.board.renderBoard();
    this.currentTurn = "black";
    setTimeout(() => { this.processAIMove(); }, 500);
  }

  // AI move using a stubbed minimax placeholder.
  processAIMove() {
    const move = AI.computeBestMove(this.board, "black");
    if (move) {
      const fromCell = this.board.getCell(move.from.row, move.from.col);
      const toCell = this.board.getCell(move.to.row, move.to.col);
      this.moveHistory.push({
        from: { row: move.from.row, col: move.from.col, piece: fromCell.piece },
        to: { row: move.to.row, col: move.to.col, piece: toCell.piece }
      });
      toCell.piece = fromCell.piece;
      fromCell.piece = null;
    }
    this.board.expandBoard();
    this.board.renderBoard();
    this.currentTurn = "white";
  }

  // Setup the undo button to revert the last two moves.
  setupUndoButton() {
    document.getElementById("undo-btn").addEventListener("click", () => {
      this.undoLastMoves();
    });
  }

  undoLastMoves() {
    if (this.moveHistory.length >= 2) {
      const lastAIMove = this.moveHistory.pop();
      const lastPlayerMove = this.moveHistory.pop();
      // Revert AI move.
      const aiFrom = this.board.getCell(lastAIMove.from.row, lastAIMove.from.col);
      const aiTo = this.board.getCell(lastAIMove.to.row, lastAIMove.to.col);
      aiFrom.piece = lastAIMove.from.piece;
      aiTo.piece = lastAIMove.to.piece;
      // Revert player move.
      const playerFrom = this.board.getCell(lastPlayerMove.from.row, lastPlayerMove.from.col);
      const playerTo = this.board.getCell(lastPlayerMove.to.row, lastPlayerMove.to.col);
      playerFrom.piece = lastPlayerMove.from.piece;
      playerTo.piece = lastPlayerMove.to.piece;
      this.board.renderBoard();
      if (this.currentTurn === "white") {
        this.currentTurn = "black";
        setTimeout(() => { this.processAIMove(); }, 500);
      }
    }
  }
}

// The AI class contains stubs for minimax with alpha–beta pruning.
// For the MVP, it simply selects a random valid move.
class AI {
  static computeBestMove(board, color) {
    const moves = AI.generateValidMoves(board, color);
    if (moves.length === 0) return null;
    // Placeholder: select a random move.
    return moves[Math.floor(Math.random() * moves.length)];
  }

  static generateValidMoves(board, color) {
    let moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board.getCell(row, col);
        if (cell.active && cell.piece && cell.piece.color === color) {
          moves.push(...AI.getPieceMoves(board, cell, cell.piece));
        }
      }
    }
    return moves;
  }

  static getPieceMoves(board, cell, piece) {
    let moves = [];
    // Pawn move: one square forward if empty.
    if (piece.type === "P") {
      const dir = piece.color === "white" ? -1 : 1;
      const target = board.getCell(cell.row + dir, cell.col);
      if (target && target.active && !target.piece) {
        moves.push({ from: { row: cell.row, col: cell.col }, to: { row: cell.row + dir, col: cell.col } });
      }
    }
    // King move: one square any direction.
    else if (piece.type === "K") {
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0) continue;
          const target = board.getCell(cell.row + dRow, cell.col + dCol);
          if (target && target.active && (!target.piece || target.piece.color !== piece.color)) {
            moves.push({ from: { row: cell.row, col: cell.col }, to: { row: cell.row + dRow, col: cell.col + dCol } });
          }
        }
      }
    }
    // For other pieces (Q, R, B, N), allow a single step in any direction.
    else {
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0) continue;
          const target = board.getCell(cell.row + dRow, cell.col + dCol);
          if (target && target.active && (!target.piece || target.piece.color !== piece.color)) {
            moves.push({ from: { row: cell.row, col: cell.col }, to: { row: cell.row + dRow, col: cell.col + dCol } });
          }
        }
      }
    }
    return moves;
  }
}

// Initialize the game.
let game = new Game();
