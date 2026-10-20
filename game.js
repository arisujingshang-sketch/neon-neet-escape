(() => {
  'use strict';
  const DEBUG = false;
  const $ = id => document.getElementById(id);
  const boot = $('boot'), title = $('title'), game = $('game'), screen = $('screen');
  const panel = $('panel'), message = $('message'), messageText = $('message-text'), speaker = $('speaker');
  const image = $('scene-image'), hotspots = $('hotspots'), paper = document.querySelector('.paper-hotspot'), endingOverlay = $('ending-overlay');
  let soundOn = true, currentMusic = null, scene = 'boot', input = '', selected = new Set(), timers = [];
  let foundPasswordHint, foundPassword, passwordSolved, captchaSolved, doorUnlocked, gameCleared, chairTapCount, wrongPasswordCount, hintShown;
  function resetState() { foundPasswordHint = false; foundPassword = false; passwordSolved = false; captchaSolved = false; doorUnlocked = false; gameCleared = false; chairTapCount = 0; wrongPasswordCount = 0; hintShown = false; input = ''; selected.clear(); }
  resetState();
  if (DEBUG) screen.classList.add('debug');
  const sounds = {};
  ['bgm_room','bgm_ending','se_boot','se_click','se_error','se_success','se_alarm','se_verify','se_unlock','se_door','se_paper'].forEach(name => { const a = new Audio('assets/audio/' + name + '.mp3'); a.preload = 'metadata'; a.volume = name.startsWith('bgm_') ? 0.18 : 0.7; a.loop = name.startsWith('bgm_'); sounds[name] = a; });
  function play(name, restart = true) { if (!soundOn) return; const a = sounds[name]; try { if (restart) a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
  function music(name) { if (currentMusic && currentMusic !== name) sounds[currentMusic].pause(); currentMusic = name; if (name) play(name, false); }
  function stopAll() { Object.values(sounds).forEach(a => { a.pause(); try { a.currentTime = 0; } catch (_) {} }); currentMusic = null; }
  function later(fn, ms) { const id = window.setTimeout(fn, ms); timers.push(id); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function say(who, text) { message.hidden = false; speaker.textContent = who; messageText.textContent = text; }
  function hidePanel() { panel.hidden = true; panel.innerHTML = ''; }
  function showPanel(html) { panel.innerHTML = html; panel.hidden = false; panel.classList.toggle('terminal-overlay', ['terminal','captcha','captcha-grid','verifying'].includes(scene)); }
  function showImage(name, label) { image.src = 'assets/images/' + name + '.png'; image.alt = label; $('location').textContent = label.toUpperCase(); hotspots.hidden = name !== 'room'; paper.hidden = name !== 'trash'; endingOverlay.hidden = true; }
  function backButton() { return '<button class="back" data-action="back">← 戻る</button>'; }
  function roomView(text = '気になる場所を調べてみよう。') { scene = 'room'; showImage('room','AREA 01 / LABORATORY'); hidePanel(); say('主人公',text); }
  function trashView() { scene='trash'; showImage('trash','TRASH / INSPECT'); showPanel('<h2>TRASH / INSPECT</h2><p>白い紙をタップして調べる。</p><div class="panel-actions">'+backButton()+'</div>'); say('主人公','何か紙が入っている。'); play('se_paper'); }
  function paperView() { foundPasswordHint = true; paper.hidden = true; play('se_paper'); showPanel('<div class="memo">パスワードを忘れた人へ<br><br>パスワードは<br><strong>「モニターの裏」</strong><br>にあります。<br><br>管理AI</div><div class="panel-actions">'+backButton()+'</div>'); say('主人公','セキュリティ終わってるだろ。'); }
  function monitorView() { scene='monitor'; showImage('monitor','MONITOR / INSPECT'); showPanel('<h2>MONITOR / INSPECT</h2>'+(foundPasswordHint?'<div class="panel-actions"><button data-action="behind">モニターの裏を見る</button>'+backButton()+'</div>':'<div class="panel-actions">'+backButton()+'</div>')); say('主人公','クソデカいモニターだ。'); }
  function behindView() { foundPassword = true; showPanel('<div class="sticky">PASSWORD<strong>4649</strong>※剥がすな！</div><div class="panel-actions">'+backButton()+'</div>'); say('主人公','よろしく……？'); }
  function terminalView() { scene='terminal'; showImage('terminal','AI TERMINAL'); showPanel('<h2>AI PRISON SYSTEM</h2><div class="terminal-text">STATUS : ONLINE\nSUBJECT : NEET\nINTELLIGENCE : UNVERIFIED</div><div class="panel-actions">'+backButton()+'</div>'); say('主人公','最後の一行いる？'); }
  function doorView() { scene='door'; showImage('door','EXIT / SECURITY'); if (doorUnlocked) { finalAuthorization(); return; } if (passwordSolved) { captchaStart(); return; } input=''; renderKeypad(); say('SYSTEM MESSAGE','4桁のパスワードを入力してください。'); }
  function renderKeypad(status='') { const nums=['1','2','3','4','5','6','7','8','9','CLEAR','0','ENTER']; showPanel('<div class="security-layout"><div class="security-info"><h2>SECURITY SYSTEM</h2><p>ENTER PASSWORD</p><div class="pin">'+(input + '_'.repeat(4-input.length)).split('').join(' ')+'</div><p class="alert">'+status+'</p>'+backButton()+'</div><div class="keypad">'+nums.map(n=>'<button data-action="key" data-key="'+n+'">'+n+'</button>').join('')+'</div></div>'); }
  function keypress(key) { if (key === 'CLEAR') { input=''; renderKeypad(); return; } if (key !== 'ENTER') { if (input.length < 4) input+=key; renderKeypad(); return; } if (input !== '4649') { wrongPasswordCount++; play('se_error'); input=''; renderKeypad('ACCESS DENIED'); if (wrongPasswordCount >= 3 && !hintShown) { hintShown=true; say('AI / 主人公','「パスワードをお忘れですか？」\n「お前が設定したんだろ。」\n「ゴミ箱などを確認してみてはいかがでしょう。」'); } else say('主人公','でしょうね。'); return; } passwordSolved=true; scene='transition'; play('se_success'); showPanel('<h2>PASSWORD ACCEPTED</h2><p>ACCESS GRANTED</p>'); say('主人公','やった！'); later(() => { play('se_alarm'); showPanel('<h2 class="alert">SECONDARY SECURITY SYSTEM</h2><p class="alert">ACTIVATED</p><div class="panel-actions"><button data-action="captcha-start">追加認証へ →</button></div>'); say('主人公 / AI','「は？」\n「不正アクセス対策として、追加認証を行います。」\n「パスワード通っただろ。」\n「念のためです。」'); },1100); }
  function captchaStart() { scene='captcha'; showImage('terminal','SECONDARY SECURITY'); showPanel('<h2>SECONDARY SECURITY SYSTEM</h2><div class="panel-actions"><button data-action="captcha-check">☐ 私はロボットではありません</button>'+backButton()+'</div>'); say('AI','追加認証を開始してください。'); }
  const emojis=['🍜','🐈','🚽','🗿','🍕','🦆','🛸','🐟','🪑'];
  const names=['ラーメン','猫','トイレ','モアイ','ピザ','アヒル','UFO','魚','椅子'];
  function captchaGrid(status='') { scene='captcha-grid'; showPanel('<h2>HUMAN VERIFICATION</h2><p>信号機が写っている画像を<br>すべて選択してください</p><div class="captcha-grid">'+emojis.map((e,i)=>'<button data-action="tile" data-index="'+i+'" aria-label="'+names[i]+'" aria-pressed="'+selected.has(i)+'" class="'+(selected.has(i)?'selected':'')+'">'+e+'</button>').join('')+'</div><p class="alert">'+status+'</p><div class="panel-actions"><button data-action="verify">VERIFY</button><button data-action="none">該当なし</button>'+backButton()+'</div>'); }
  function captchaSuccess() { if (scene !== 'captcha-grid') return; scene='verifying'; play('se_verify'); showPanel('<h2>VERIFYING...</h2>'); say('SYSTEM MESSAGE','認証中...'); later(()=> { captchaSolved=true; doorUnlocked=true; showPanel('<h2>HUMANITY CONFIRMED</h2><div class="panel-actions"><button data-action="authorization">次へ →</button></div>'); say('主人公','これで人類代表になっていいのか？'); play('se_unlock'); },1000); }
  function finalAuthorization() { scene='authorization'; showImage('door','EXIT / UNLOCKED'); showPanel('<h2>FINAL AUTHORIZATION</h2><div class="terminal-text">PASSWORD........OK\nCAPTCHA.........OK\nINTELLIGENCE....QUESTIONABLE\n\nACCESS GRANTED</div><div class="panel-actions"><button data-action="escape">脱出する →</button>'+backButton()+'</div>'); say('主人公','最後の項目いる？'); }
  function escape() { if (!doorUnlocked || scene !== 'authorization') return; scene='escaping'; play('se_door'); if(currentMusic) sounds[currentMusic].pause(); currentMusic=null; hidePanel(); message.hidden=true; screen.classList.add('fade'); later(()=> { screen.classList.remove('fade'); ending(); },700); }
  function ending() { scene='ending'; gameCleared=true; showImage('ending','ROOM 02'); music('bgm_ending'); endingOverlay.hidden=false; endingOverlay.innerHTML='ROOM 02'; say('主人公','…………。'); later(()=>say('AI','おめでとうございます。'),1400); later(()=>say('AI','全100ステージ中、'),2800); later(()=> { endingOverlay.innerHTML='1 STAGE CLEAR'; say('主人公','アンインストールするぞ。'); },4300); later(()=> { endingOverlay.innerHTML='NEON NEET ESCAPE<small>STAGE 1 CLEAR<br>THANK YOU FOR PLAYING</small>'; showPanel('<div class="panel-actions"><button data-action="restart">最初から</button></div>'); },6000); }
  function restart() { clearTimers(); stopAll(); resetState(); scene='title'; game.hidden=true; title.hidden=false; boot.hidden=true; hidePanel(); message.hidden=true; screen.classList.remove('fade'); }
  $('sound').addEventListener('click',()=> { soundOn=!soundOn; $('sound-state').textContent=soundOn?'ON':'OFF'; $('sound').setAttribute('aria-pressed',String(soundOn)); $('sound').setAttribute('aria-label',soundOn?'サウンドをオフにする':'サウンドをオンにする'); if (!soundOn) Object.values(sounds).forEach(a=>a.pause()); else { if(currentMusic) play(currentMusic,false); play('se_click'); } });
  $('start').addEventListener('click',()=> { if (scene!=='title') return; scene='room'; title.hidden=true; game.hidden=false; play('se_click'); music('bgm_room'); roomView('目を覚ますと、そこは見知らぬ研究室だった。'); });
  document.addEventListener('click',event=> { const button=event.target.closest('[data-action]'); if (!button) return; const action=button.dataset.action;
    if (action==='chair' && scene==='room') { chairTapCount++; say('主人公', ['椅子だ。','どう見ても椅子だ。','椅子に何を期待してるんだ。'][chairTapCount-1] || '椅子。'); }
    else if (action==='trash' && scene==='room') trashView();
    else if (action==='monitor' && scene==='room') monitorView();
    else if (action==='door' && scene==='room') doorView();
    else if (action==='terminal' && scene==='room') terminalView();
    else if (action==='paper' && scene==='trash') paperView();
    else if (action==='behind' && scene==='monitor' && foundPasswordHint) behindView();
    else if (action==='back') roomView();
    else if (action==='key' && scene==='door') keypress(button.dataset.key);
    else if (action==='captcha-start' && scene==='transition') captchaStart();
    else if (action==='captcha-check' && scene==='captcha') { selected.clear(); play('se_verify'); captchaGrid(); say('AI','画像を選択してください。'); }
    else if (action==='tile' && scene==='captcha-grid') { const i=Number(button.dataset.index); selected.has(i)?selected.delete(i):selected.add(i); captchaGrid(); }
    else if (action==='verify' && scene==='captcha-grid') { play('se_error'); captchaGrid('ACCESS DENIED'); say('AI / 主人公','「信号機を選択してください。」\n「ねえよ。」'); }
    else if (action==='none') captchaSuccess();
    else if (action==='authorization' && captchaSolved) finalAuthorization();
    else if (action==='escape') escape();
    else if (action==='restart' && gameCleared) restart();
  });
  play('se_boot'); later(()=> { if(scene==='boot') { boot.hidden=true; title.hidden=false; scene='title'; } },3000);
})();

