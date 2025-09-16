// ——————————— Variables globales ———————————
const board        = document.querySelector("#board");
const colorsPots   = ["redPot","bluePot","greenPot","yellowPot"];
const drop         = document.querySelector("#drop");
const ladderAudio  = document.querySelector("#ladder");
const snakeAudio   = document.querySelector("#snake");
const diceAudio    = document.querySelector("#diceAudio");
const successAudio = document.querySelector("#success");
const bgMusic      = document.querySelector("#bgMusic");

const modalWin     = document.querySelector("#modal");
const wname        = document.querySelector("#wname");
const wimg         = document.querySelector("#wimg");

const examModal    = document.querySelector("#examModal");
const hintBtn      = document.querySelector("#useHint");
const submitBtn    = document.querySelector("#submitExam");

// Tablero: escaleras y serpientes
const ladders = [
  [4,16,17,25],[21,39],
  [29,32,33,48,53,67,74],
  [43,57,64,76],[63,62,79,80],[71,89]
];
const snakes = [
  [30,12,13,7],
  [47,46,36,35,27,15],
  [56,44,38,23,19],
  [73,69,51],
  [82,79,62,59,42],
  [92,88,75],
  [98,97,83,84,85,77,64,76,65,55]
];

// Dados y jugadores
const diceArray     = [1,2,3,4,5,6];
const playerNumbers = [1,2,3,4];
const diceIcons     = [
  "fa-dice-one","fa-dice-two","fa-dice-three",
  "fa-dice-four","fa-dice-five","fa-dice-six"
];
const players = [
  { name:"Player 1", image:1, score:0 },
  { name:"Player 2", image:0, score:0 },
  { name:"Player 3", image:3, score:0 },
  { name:"Player 4", image:4, score:0 }
];
let playersCount  = 2;
let currentPlayer = 1;

// Estado de examen
const examState = {
  active:       false,
  type:         null,    // "snake" | "final"
  player:       null,
  snakeIndex:   null,
  questions:    [],
  currentIndex: 0,
  retries:      2,
  lives:        0,
  hints:        0
};
let globalHints = 0; // pistas acumuladas

// ——————————— Inicialización ———————————
function drawBoard() {
  let content="", box=101;
  for(let i=0;i<10;i++){
    for(let j=0;j<10;j++){
      if(i%2===0) box--;
      content += `<div class="box" id="potBox${box}"></div>`;
      if(i%2!==0) box++;
    }
    box -= 10;
  }
  board.innerHTML = content;
}

function initialState(){
  drawBoard();
  document.querySelector("#screen2").style.display="none";
  document.querySelector("#screen3").style.display="none";
  // Arranca música de fondo
  bgMusic.volume = 0.3;
  bgMusic.play();
}
initialState();

// — Selección de jugadores y pantallas —
function selectPlayers(v){
  const boxes = document.getElementsByClassName("selectBox");
  boxes[playersCount-2].classList.remove("selected");
  boxes[v-2].classList.add("selected");
  playersCount = v;
}
function start(){
  document.querySelector("#screen1").style.display="none";
  document.querySelector("#screen2").style.display="block";
  for(let i=playersCount+1;i<5;i++){
    document.getElementById(`card${i}`).style.display="none";
  }
}
function back(){
  document.querySelector("#screen2").style.display="none";
  document.querySelector("#screen1").style.display="block";
}
function next(){
  document.querySelector("#screen2").style.display="none";
  document.querySelector("#screen3").style.display="block";
  for(let i=playersCount+1;i<5;i++){
    document.getElementById(`playerCard${i}`).style.display="none";
  }
  displayNames();
  disableDices();
}
function displayNames(){
  for(let i=1;i<=playersCount;i++){
    document.getElementById(`displayName${i}`).textContent = players[i-1].name;
    document.getElementById(`avatar${i}`).src = `images/avatars/${players[i-1].image}.png`;
  }
}
function updateUserProfile(pNo, dir){
  const max = 8;
  let img = players[pNo-1].image;
  players[pNo-1].image = dir===1 ? (img+1)%max : (img+max-1)%max;
  document.getElementById(`profile${pNo}`).src = `images/avatars/${players[pNo-1].image}.png`;
}
function changeName(pNo){
  const v = document.getElementById(`name${pNo}`).value.trim();
  players[pNo-1].name = v || `Player ${pNo}`;
}

// — Pintar fichas —
function resetBoard(){
  for(let i=1;i<=100;i++){
    document.getElementById(`potBox${i}`).innerHTML = "";
  }
}
function updateBoard(){
  resetBoard();
  for(let i=0;i<playersCount;i++){
    const pos = players[i].score;
    if(pos>0){
      document.getElementById(`potBox${pos}`)
        .innerHTML += `<div class="pot ${colorsPots[i]}"></div>`;
    }
  }
}

// — Movimiento y dados —
function rollDice(pNo){
  if(examState.active || pNo!==currentPlayer) return;
  diceAudio.currentTime=0; diceAudio.play();
  const d = diceArray[Math.floor(Math.random()*diceArray.length)];
  document.getElementById(`dice${pNo}`).innerHTML =
    `<i class="diceImg fas ${diceIcons[d-1]}"></i>`;
  const prev = currentPlayer;
  currentPlayer = 0;
  setTimeout(()=> movePot(d, prev), 1000);
  setTimeout(()=>{
    currentPlayer = playerNumbers[prev % playersCount];
    disableDices();
  }, 2000 + d*400);
}
function disableDices(){
  for(let i=1;i<=playersCount;i++){
    document.getElementById(`dice${i}`).style.color =
      i===currentPlayer ? "" : "grey";
  }
}

