const bot = BotManager.getCurrentBot();

const prefix = "!";
const users = Database.readObject("user_data");

const perm = [
  -268994330,
  1842875844,
  2077978570,
  -1952167539,
  -2072057940,
  1271552719, //for potion
];

const rooms = ["[Main] 데브로봇스 커뮤니티 | Devlobots", "Sharlotted Bot Test"];
//additional functions
Math.range = (from, to) => from + Math.random() * (to - from);
Math.randbool = () => Math.random() > 0.5;
Math.clamp = function (value, min, max) {
  if (value > max) return max;
  else if (value < min) return min;
  else return value;
};

ItemEntity = function (item) {
  this.item = item.id;
  this.health = item.helath;
  this.amount = 1;
};

function getItem(entity) {
  return items[entity.item];
}

Consumable = function (callback, amount) {
  this.amount = Number(amount || 1);
  this.callback = callback;
  this.consume = function (user, msg) {
    let entity = user.items.items.find((e) => e.item == this.id);
    if (entity && entity.amount >= this.amount) {
      entity.amount -= this.amount;
      if (entity.amount == 0) {
        user.items.items.splice(user.items.items.indexOf(entity), 1);
        save();
      }
      this.callback(user, msg);
    } else msg.reply(this.name + " 가 없습니다.\nid: " + this.id);
  };
};

Item = function (name, description, details, health) {
  this.name = name;
  this.description = description;
  this.details = details;
  this.health = Number(health || -1); //infinity
  this.id = items.length;
};

/**
 * buff obj
 * ---------------------
 * @health: recover health instantly
 * @energy: recover energy instantly
 **/
Potion = function (name, description, details, health, buff) {
  Object.assign(
    this,
    new Item(name, description, details, health),
    new Consumable((user, msg) => {
      let str = "";
      if (buff.energy) {
        user.energy = Math.min(user.stats.energy, user.energy + buff.energy);
        str += (str ? ", " : "") + "기력이 " + buff.energy + "만큼";
      }
      if (buff.health) {
        user.health = Math.min(user.stats.health, user.helath + buff.health);
        str += (str ? ", " : "") + "체력이 " + buff.health + "만큼";
      }
      if (str) msg.reply(str + " 회복되었다!");
    })
  );

  this.buff = buff;
  this.description =
    this.description +
    "\n   " +
    Object.keys(buff)
      .map((k) => {
        if (k == "health") return "* 체력 회복: +" + buff[k];
        else if (k == "energy") return "* 기력 회복: +" + buff[k];
      })
      .join("\n");
};

Weapon = function (
  name,
  description,
  details,
  health,
  damage,
  cooldown,
  critical_damage,
  critical_chance
) {
  Object.assign(this, new Item(name, description, details, health));
  this.damage = Number(damage);
  this.cooldown = Number(cooldown);
  this.critical_damage = Number(critical_damage);
  this.critical_chance = Number(critical_chance);
};

Armor = function (name, description, details, health, armor, type) {
  Object.assign(this, new Item(name, description, details, health));
  this.armor = Number(armor);
  this.type = type || "others";
};

Shield = function (name, description, details, health, armor) {
  Object.assign(
    this,
    new Armor(name, description, details, health, armor, "shield")
  );
};

Accessory = function (name, description, details, health, buff) {
  Object.assign(this, new Item(name, description, details, health));
  this.buff = buff;

  this.addBuff = (name, amount) => {
    this.buff[name] = Number(amount);
    return this;
  };
};
//아이템 배열 위치를 바꾸지 않는 한 업데이트가 가능합니다. 절대로 배열을 바꾸지 마세요.
const items = [];
items.push(
  new Item(
    "짱돌",
    "길바닥에 돌아다니는 흔한 돌맹이다.",
    "밟으면 아프니 지뢰의 기능을 하고, 던져도 아프니 탄환의 기능을 하며, 크기가 된다면 둔기의 기능으로도 되므로 이것이 바로 모든 무기의 시초로다.\n  =아리스토텔링"
  )
);
items.push(new Item("조각", "손까락 크기의 정말 작은 조각이다."));
items.push(
  Object.assign(
    new Potion("에너지 바", "누군가가 흘린 한입 크기의 에너지 바.", "", -1, {
      energy: 10,
    })
  )
);

function User(id, pw, hash) {
  this.id = id;
  this.pw = pw;
  this.hash = hash;
  this.money = 0;
  this.health = 100;
  this.energy = 50;
  this.stats = {
    health: 100,
    health_regen: 1,
    energy: 50,
    energy_regen: 1,
    strength: 10,
    defense: 0,
  };
  this.items = {
    weapon: {},
    helmet: {},
    shield: {},
    plate: {},
    gloves: {},
    boots: {},
    accessory: [],
    bag: {
      size: 50,
    },
    items: [],
  };
  this.status = {
    name: "",
    callback: () => {},
  };
}

