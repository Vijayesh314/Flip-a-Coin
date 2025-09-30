const maxHP = 10;

let state = {player: {hp: maxHP, coins: 5, defending: false},
            ai: {hp: maxHP, coins: 5, defending: false},
            running: false};

const q = (sel) => document.querySelector(sel);
const log = (text) => {const li = document.createElement("li");
                        li.textContent = text;
                        q("#events").prepend(li);
};

function updateUI() {
    q("#player-hp").textContent = state.player.hp;
    q("#player-coins").textContent = state.player.coins;
    q("#ai-hp").textContent = state.ai.hp;
    q("#ai-coins").textContent = state.ai.coins;
}

function flipOnce() {
    return Math.random() < 0.5;
}

function flipN(n) {
    let heads = 0;
    for (leti=0; i<n; i++) {
        if (flipOnce()) {
            heads++;
        }
    }
    return {heads, n};
}

function resolveAttack(attacker, defender) {
    const cost = 1;
    attacker.coins -= cost;
    const success = flipOnce();
    q("#flip-display").textContent = success ? "Heads - Attack success" : "Tails - Attack failed";
    if (success) {
        let dmg = 3;
        if (defender.defending) {
            dmg = 0
            defender.defending = false;
            log(`${defender === state.player ? "Player" : "AI"} blocked the attack.`);
        }
        defender.hp = Math.max(0, defender.hp - dmg);
        log(`${attacker === state.player ? "Player" : "AI"} attacked for ${dmg} damage.`);
    } else {
        attacker.hp = Math.max(0, attacker.hp - 1);
        log(`${attacker === state.player ? "Player" : "AI"} missed and took 1 damage from recoil.`);
    }
}

function resolveDefend(actor) {
    const cost = 1;
    actor.coins -= cost;
    const success = flipOnce();
    q("#flip-display").textContent = success ? "Heads - Strong Defence." : "Tails - Weak Defend.";
    if (success) {
        actor.defending = true;
        ;pg(`${actor === state.player ? "Player" : "AI"} will fully block the next attack.`);
    } else {
        actor.defending = true;
        log(`${actor === state.player ? "Player" : "AI"} defended (partial).`);
    }
}

function resolveSteal(actor, target) {
    const cost = 2;
    actor.coins -= cost;
    const success = flipOnce();
    q("#flip-display").textContent = success ? "Heads - Steal success." : "Tails - Steal failed.";
    if (success) {
        const amount = Math.min(3, target.coins);
        target.coins -= amount;
        actor.coins += amount;
        log(`${actor === state.player ? "Player" : "AI"} stole ${amount} coins. `);
    } else {
        actor.coins = Math.max(0, actor.coins - 1);
        log(`${actor === state.player ? "Player" : "AI"} failed to steal and lost 1 coin.`)
    }
}

function resolveHeal(actor) {
    const cost = 2;
    actor.coins -= cost;
    const success = flipOnce();
    q("#flip-display").textContent = success ? "Heads - Heal success." : "Tails - Head failed.";
    if (success) {
        const healed = Math.min(maxHP - actor.hp, 3);
        actor.hp += healed;
        log(`${actor === state.player ? "Player" : "AI"} healed ${healed} HP.`)
    } else {
        log(`${actor === state.player ? "Player" : "AI"} failed to heal. `)
    }
}

function resolveRandomize(actor, bet) {
    if (bet <= 0 || bet > actor.coins) {
        log("Invalid gamble amount.");
        return;
    }
    actor.coins -= bet;
    const {heads, n} = flipN(bet);
    q("#flip-display").textContent = `Flipped ${heads}/${n} heads.`;
    if (heads > n/2) {
        const reward = bet * 2;
        actor.coins += reward;
        log(`${actor === state.player ? "Player" : "AI"} gambled ${bet} and won ${reward}.`);
    } else {
        log(`${actor === state.player ? "Player" : "AI"} gambled ${bet} and lost it.`);
    }
}

function aiChoose() {
  // super-simple heuristics
  const ai = state.ai;
  const player = state.player;

  if (ai.hp <= 4 && ai.coins >= 2) {
    return { action: 'heal' };
  }

  if (ai.coins >= 2 && Math.random() < 0.25) {
    return { action: 'steal' };
  }

  if (ai.coins >= 1 && Math.random() < 0.4) {
    return { action: 'attack' };
  }

  if (ai.coins >= 1) {
    return { action: 'defend' };
  }

  return { action: 'gamble', bet: Math.min(1, ai.coins) };
}

async function aiTurn() {
  // small pause
  await new Promise(function(resolve) {
    setTimeout(resolve, 700);
  });

  const choice = aiChoose();
  const ai = state.ai;
  const player = state.player;

  if (choice.action === 'attack' && ai.coins >= 1) {
    resolveAttack(ai, player);
  } else if (choice.action === 'defend' && ai.coins >= 1) {
    resolveDefend(ai);
  } else if (choice.action === 'steal' && ai.coins >= 2) {
    resolveSteal(ai, player);
  } else if (choice.action === 'heal' && ai.coins >= 2) {
    resolveHeal(ai);
  } else if (choice.action === 'gamble' && ai.coins >= 1) {
    let bet = 1;
    if (typeof choice.bet === "number" && choice.bet > 0) {
      bet = choice.bet;
    }
    resolveGamble(ai, bet);
  } else {
    log('AI passed (no coins).');
  }

  updateUI();
  checkEnd();
}

function playerAction(action, extra) {
  if (!state.running) {
    log('Start a game first.');
    return;
  }

  if (typeof extra !== "number") {
    extra = 0;
  }

  const player = state.player;
  const ai = state.ai;

  if (action === 'attack') {
    if (player.coins < 1) {
      log('Not enough coins.');
      return;
    }
    resolveAttack(player, ai);
  } else if (action === 'defend') {
    if (player.coins < 1) {
      log('Not enough coins.');
      return;
    }
    resolveDefend(player);
  } else if (action === 'steal') {
    if (player.coins < 2) {
      log('Not enough coins.');
      return;
    }
    resolveSteal(player, ai);
  } else if (action === 'heal') {
    if (player.coins < 2) {
      log('Not enough coins.');
      return;
    }
    resolveHeal(player);
  } else if (action === 'gamble') {
    let bet = Math.floor(extra);
    if (isNaN(bet) || bet < 1) {
      bet = 1;
    }
    if (player.coins < bet) {
      log('Not enough coins to gamble.');
      return;
    }
    resolveGamble(player, bet);
  }

  updateUI();
  if (!checkEnd()) {
    aiTurn();
  }
}