// — Animación de casillas —
function animateMove(pNo, from, to, cb){
  let c = from;
  const iv = setInterval(()=>{
    c++;
    players[pNo-1].score = c;
    drop.currentTime = 0; drop.play();
    updateBoard();
    if(c===to){
      clearInterval(iv);
      cb();
    }
  }, 400);
}

// — Lógica de serpientes, escaleras y exámenes —
function movePot(val, pNo){
  const start = players[pNo-1].score;
  const end   = start + val;
  // Si sobrepasa 100, no mueve
  if(end > 100){
    currentPlayer = playerNumbers[pNo % playersCount];
    disableDices();
    return;
  }

  // Serpiente → examen de 7 preguntas
  const snIdx = snakes.findIndex(s => s[0] === end);
  if(snIdx !== -1){
    animateMove(pNo, start, end, ()=>{
      snakeAudio.currentTime=0; snakeAudio.play();
      startExam("snake", pNo, snIdx);
    });
    return;
  }

  // Casilla 100 → examen final de 10 preguntas
  if(end === 100){
    animateMove(pNo, start, end, ()=> startExam("final", pNo));
    return;
  }

  // Movimiento normal (y escalera)
  animateMove(pNo, start, end, ()=>{
    const pos = players[pNo-1].score;
    const ldIdx = ladders.findIndex(l => l[0] === pos);
    if(ldIdx !== -1){
      globalHints++;
      ladderAudio.currentTime=0; ladderAudio.play();
      alert(`¡Subiste escalera! Tienes ${globalHints} pista(s).`);
      let i=0, path=ladders[ldIdx];
      const iv2 = setInterval(()=>{
        players[pNo-1].score = path[i++];
        updateBoard();
        if(i === path.length) clearInterval(iv2);
      },400);
    }
    // Si no hay examen activo, pasa turno
    if(!examState.active){
      currentPlayer = playerNumbers[pNo % playersCount];
      disableDices();
    }
  });
}

// — Generación dinámica de preguntas —
function generateQuestions(count){
  const ops = ["+","-","*","/"];
  const qs  = [];
  for(let i=0;i<count;i++){
    let a = Math.floor(Math.random()*20)+1;
    let b = Math.floor(Math.random()*20)+1;
    let op = ops[Math.floor(Math.random()*ops.length)];
    if(op === "/") a = a * b;
    const expr = `${a} ${op} ${b}`;
    const ans  = eval(expr);
    qs.push({ expr, answer: ans });
  }
  return qs;
}

// — Inicia examen —
function startExam(type, pNo, snakeIdx=null){
  examState.active       = true;
  examState.type         = type;
  examState.player       = pNo;
  examState.snakeIndex   = snakeIdx;
  examState.questions    = generateQuestions(type==="snake"?7:10);
  examState.currentIndex = 0;
  examState.retries      = 2;
  examState.lives        = type==="snake"?1:3;
  examState.hints        = type==="snake"?1:globalHints;

  examModal.classList.remove("hide");
  hintBtn.style.display = (type==="final" ? "inline-block" : "none");
  renderExamQuestion();
}

// — Muestra la pregunta actual —
function renderExamQuestion(){
  const q = examState.questions[examState.currentIndex];
  document.querySelector("#questionText").textContent = q.expr;
  document.querySelector("#answerInput").value   = "";
  document.querySelector("#examInfo").textContent =
    `Vida(s): ${examState.lives} | Pista(s): ${examState.hints} | Intentos: ${examState.retries}`;
  hintBtn.disabled = !(examState.type==="final" && examState.hints>0);
}

// — Evento “Responder” —
submitBtn.addEventListener("click", ()=>{
  const val = parseFloat(document.querySelector("#answerInput").value);
  const q   = examState.questions[examState.currentIndex];

  if(val === q.answer){
    examState.currentIndex++;
    examState.currentIndex < examState.questions.length
      ? renderExamQuestion()
      : finishExam(true);
  } else {
    examState.lives--;
    examState.retries--;
    if(examState.lives>0 && examState.retries>0){
      alert(`Incorrecto. Te quedan ${examState.lives} vida(s) y ${examState.retries} intento(s).`);
      renderExamQuestion();
    } else {
      finishExam(false);
    }
  }
});

// — Evento “Usar pista” —
hintBtn.addEventListener("click", ()=>{
  if(examState.hints > 0){
    const q = examState.questions[examState.currentIndex];
    document.querySelector("#answerInput").value = q.answer;
    examState.hints--;
    renderExamQuestion();
  }
});

// — Finalizar examen y pasar turno —  
function finishExam(passed){
  examModal.classList.add("hide");
  const pNo = examState.player;

  if(passed){
    if(examState.type === "snake"){
      alert("¡Examen superado! Mantienes tu posición.");
    } else {
      alert("¡Examen final aprobado! Ganaste la partida.");
      successAudio.currentTime = 0; successAudio.play();
      wimg.src = `images/avatars/${players[pNo-1].image}.png`;
      wname.textContent = players[pNo-1].name;
      modalWin.classList.remove("hide");
      return;
    }
  } else {
    if(examState.type === "snake"){
      const path = snakes[examState.snakeIndex];
      const end  = path[path.length-1];
      players[pNo-1].score = Math.max(1, end-2);
      updateBoard();
      alert("Fallaste. Bajas 2 casillas extra.");
    } else {
      const newPos = Math.floor(Math.random()*(100-70+1)) + 70;
      players[pNo-1].score = newPos;
      updateBoard();
      alert(`Fallaste el examen final. Regresas a la casilla ${newPos}.`);
    }
  }

  // Reset estado examen
  examState.active       = false;
  examState.type         = null;
  examState.player       = null;
  examState.snakeIndex   = null;
  examState.questions    = [];
  examState.currentIndex = 0;

  // Pasar turno
  currentPlayer = playerNumbers[pNo % playersCount];
  disableDices();
}