function clearSelection(user) {
  user.status.name = "";
  user.status.callback = () => {};
}

users.forEach(clearSelection);

//데이터 동기화
(() => {
  let tamp = new User("", "", "");
  let checkobj = (obj, origin) => {
    Object.keys(origin).forEach((k) => {
      if (obj[k] === undefined) obj[k] = origin[k];
      else if (typeof obj[k] == "object") {
        checkobj(obj[k], origin[k]);
      }
    });
  };
  users.forEach((u) => {
    Object.getOwnPropertyNames(tamp).forEach((k) => {
      if (k == "id" || k == "pw" || k == "hash") return;
      if (u[k] === undefined) u[k] = tamp[k];
      else if (typeof u[k] == "object") {
        checkobj(u[k], tamp[k]);
      }
    });
  });
})();

const eventData = {
  battle: {
    func: (msg, user) => {
      msg.reply(
        "전투가 발생했지만 그들은 당신의 빛나는 머리를 보고 쓰러졌습니다!"
      );
    },
    ratio: 10,
  },
  money: {
    func: (msg, user) => {
      let money = 2 + Math.floor(Math.random() * 10);
      msg.reply("길바닥에 떨어진 동전을 주웠다!\n돈 +" + money);
      user.money += money;
    },
    ratio: 35,
  },
  goblin: {
    func: (msg, user) => {
      msg.reply("지나가던 고블린을 조우했다!");
      selectionTimeout = setTimeout(
        (msg, user) => {
          if (user.status.name == "selecting") {
            let money = Math.floor(Math.range(2, 15));
            user.money -= money;
            clearSelection(user);

            msg.reply(
              "10초동안 가만히 있는 당신을 본 고블린은 슬그머니 소매치기를 했다.\n돈: -" +
                money
            );
          }
        },
        10 * 1000,
        [msg, user]
      );
    },
    ratio: 5,
    selection: [
      {
        desc: "도망치기",
        func: (m, u) => {
          if (Math.randbool()) {
            let money = Math.floor(Math.range(2, 10));
            u.money -= money;
            m.reply("성공적으로 도망쳤...앗, 내 돈주머니!\n돈: -" + money);
          } else {
            m.reply("흙먼지로 시선을 돌리고 도망치는데 성공했다!");
          }
        },
      },
      {
        desc: "대화하기",
        func: (m, u) => {
          let money = Math.floor(Math.range(2, 5));
          u.money -= money;
          m.reply(
            "...도저히 무슨 언어인지 몰라 주저하던 순간 고블린이 돈주머니를 낚아챘다.\n돈: -" +
              money
          );
        },
      },
    ],
  },
  item: {
    func: (msg, user) => {
      let item =
        items[
          Math.clamp(
            Math.floor(Math.random() * items.length),
            0,
            items.length - 1
          )
        ];
      msg.reply(
        "길바닥에 떨어진 " + item.name + "을(를) 주웠다!\n" + item.name + ": +1"
      );
      let exist = user.items.items.find((i) => i.item == item.id);
      if (exist) exist.amount++;
      else user.items.items.push(new ItemEntity(item));
    },
    ratio: 50,
  },
};

const secure = {
  create: (msg) => {
    let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    let [id, pw] = msg.content.slice(4).split(/\s/);
    if (!id || !pw) msg.reply("!가입 <id> <pw>");
    else if (users.find((u) => u.id == id))
      msg.reply(id + " 는 이미 존재하는 계정입니다.");
    else {
      let target = new User(id, pw, hash);
      users.push(target);
      save();
      msg.reply("계정 생성 완료");
    }
  },
  remove: (msg) => {
    let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    let [id, pw] = msg.content.slice(4).split(/\s/);
    let target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply("!탈퇴 <id> <pw>");
    else if (!target) msg.reply("탈퇴 대상을 찾을 수 없습니다.");
    else if (target.pw !== pw) msg.reply("비밀번호가 일치하지 않습니다.");
    else if (target.hash !== hash) msg.reply("로그인하지 않았습니다.");
    else {
      users.splice(users.indexOf(target), 1);
      save();
      msg.reply("탈퇴 완료");
    }
  },
  signin: (msg) => {
    let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    let [id, pw] = msg.content.slice(5).split(/\s/);
    let target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply("!로그인 <id> <pw>");
    else if (!target) msg.reply("로그인 대상을 찾을 수 없습니다.");
    else if (target.pw !== pw) msg.reply("비밀번호가 일치하지 않습니다.");
    else if (target.hash)
      msg.reply(
        "이미 " +
          (target.hash == hash ? "이 계정에" : "누군가가") +
          " 로그인했습니다."
      );
    else login(id, pw, msg);
  },
  signout: (msg) => {
    let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    let target = users.find((u) => u.hash == hash);
    if (!target) msg.reply("로그인하지 않았습니다.");
    else {
      target.hash = "";
      save();
      msg.reply("로그아웃 완료");
    }
  },
};

