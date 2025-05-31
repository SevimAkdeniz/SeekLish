let aktifIndex = 0;
let sonuclar = [];

let soruBaslik = document.getElementById("soru-baslik");
let soruAlani = document.getElementById("soru-alani");
let seceneklerAlani = document.getElementById("secenekler");
let sonucMesaji = document.getElementById("sonuc-mesaji");
let oncekiBtn = document.getElementById("onceki");
let sonrakiBtn = document.getElementById("sonraki");
let bitirBtn = document.getElementById("bitirBtn");
let sonuclarInput = document.getElementById("sonuclarInput");
let bitirForm = document.getElementById("bitirForm");

function kelimeyiGoster() {

  const kelime = kelimeler[aktifIndex];
  soruBaslik.textContent = `Soru ${aktifIndex + 1} / ${kelimeler.length}`;
  soruAlani.textContent = kelime.eng;
  document.getElementById("ornek-cumle").textContent = kelime.sample || "";
  document.getElementById("kelime-gorseli").innerHTML = `
  <img src="${kelime.picture}" alt="Kelime görseli" style="max-width:150px; max-height:150px;">
`;

const sesElementi = document.getElementById("ses");
sesElementi.src = kelime.audio;
sesElementi.load();
sesElementi.play().catch(() => {});





  seceneklerAlani.innerHTML = "";
  sonucMesaji.textContent = "";

  const mevcut = sonuclar.find(s => s.wordID === kelime.wordID);

  kelime.secenekler.forEach(secenek => {
    const buton = document.createElement("button");
    buton.textContent = secenek;
    buton.className = "secenek-btn";
    buton.style.margin = "4px";

    // Cevaplanmışsa disable yap
    if (mevcut) buton.disabled = true;

    buton.onclick = (e) => {
      e.preventDefault();
      if (!mevcut) kontrolEt(secenek, kelime.tur);
    };

    seceneklerAlani.appendChild(buton);
  });

  if (mevcut) {
    if (mevcut.correct === true) {
      sonucMesaji.textContent = "✅ Doğru!";
      sonucMesaji.style.color = "green";
    } else if (mevcut.correct === false) {
      sonucMesaji.textContent = `❌ Yanlış! Doğru cevap: ${kelime.tur}`;
      sonucMesaji.style.color = "red";
    }
  }

  oncekiBtn.disabled = aktifIndex === 0;
  sonrakiBtn.disabled = aktifIndex === kelimeler.length - 1;

  kontrolBitirmeButonu();
}

function kontrolEt(secilen, dogruCevap) {
  const dogruMu = secilen.trim().toLowerCase() === dogruCevap.trim().toLowerCase();

  sonuclar.push({
    wordID: kelimeler[aktifIndex].wordID,
    correct: dogruMu
  });

  kelimeyiGoster();
}

function kontrolBitirmeButonu() {
  const cevaplananIDler = sonuclar.map(s => s.wordID);
  const eksikVarMi = kelimeler.some(k => !cevaplananIDler.includes(k.wordID));
  if (!eksikVarMi) {
    bitirBtn.style.display = "inline-block";
  }
}

oncekiBtn.addEventListener("click", () => {
  if (aktifIndex > 0) {
    aktifIndex--;
    kelimeyiGoster();
  }
});

sonrakiBtn.addEventListener("click", () => {
  if (aktifIndex < kelimeler.length - 1) {
    aktifIndex++;
    kelimeyiGoster();
  }
});

bitirForm.addEventListener("submit", () => {
  const cevaplananIDler = sonuclar.map(s => s.wordID);

  // Cevaplanmayanları pass olarak ekle
  kelimeler.forEach(kelime => {
    if (!cevaplananIDler.includes(kelime.wordID)) {
      sonuclar.push({
        wordID: kelime.wordID,
        correct: null
      });
    }
  });

  sonuclarInput.value = JSON.stringify(sonuclar);
});

kelimeyiGoster();
