// spelling-quiz/script.js
// 중학생(EFL) 영단어 스펠링 퀴즈 JS 파일 (words.csv 지원)

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

const state = {
  words: [],
  level: 'medium',
  total: 20,
  limit: 0,
  qIndex: 0,
  score: 0,
  started: false,
  timer: null,
  remain: 0,
  question: null,
  review: [],
  ready: false,
};

async function loadCSVWords(path = 'words.csv') {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('CSV 파일을 불러올 수 없습니다');
    const text = await res.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hasHeader = lines[0].toLowerCase().includes('word');
    const words = (hasHeader ? lines.slice(1) : lines).map(w => w.split(',')[0].toLowerCase());
    state.words = words;
  } catch (err) {
    console.warn('CSV 로드 실패. 기본 단어로 대체합니다.');
    state.words = ['about','across','address','afraid','afternoon','animal','answer','arrive','beautiful','because','before','begin','borrow','breakfast','bridge','build','busy','career','certain','change','choose','church','classroom','clever','cloud','color','common','company','country','cousin','culture','danger','decide','delicious','different','difficult','dinner','discover','drink','during','earth','easy','electric','elephant','energy','engineer','enjoy','enough','environment','exercise','favorite','finally','finish','follow','foreign','forget','friend','future','garden','great','healthy','history','holiday','homework','hundred','important','include','international','journey','kitchen','language','library','listen','minute','moments','mountain','music','nature','ocean','parents','people','picture','planet','popular','practice','present','problem','protect','question','really','remember','river','science','season','secret','shoulder','sometimes','special','station','story','street','student','subject','sudden','together','tomorrow','traffic','training','usually','vacation','village','weather','welcome','window','wonderful','world','write'];
  }
  state.ready = true;
  $('#start').disabled = false;
  $('#question').textContent = '시작을 눌러 주세요';
}

function makeMisspellings(word, level = 'medium') {
  const variants = new Set();
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const push = (w) => { if (w && w !== word && /^[a-z]+$/.test(w)) variants.add(w); };

  for (let i = 0; i < word.length - 1; i++) {
    push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  for (let i = 0; i < word.length; i++) {
    if (vowels.includes(word[i])) {
      const pool = vowels.filter(v => v !== word[i]);
      const picks = level === 'easy' ? pool.slice(0, 1) : level === 'medium' ? pool.slice(0, 2) : pool;
      for (const v of picks) push(word.slice(0, i) + v + word.slice(i + 1));
    }
  }
  for (let i = 0; i < word.length; i++) {
    if (level !== 'easy') push(word.slice(0, i) + word.slice(i + 1));
    if (level !== 'easy') push(word.slice(0, i) + word[i] + word[i] + word.slice(i + 1));
  }
  push(word.replaceAll('c', 'k'));
  push(word.replaceAll('ph', 'f'));
  push(word.replaceAll('qu', 'kw'));
  push(word.replaceAll('ck', 'k'));
  if (level === 'hard') {
    for (let i = 0; i < word.length; i++) {
      const r = letters[Math.floor(Math.random() * letters.length)];
      push(word.slice(0, i) + r + word.slice(i + 1));
    }
  }
  return shuffle(Array.from(variants)).slice(0, 8);
}

function makeQuestion(level) {
  const answer = state.words[Math.floor(Math.random() * state.words.length)];
  const wrongs = makeMisspellings(answer, level).filter(w => w !== answer);
  const options = shuffle([answer, ...wrongs.slice(0, 3)]);
  return { answer, options };
}

function renderQuestion() {
  const { answer, options } = state.question;
  $('#question').textContent = '정답 스펠링을 고르세요';
  const container = $('#choices');
  container.innerHTML = '';

  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.innerHTML = `<span>${opt}</span><span class="kbd">${i + 1}</span>`;
    btn.addEventListener('click', () => choose(opt, btn));
    container.appendChild(btn);
  });

  $('#feedback').textContent = '';
  $('#qnum').textContent = state.qIndex + 1;
  $('#qtotal').textContent = state.total;
  $('#bar').style.width = `${(state.qIndex / state.total) * 100}%`;
}

function choose(opt, btn) {
  if (!state.started) return;
  const correct = opt === state.question.answer;
  $$('.choice').forEach(b => b.setAttribute('disabled', 'true'));
  if (correct) {
    btn.classList.add('correct');
    state.score++;
    $('#feedback').innerHTML = `<span class="pill ok">정답!</span> 올바른 철자: <b>${state.question.answer}</b>`;
  } else {
    btn.classList.add('wrong');
    const correctBtn = $$('.choice').find(b => b.textContent.trim().startsWith(state.question.answer));
    if (correctBtn) correctBtn.classList.add('correct');
    $('#feedback').innerHTML = `<span class="pill no">오답</span> 정답은 <b>${state.question.answer}</b> 입니다.`;
    state.review.push({ word: state.question.answer, picked: opt });
  }
  $('#score').textContent = state.score;
  setTimeout(next, 650);
}

function next() {
  state.qIndex++;
  if (state.qIndex >= state.total) return finish();
  state.question = makeQuestion(state.level);
  renderQuestion();
}

function start() {
  if (!state.ready) return alert('단어를 불러오는 중입니다. 잠시만 기다려 주세요.');
  state.level = $('#level').value;
  state.total = parseInt($('#count').value, 10);
  state.limit = parseInt($('#limit').value, 10) || 0;
  state.qIndex = 0;
  state.score = 0;
  state.review = [];
  state.started = true;
  $('#results').style.display = 'none';
  $('#score').textContent = '0';
  state.question = makeQuestion(state.level);
  renderQuestion();
  $('#bar').style.width = '0%';
  if (state.timer) clearInterval(state.timer);
  state.remain = state.limit;
  $('#time').textContent = state.limit || '∞';
  if (state.limit > 0) {
    state.timer = setInterval(() => {
      state.remain--;
      $('#time').textContent = state.remain;
      if (state.remain <= 0) finish();
    }, 1000);
  }
}

function finish() {
  state.started = false;
  if (state.timer) clearInterval(state.timer);
  $('#bar').style.width = '100%';
  $('#finalScore').textContent = state.score;
  $('#finalTotal').textContent = state.total;
  $('#results').style.display = 'block';
  const list = $('#review');
  list.innerHTML = state.review.length ? '' : '<li>훌륭해요! 오답이 없어요 🎉</li>';
  state.review.forEach(({ word, picked }) => {
    const li = document.createElement('li');
    li.textContent = `정답: ${word} | 선택: ${picked}`;
    list.appendChild(li);
  });
}

$('#start').addEventListener('click', start);
$('#retry').addEventListener('click', start);
$('#shuffle').addEventListener('click', () => { shuffle(state.words); start(); });

window.addEventListener('keydown', (e) => {
  if (!state.started) return;
  if (['1', '2', '3', '4'].includes(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    const btn = $$('.choice')[idx];
    if (btn && !btn.hasAttribute('disabled')) btn.click();
  }
});

loadCSVWords();