let ratios = (() => {
  let evkeys = Object.keys(eventData);
  let total = evkeys.map((e) => eventData[e].ratio).reduce((e, a) => a + e);
  return evkeys.map(
    (k, i) =>
      (i > 0 ? (eventData[evkeys[i - 1]].ratio / total) * 100 : 0) +
      (eventData[k].ratio / total) * 100
  );
})();

let inter = setInterval(() => {
  try {
    if (users)
      users.forEach((u) => {
        u.energy = Math.min(
          u.stats.energy,
          u.energy + u.stats.energy_regen / 100
        );
      });
  } catch (e) {
    Log.info(e + "\n" + e.stack);
    clearInterval(inter);
  }
}, 10);
let selectionTimeout;

function search(msg, user) {
  let event =
    eventData[
      Object.keys(eventData)[
        ratios
          .sort((n1, n2) => (n1 > n2 ? 1 : -1))
          .findIndex((e) => Math.random() * 100 < e)
      ]
    ];
  if (!event) return msg.reply("매우 평화로운 초원에서 피톤치트를 느낀다.");
  event.func(msg, user);
  if (event.selection) {
    user.status.name = "selecting";
    user.status.callback = (m, u) => {
      let select = event.selection[parseInt(m.content.replace(/\D/g, ""))];
      if (select) {
        select.func(msg, user);
        clearSelection(user);
        clearTimeout(selectionTimeout);
      }
    };
    msg.reply(event.selection.map((e, i) => i + ". " + e.desc).join("\n"));
  }
  user.energy -= 5;
}

function save() {
  Database.writeObject("user_data", users);
}

function login(id, pw, msg) {
  let target = users.find((u) => u.id == id);
  let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
  let others = users.filter((u) => u !== target && u.hash == hash);
  if (others.length) {
    users = users.map((u) => {
      if (u == target || u.hash !== hash) return u;
      u.hash = "";
      return u;
    });
    msg.reply("다른 계정에서 자동 로그아웃 되었습니다.");
  }
  target.hash = hash;
  save();
  msg.reply("로그인 완료");
}

function onMessage(msg) {
  let hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
  if (perm.includes(hash) && msg.content.startsWith("de")) {
    try {
      let result = eval(msg.content.slice(2).trim());
      if (typeof result == "string" && result.length < 1)
        result = '[eval] 결과값이 ""입니다.';
      msg.reply(result);
    } catch (e) {
      msg.reply(e);
    }
  }

  if (msg.isGroupChat && !rooms.includes(msg.room)) return;

  let user = users.find((u) => u.hash == hash);
  if (user && user.status.callback && user.status.name == "selecting") {
    return user.status.callback(msg, user);
  }

  if (!msg.content.startsWith(prefix)) return;
  switch (msg.content.slice(1).split(/\s/)[0]) {
    case "돌아다니기":
      if (!user) return msg.reply("비로그인 상태입니다.");
      if (user.energy < 5)
        return msg.reply("기력이 부족합니다. " + user.energy.toFixed(1) + "/5");
      search(msg, user);
      save();
      break;
    case "상태창":
      if (!user) return msg.reply("비로그인 상태입니다.");
      msg.reply(
        msg.author.name +
          " (" +
          user.id +
          ")" +
          "\n-----------" +
          "\n돈: " +
          user.money +
          "\n기력: " +
          user.energy.toFixed(1) +
          "/" +
          user.stats.energy +
          " (" +
          user.stats.energy_regen +
          "기력/s)" +
          (user.items.items.length > 0
            ? "\n\n인벤토리\n" +
              user.items.items
                .map((i) => {
                  let item = getItem(i);
                  return (
                    "• " +
                    item.name +
                    (i.amount > 0 ? " (" + i.amount + "개)" : "") +
                    "\n   " +
                    item.description +
                    (item.health >= 0
                      ? "내구도: " + i.health + "/" + item.helath
                      : "")
                  );
                })
                .join("\n\n")
            : "")
      );
      break;
    case "소모":
      if (!user) return msg.reply("비로그인 상태입니다.");
      let name = msg.content.slice(4);
      if (!name) return msg.reply("!소모 <아이템명>");
      let item = items.find((i) => i.name == name && i.consume);
      if (!item) return msg.reply(name + "을(를) 찾을 수 없습니다.");
      item.consume(user, msg);
      break;
    case "계정":
      msg.reply(users.map((u) => u.id).join(" | "));
      break;
    case "가입":
      secure.create(msg);
      break;
    case "탈퇴":
      secure.remove(msg);
      break;
    case "로그인":
      secure.signin(msg);
      break;
    case "로그아웃":
      secure.signout(msg);
      break;
  }
}

bot.addListener(Event.MESSAGE, onMessage);
