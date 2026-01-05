const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const saldoSpan = document.getElementById("saldo");
const actions = document.getElementById("actions");

let items = [];
let angle = 0;
let spinning = false;
let saldo = 0;

/* =====================
   LOAD DATA
===================== */
fetch("items.json")
  .then(r => r.json())
  .then(data => {
    items = data;
    drawWheel();
    idleSpin();
    loadSaldo();
  });

/* =====================
   BUSCAR SALDO (BACKEND)
===================== */
async function loadSaldo() {
  const res = await fetch("/api/saldo");
  const data = await res.json();
  saldo = data.saldo;
  updateUI();
}

/* =====================
   UI
===================== */
function updateUI() {
  saldoSpan.textContent = saldo;
  actions.innerHTML = "";

  if (saldo <= 0) {
    actions.innerHTML = `
      <input id="codeInput" placeholder="Código de resgate">
      <button id="redeemBtn">Resgatar código</button>
      <a class="whatsapp" href="https://wa.me/5573991345299" target="_blank">

        Não possui código? Adquira já!
      </a>
    `;
    document.getElementById("redeemBtn").onclick = redeemCode;
  } else {
    const btn = document.createElement("button");
    btn.textContent = "Girar roleta";
    btn.onclick = spin;
    actions.appendChild(btn);
  }
}

/* =====================
   POPUP
===================== */
function showMessagePopup(type, title, message) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const popup = document.createElement("div");
  popup.className = `popup ${type}`;

  popup.innerHTML = `
    <div class="close">✖</div>
    <h2>${title}</h2>
    <p>${message}</p>
  `;

  popup.querySelector(".close").onclick = () => overlay.remove();
  overlay.onclick = e => e.target === overlay && overlay.remove();

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

/* =====================
   RESGATAR CÓDIGO (BACKEND)
===================== */
async function redeemCode() {
  const codeValue = document.getElementById("codeInput").value.trim().toUpperCase();
  if (!codeValue) {
    showMessagePopup("aviso", "⚠️ Atenção", "Digite um código.");
    return;
  }

  const res = await fetch("/api/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeValue })
  });

  const data = await res.json();

  if (!res.ok) {
    showMessagePopup("erro", "Erro", data.error);
    return;
  }

  showMessagePopup("sucesso", "✅ Código válido", `+${data.amount} giros`);
  loadSaldo();
}

/* =====================
   DRAW WHEEL
===================== */
function drawWheel() {
  const radius = canvas.width / 2;
  const slice = (Math.PI * 2) / items.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  items.forEach((item, i) => {
    const start = angle + i * slice;
    const end = start + slice;

    const grad = ctx.createRadialGradient(radius, radius, 20, radius, radius, radius);
    grad.addColorStop(0, item.colors[0]);
    grad.addColorStop(1, item.colors[1]);

    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, start, end);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(start + slice / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(item.name, radius - 15, 5);
    ctx.restore();
  });
}

/* =====================
   IDLE SPIN
===================== */
function idleSpin() {
  if (!spinning) {
    angle += 0.002;
    drawWheel();
  }
  requestAnimationFrame(idleSpin);
}

/* =====================
   SPIN REAL (BACKEND)
===================== */
async function spin() {
  if (spinning) return;
  spinning = true;

  const res = await fetch("/api/spin", { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    spinning = false;
    showMessagePopup("erro", "Erro", data.error);
    return;
  }

  const index = items.findIndex(i => i.name === data.prize.name);
  const slice = (Math.PI * 2) / items.length;

  const targetAngle =
    Math.PI * 6 +
    index * slice +
    slice / 2;

  const startAngle = angle;
  const duration = 5000;
  const start = performance.now();

  function animate(now) {
    const progress = Math.min((now - start) / duration, 1);
    angle = startAngle + (targetAngle - startAngle) * easeOut(progress);
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      spinning = false;
      showMessagePopup(
        data.prize.rarity,
        `🎁 ${data.prize.name}`,
        `ID: #${String(data.spinId).padStart(5, "0")}<br>Hora: ${data.time}`
      );
      loadSaldo();
    }
  }

  requestAnimationFrame(animate);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
