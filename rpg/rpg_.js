const bot = BotManager.getCurrentBot();
const UserSecure = require("secure");
const Content = require("items");
const prefix = "!";
const perm = [-2072057940];
const rooms = ["Sharlotted Bot Test"];
let users = Database.readObject("user_data");

//additional functions
Math.range = (from, to) => from + Math.random() * (to - from);
Math.randbool = () => Math.random() > 0.5;
Math.clamp = function (value, min, max) {
  if (value > max) return max;
  else if (value < min) return min;
  else return value;
};

function ItemEntity(item) {
  this.item = item.id;
  this.health = item.helath;
  this.amount = 1;
}

function UnitEntity(unit) {
  this.health = unit.health;
}

function getItem(entity) {
  return Content.items[entity.item];
}

//선택창 초기화
function clearSelection(user) {
  user.status.name = "";
  user.status.callback = () => {};
}

function mkbattleselect(msg, user, unit) {
  user.status.name = "selecting";
  user.status.callback = (m, u) => {
    let select = battleSelection[parseInt(m.content.replace(/\D/g, ""))];
    if (select) {
      clearSelection(user);
      select.func(m, u, unit);
    }
  };
  msg.reply(battleSelection.map((e, i) => i + ". " + e.desc).join("\n"));
}
function battle(msg, user, unit) {
  msg.reply("전투 발생!\n" + user.name + " vs " + unit.name);
  mkbattleselect(msg, user, new UnitEntity(unit));
}

users.forEach(clearSelection);

//데이터 동기화
(() => {
  let tamp = new UserSecure.User("", "", "");
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

const battleSelection = [
  {
    desc: "공격하기",
    func: (msg, user, target) => {
      if (user.items.weapon.cooltime > 0)
        return msg.reply("무기 쿨타임: " + user.items.weapon.cooltime + "s");
      let weapon = Content.items[user.items.weapon.id];
      if (!weapon) {
        weapon = {
          name: "주먹",
          damage: 1,
          cooltime: 0.5,
        };
      }
      user.items.weapon.cooltime = weapon.cooltime;
      target.health -= weapon.damage;
      msg.reply("명중! 적에게 " + weapon.damage + "만큼 데미지를 입혔습니다!");
      if (target.health == 0) msg.reply("승리! 상대의 hp가 0입니다!");
      else if (target.health < 0)
        msg.reply("오버킬 승리! " + target.health + "hp");
      else mkbattleselect(msg, user, target);
    },
  },
];

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
        Content.items[
          Math.clamp(
            Math.floor(Math.random() * Content.items.length),
            0,
            Content.items.length - 1
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
  obstacle: {
    func: (msg, user) => {
      msg.reply("불쾌할 정도로 거대한 장애물을 발견했다!");
    },
    ratio: 10,
    selection: [
      {
        desc: "공격하기",
        func: (m, u) => battle(m, u, Content.units[0]),
      },
      {
        desc: "지나가기",
        func: (m, u) => {
          m.reply("이런 겁쟁이 같으니라고.");
        },
      },
    ],
  },
};

const ratios = (() => {
  let evkeys = Object.keys(eventData);
  let total = evkeys.map((e) => eventData[e].ratio).reduce((e, a) => a + e);
  return evkeys
    .sort((n1, n2) => (n1.ratio > n2.ratio ? 1 : -1))
    .map(
      (k, i) =>
        (i > 0 ? (eventData[evkeys[i - 1]].ratio / total) * 100 : 0) +
        (eventData[k].ratio / total) * 100
    );
})();

function levelup(user) {
  bot.send(
    rooms[0],
    user.id +
      " 레벨 업! " +
      user.level +
      "lv -> " +
      (user.level + 1) +
      "lv" +
      "\n모든 체력과 기력이 회복됩니다." +
      "\n체력: " +
      user.stats.health +
      "hp -> " +
      (user.stats.health += Math.pow(user.level, 0.6) * 5) +
      "hp" +
      "\n기력: " +
      user.stats.energy +
      " -> " +
      (user.stats.energy += Math.pow(user.level, 0.4) * 2.5)
  );
  user.health = user.stats.health;
  user.energy = user.stats.energy;
  user.level++;
}

const inter = setInterval(() => {
  try {
    if (users)
      users.forEach((u) => {
        if (u.exp > Math.pow(u.level, 2) * 50) {
          levelup(u);
        }
        if (u.items.weapon.cooltime > 0) u.items.weapon.cooltime -= 1 / 100;
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
      Object.keys(eventData).sort((n1, n2) => (n1.ratio > n2.ratio ? 1 : -1))[
        ratios.findIndex((e) => Math.random() * 100 < e)
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

function read() {
  return Database.readObject("user_data");
}
function save() {
  Database.writeObject("user_data", users);
}

function onMessage(msg) {
  if (msg.isGroupChat && !rooms.includes(msg.room)) return;

  const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
  const user = users.find((u) => u.hash == hash);

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

  if (user && user.status.callback && user.status.name == "selecting") {
    return user.status.callback(msg, user);
  }

  if (!msg.content.startsWith(prefix)) return;
  switch (msg.content.slice(1).split(/\s/)[0]) {
    case "돌아다니기":
      if (!user) return msg.reply("비로그인 상태입니다.");
      else if (user.energy < 5) {
        if (user.countover >= 3) {
          msg.reply("게임을 좀 여유롭게 플레이하세요.");
        } else {
          user.countover++;
          msg.reply("기력이 부족합니다. " + user.energy.toFixed(1) + "/5");
        }
      } else {
        user.countover = 0;
        search(msg, user);
      }
      save();
      break;
    case "상태창":
      if (!user) return msg.reply("비로그인 상태입니다.");
      let targetid = msg.content.split(/\s/)[1];
      let target = targetid
        ? users.find((u) => u.id == targetid) ||
          msg.reply("계정 " + targetid + "(을)를 찾을 수 없습니다.")
        : user;
      if (!target) return;
      msg.reply(
        target.id +
          " " +
          target.level +
          "lv, " +
          target.exp +
          "exp/" +
          Math.pow(target.level, 2) * 50 +
          "exp" +
          "\n-----------" +
          "\n돈: " +
          target.money +
          "\n기력: " +
          target.energy.toFixed(1) +
          "/" +
          target.stats.energy +
          " (" +
          target.stats.energy_regen +
          "기력/s)" +
          (target.items.items.length > 0
            ? "\n\n인벤토리\n" +
              target.items.items
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
      let item = Content.items.find((i) => i.name == name && i.consume);
      if (!item) return msg.reply(name + "을(를) 찾을 수 없습니다.");
      item.consume(user, msg);
      break;
    case "계정":
      msg.reply(users.map((u) => u.id).join(" | "));
      break;
    case "가입":
      UserSecure.create(msg);
      users = read();
      break;
    case "탈퇴":
      UserSecure.remove(msg);
      users = read();
      break;
    case "로그인":
      UserSecure.signin(msg);
      users = read();
      break;
    case "로그아웃":
      UserSecure.signout(msg);
      users = read();
      break;
    case "변경":
      UserSecure.change(msg);
      users = read();
      break;
  }
}

bot.addListener(Event.MESSAGE, onMessage);
