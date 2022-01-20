const bot = BotManager.getCurrentBot();
const UserSecure = require("secure");
const Contents = require("items");
const prefix = "!";
const perm = [-2072057940];
const rooms = [
  "Sharlotted Bot Test",
  "[Main] 데브로봇스 커뮤니티 | Devlobots",
  "카카오톡 봇 커뮤니티",
  "밥풀이의 코딩&프로그래밍 소통방",
];
let users = Database.readObject("user_data");
//additional functions
Math.range = function (from, to) {
  return from + Math.random() * (to - from);
};
Math.randbool = function (pred) {
  return Math.random() < (pred || 0.5);
};
Math.clamp = function (value, min, max) {
  if (value > max) return max;
  else if (value < min) return min;
  else return value;
};
String.prototype.format = function () {
  var formatted = this;
  for (var arg in arguments) {
    formatted = formatted.replace("{" + arg + "}", arguments[arg]);
  }
  return formatted;
};
Number.prototype.floor = function (step) {
  return Math.round(this * Math.pow(10, step)) / Math.pow(10, step);
};

function EventData(ratio, callback, selections) {
  this.ratio = ratio;
  this.func = callback;
  this.selection = selections;
}

function ItemEntity(item, amount) {
  this.id = item.id;
  this.health = item.health;
  this.amount = Number(amount || 1);
}
function WeaponEntity(weapon, amount) {
  Object.assign(this, new ItemEntity(weapon, amount));
  this.cooldown = 0;
}

function UnitEntity(unit) {
  this.id = unit.id;
  this.health = unit.health;
  this.items = unit.items;
}

function getItem(entity) {
  return Contents.items[entity.id];
}

//선택창 초기화
function clearSelection(user) {
  user.status.name = null;
  user.status.callback = null;
}

function makeSelection(msg, user, unit, selections) {
  user.status.name = "selecting";
  user.status.callback = (m, u) => {
    let select =
      selections[parseInt(m.content.split(/\s/)[0].replace(/\D/g, ""))];
    if (select) {
      clearSelection(u);
      select.func(m, u, unit);
    }
  };
  msg.reply(selections.map((e, i) => i + ". " + e.desc).join("\n"));
}

function battle(msg, user, unit) {
  msg.reply("전투 발생!\n" + user.id + " vs " + unit.name);
  makeSelection(msg, user, new UnitEntity(unit), battleSelection);
}

function battlewin(msg, user, target) {
  let unit = Contents.units[target.id];
  let items = [];
  for (let i = 0; i < Math.floor(Math.range(unit.level, unit.level + 2)); i++) {
    let item = getOne(
      Contents.items.filter((i) => i.dropable),
      "rare"
    );
    if (item) {
      let obj = items.find((i) => i.item == item);
      if (obj) obj.amount++;
      else items.push({ item: item, amount: 1 });
    }
  }
  msg.reply(
    "전투 보상\n-----------\n경험치: {0}exp -> {1}exp{2}".format(
      user.exp,
      (user.exp += unit.level * (1 + unit.rare) * 10),
      items.length > 0
        ? "\n\n얻은 아이템: \n{0}".format(
            items
              .map((i) => "+{0} {1}개".format(i.item.name, i.amount))
              .join("\n")
          ) + "\n"
        : ""
    )
  );
  items.forEach((i) => giveItem(msg, user, i.item));
  save();
}

/**
 * 해당 유저의 인벤토리에 아이템을 추가한다. 유저가 처음 받는 아이템일 경우 도감에 수록됨.
 * @param {Message} msg reply용으로 쓰일 메시지 객체
 * @param {User} user 아이템을 받을 유저 객체
 * @param {Item} item 유저에게 줄 아이템 객체
 * @param {number} [amount=1] 아이템 수량, 기본값 1
 */
function giveItem(msg, user, item, amount) {
  if (!user.items.found.includes(item.id)) {
    msg.reply("첫 발견! 도감에 수록되었습니다.");
    user.items.found.push(item.id);
  }
  let exist = user.items.items.find((i) => i.id == item.id);
  if (exist) exist.amount += amount || 1;
  else
    user.items.items.push(
      item.type == "weapon"
        ? new WeaponEntity(item, amount)
        : new ItemEntity(item, amount)
    );
  save();
}

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

const exchangeSelection = [
  {
    desc: "구매하기",
    func: (msg, user, target) => {
      let repeat = (m, u, t) =>
        makeSelection(
          m,
          u,
          t,
          t.items
            .map((entity) => {
              let item = getItem(entity);
              let money = (item.dropable ? 1 - item.rare : item.rare) * 35;
              return {
                desc: "{0}: {1}원 ({2}개 보유)".format(
                  item.name,
                  money,
                  entity.amount
                ),
                func: (m, u, t) => {
                  [, a] = m.content.split(/\s/);
                  let amount = Number((a || "1").replace(/\D/g, "") || 1);
                  if (amount > entity.amount)
                    m.reply(
                      "{0}(을)를 {1}만큼 가지고 있지 않습니다. 보유 수량: {2}".format(
                        item.name,
                        amount,
                        entity.amount
                      )
                    );
                  else if (u.money < amount * money)
                    m.reply(
                      "돈이 부족합니다. 필요금: {0}원 > 보유금: {1}원".format(
                        amount * money,
                        u.money
                      )
                    );
                  else {
                    m.reply(
                      "{0}(을)를 {1}개만큼 구매했다.\n보유금 {2}원 -> {3}원".format(
                        item.name,
                        amount,
                        u.money,
                        (u.money -= money * amount)
                      )
                    );
                    entity.amount -= amount;
                    giveItem(msg, u, item, amount);
                    if (entity.amount == 0)
                      t.items.splice(t.items.indexOf(entity), 1);
                    save();
                  }

                  repeat(m, u, t);
                },
              };
            })
            .concat({
              desc: "돌아가기",
              func: (m, u, t) => {
                makeSelection(m, u, t, exchangeSelection);
              },
            })
        );
      repeat(msg, user, target);
    },
  },
  {
    desc: "판매하기",
    func: (msg, user, target) => {
      let repeat = (m, u, t) =>
        makeSelection(
          m,
          u,
          t,
          u.items.items
            .map((entity) => {
              let item = getItem(entity);
              let money = (item.dropable ? 1 - item.rare : item.rare) * 10;
              return {
                desc: "{0}: {1}원 ({2}개 보유)".format(
                  item.name,
                  money,
                  entity.amount
                ),
                func: (m, u, t) => {
                  [, a] = m.content.split(/\s/);
                  let amount = Number((a || "1").replace(/\D/g, "") || 1);
                  if (amount > entity.amount)
                    m.reply(
                      "{0}(을)를 {1}만큼 가지고 있지 않습니다. 보유 수량: {2}".format(
                        item.name,
                        amount,
                        entity.amount
                      )
                    );
                  else {
                    m.reply(
                      "{0}(을)를 {1}개만큼 판매했다.\n보유금 {2}원 -> {3}원".format(
                        item.name,
                        amount,
                        u.money,
                        (u.money += money * amount)
                      )
                    );
                    entity.amount -= amount;
                    if (entity.amount == 0)
                      u.items.items.splice(u.items.items.indexOf(entity), 1);
                    save();
                  }

                  repeat(m, u, t);
                },
              };
            })
            .concat({
              desc: "돌아가기",
              func: (m, u, t) => {
                makeSelection(m, u, t, exchangeSelection);
              },
            })
        );
      repeat(msg, user, target);
    },
  },
  {
    desc: "지나가기",
    func: (msg, user, target) => {
      msg.reply("고블린은 좋은 거래 상대를 만났다며 홀가분하게 떠났다.");
      return;
    },
  },
];
const battleSelection = [
  {
    desc: "공격하기",
    func: (msg, user, target) => {
      if (user.items.weapon.cooltime > 0) {
        msg.reply(
          "무기 쿨타임: {0}s".format(user.items.weapon.cooltime.toFixed(2))
        );
        makeSelection(msg, user, target, battleSelection);
        return;
      }
      let weapon = Contents.items[user.items.weapon.id];
      if (!weapon) {
        weapon = Contents.items.find((u) => u.name == "주먹");
        user.items.weapon = new WeaponEntity(weapon);
      }
      if (Math.randbool(weapon.critical_chance))
        msg.reply(
          "치명타 명중! 적에게 {0}(으)로 {1}만큼 데미지를 입혔습니다!\n{2}hp -> {3}hp".format(
            weapon.name,
            (weapon.damage * weapon.critical_ratio).floor(2),
            target.health.floor(2),
            (target.health -= (weapon.damage * weapon.critical_ratio).floor(
              2
            )).toFixed(2)
          )
        );
      else
        msg.reply(
          "명중! 적에게 {0}(으)로 {1}만큼 데미지를 입혔습니다!\n{2}hp -> {3}hp".format(
            weapon.name,
            weapon.damage,
            target.health.toFixed(2),
            (target.health -= weapon.damage.floor(2)).toFixed(2)
          )
        );

      if (user.items.weapon.health >= 0) {
        if (user.items.weapon.health > 1) user.items.weapon.health--;
        else {
          //TODO 개수가 여러개인 무기가 체력을 공유함
          msg.reply("무기 {0}(이)가 파괴되었습니다!".format(weapon.name));
          weapon = Contents.items.find((u) => u.name == "주먹");
          user.items.weapon = new WeaponEntity(weapon);
          save();
        }
      }

      if (target.health <= 0) {
        msg.reply(
          (target.health < 0 ? "오버킬 " : "") +
            "승리! 상대의 hp가 {0}입니다!".format(target.health.toFixed(2))
        );
        battlewin(msg, user, target);
      } else makeSelection(msg, user, target, battleSelection);
    },
  },
];

const eventData = [
  new EventData(10, (msg, user) =>
    msg.reply(
      "전투가 발생했지만 그들은 당신의 빛나는 머리를 보고 쓰러졌습니다!"
    )
  ),
  new EventData(35, (msg, user) => {
    let money = 2 + Math.floor(Math.random() * 10);
    msg.reply("길바닥에 떨어진 동전을 주웠다!\n돈 +" + money);
    user.money += money;
  }),
  new EventData(
    5,
    (msg, user) => {
      msg.reply("지나가던 고블린을 조우했다!");
      selectionTimeout = setTimeout(
        (msg, user) => {
          if (user.status.name == "selecting") {
            let money = Math.floor(Math.range(2, 15));
            user.money -= money;
            clearSelection(user);

            msg.reply(
              "10초동안 가만히 있는 당신을 본 고블린은 슬그머니 소매치기를 했다.\n돈: -{0}".format(
                money
              )
            );
          }
        },
        10 * 1000,
        [msg, user]
      );
    },
    [
      {
        desc: "도망치기",
        func: (m, u) => {
          if (Math.randbool()) {
            let money = Math.floor(Math.range(2, 10));
            u.money -= money;
            m.reply(
              "성공적으로 도망쳤...앗, 내 돈주머니!\n돈: -{0}".format(money)
            );
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
            "...도저히 무슨 언어인지 몰라 주저하던 순간 고블린이 돈주머니를 낚아챘다.\n돈: -{0}".format(
              money
            )
          );
        },
      },
      {
        desc: "거래하기",
        func: (msg, unit) => {
          let goblin = new UnitEntity(Contents.units[1]);
          for (let i = 0; i < 20; i++) {
            let item = getOne(
              Contents.items.filter((i) => i.dropable),
              "rare"
            );
            let exist = goblin.items.find((entity) => getItem(entity) == item);
            if (exist) exist.amount++;
            else
              goblin.items.push(
                item.type == "weapon"
                  ? new WeaponEntity(item)
                  : new ItemEntity(item)
              );
          }

          let item = getOne(
            Contents.items.filter((i) => !i.dropable),
            "rare"
          );
          goblin.items.push(
            item.type == "weapon"
              ? new WeaponEntity(item)
              : new ItemEntity(item)
          );
          msg.reply("고블린과 거래를 시도한다.");
          makeSelection(msg, unit, goblin, exchangeSelection);
        },
      },
    ]
  ),
  new EventData(50, (msg, user) => {
    let item = getOne(
      Contents.items.filter((i) => i.dropable),
      "rare"
    );
    msg.reply(
      "길바닥에 떨어진 {0}을(를) 주웠다!\n{1}: +1".format(item.name, item.name)
    );
    giveItem(msg, user, item);
  }),
  new EventData(
    10,
    (msg, user) => msg.reply("불쾌할 정도로 거대한 장애물을 발견했다!"),
    [
      {
        desc: "공격하기",
        func: (m, u) => battle(m, u, Contents.units[0]),
      },
      {
        desc: "지나가기",
        func: (m, u) => {
          m.reply("이런 겁쟁이 같으니라고.");
        },
      },
    ]
  ),
];

/**
 *
 * @param {array} arr 아이템을 뽑을 아이템 배열
 * @param {string} ratio 아이템 비율 속성이름
 * @returns arr 배열의 인수 중 하나를 랜덤하게 반환
 */
function getOne(arr, ratio) {
  let random = Math.random();
  let total = arr.reduce((a, e) => a + e[ratio], 0);
  for (i in arr) {
    random -= arr[i][ratio] / total;
    if (random < 0) return arr[i];
  }
}

function levelup(user) {
  let str =
    "{0} 레벨 업! {1}lv -> {2}lv\n모든 체력 및 기력이 회복됩니다.\n체력: {3}hp -> {4}hp\n기력: {5} -> {6}".format(
      user.id,
      user.level,
      user.level + 1,
      user.stats.health,
      (user.stats.health += Math.pow(user.level, 0.6) * 5),
      user.stats.energy,
      (user.stats.energy += Math.pow(user.level, 0.4) * 2.5)
    );
  rooms.forEach((room) => bot.send(room, str));
  user.health = user.stats.health;
  user.energy = user.stats.energy;
  user.level++;
  save();
}

function checkusers() {
  users.forEach((user) => {
    if (user.exp > Math.pow(user.level, 2) * 50) {
      levelup(user);
    }
  });
}

const inter = setInterval(() => {
  try {
    if (users)
      users.forEach((u) => {
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

function startEvent(event, msg, user) {
  event.func(msg, user);
  if (event.selection) {
    user.status.name = "selecting";
    user.status.callback = (m, u) => {
      let select = event.selection[parseInt(m.content.replace(/\D/g, ""))];
      if (select) {
        clearSelection(user);
        select.func(msg, user);
        if (selectionTimeout) clearTimeout(selectionTimeout);
      }
    };
    msg.reply(event.selection.map((e, i) => i + ". " + e.desc).join("\n"));
  }
}

function search(msg, user) {
  let event = getOne(eventData, "ratio");
  if (!event) return msg.reply("매우 평화로운 초원에서 피톤치트를 느낀다.");
  startEvent(event, msg, user);
  user.energy -= 7;
}

function info(user, content) {
  return (
    (user.items.found.includes(content.id)
      ? content.name
      : content.name.replace(/./g, "?")) +
    "\n" +
    (user.items.found.includes(content.id)
      ? content.description
      : content.name.replace(/./g, "?")) +
    (content.details
      ? "\n------------\n  " +
        (user.items.found.includes(content.id)
          ? content.details
          : content.name.replace(/./g, "?")) +
        "\n------------"
      : "")
  );
}

function getContentInfo(user, msg) {
  const [, type] = msg.content.split(/\s/);
  if (type != "아이템" && type != "유닛")
    return msg.reply("!도감 (아이템|유닛) [이름]");

  let str = "";
  let name = msg.content.split(/\s/).slice(2).join(" ");
  if (type == "유닛") {
    if (name && !Contents.units.some((u) => u.name == name))
      return msg.reply("유닛 {0}(을)를 찾을 수 없습니다.".format(name));
    str = "유닛\n===============\n\n{0}\n\n".format(
      name
        ? info(
            user,
            Contents.units.find((u) => u.name == name)
          )
        : Contents.units.map((c) => info(user, c)).join("\n\n")
    );
  } else if (type == "아이템") {
    if (name && !Contents.items.some((u) => u.name == name))
      return msg.reply("아이템{0}(을)를 찾을 수 없습니다.".format(name));
    str = "아이템\n===============\n\n{0}\n\n".format(
      name
        ? info(
            user,
            Contents.items.find((u) => u.name == name)
          )
        : Contents.items.map((c) => info(user, c)).join("\n\n")
    );
  }
  return str;
}

function getInventory(user) {
  return "인벤토리\n-----------\n{0}{1}".format(
    user.items.items.length > 3 ? "\u200b".repeat(500) : "",
    user.items.items
      .map((i) => {
        let item = getItem(i);
        return "• {0} {1}\n   {2}{3}".format(
          item.name,
          i.amount > 0 ? "({0}개)".format(i.amount) : "",
          item.description,
          i.health && i.health > 0 && item.health && item.health > 0
            ? " 내구도: {0}/{1}".format(i.health, item.health)
            : ""
        );
      })
      .join("\n\n")
  );
}

function getUserInfo(user) {
  let weapon = Contents.items[user.items.weapon.id];
  if (!weapon) {
    weapon = Contents.items.find((u) => u.name == "주먹");
    save();
  }
  return "{0} {1}lv, {2}exp/{3}exp\n-----------\n돈: {4}원\n기력: {5}/{6} ({7}기력/s)\n체력: {8}/{9} ({10}체력/s)\n\n장비\n-------------\n무기: {11} {12}\n  *쿨다운: {13}s\n  *데미지: {14} ({15}%확률로 데미지의 {16}%만큼 치명타)".format(
    user.id,
    user.level,
    user.exp,
    Math.pow(user.level, 2) * 50,
    user.money,
    user.energy.toFixed(1),
    user.stats.energy,
    user.stats.energy_regen,
    user.health.toFixed(1),
    user.stats.health,
    user.stats.health_regen,
    weapon.name,
    user.items.weapon.health &&
      user.items.weapon.health > 0 &&
      weapon.health &&
      weapon.health > 0
      ? " 내구도: {0}/{1}".format(user.items.weapon.health, weapon.health)
      : "",

    weapon.cooldown,
    weapon.damage,
    (weapon.critical_chance * 100).toFixed(2),
    (weapon.critical_ratio * 100).toFixed(2)
  );
}

/**
 *
 * @param {User} user 가방에서 무기를 꺼내 장착할 유저 객체
 * @param {Message} msg 메시지를 보낼 객체
 * @param {string} weapon 무기 아이템 이름. 이 이름을 지닌 아이템은 무조건 damage를 가져야 함
 */
function switchWeapon(user, msg, weapon) {
  let item = Contents.items.find((i) => i.name == weapon);
  if (!item) msg.reply("무기 {0}(을)를 찾을 수 없습니다.".format(weapon));
  else {
    let entity = user.items.items.find((entity) => entity.id == item.id);
    if (!entity) msg.reply("무기 {0}(이)가 가방에 없습니다.".format(weapon));
    else {
      if (entity.amount == 1)
        user.items.items.splice(user.items.items.indexOf(entity), 1);
      else entity.amount--;

      if (user.items.weapon.id != -1) {
        msg.reply(
          "무기 {0}(을)를 장착하고 무기 {1}(을)를 가방에 넣었습니다.".format(
            weapon,
            Contents.items[user.items.weapon.id].name
          )
        );
        giveItem(msg, user, item);
        user.items.weapon.id = item.id;
      } else {
        msg.reply("무기 {0}(을)를 장착했습니다.".format(weapon));
        user.items.weapon.id = item.id;
      }
      save();
    }
  }
}

function read() {
  return Database.readObject("user_data");
}

function save() {
  checkusers();
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

  if (msg.content.startsWith(prefix))
    switch (msg.content.slice(1).split(/\s/)[0]) {
      case "상태창":
        if (!user) return msg.reply("비로그인 상태입니다.");
        var targetid = msg.content.split(/\s/)[1];
        var target = targetid
          ? users.find((u) => u.id == targetid) ||
            msg.reply("계정 {0}(을)를 찾을 수 없습니다.".format(targetid))
          : user;
        if (!target) return;
        msg.reply(getUserInfo(target));
        break;
      case "인벤토리":
        if (!user) return msg.reply("비로그인 상태입니다.");
        var targetid = msg.content.split(/\s/)[1];
        var target = targetid
          ? users.find((u) => u.id == targetid) ||
            msg.reply("계정 {0}(을)를 찾을 수 없습니다.".format(targetid))
          : user;
        if (!target) return;
        msg.reply(getInventory(target));
        break;
      case "소모":
        if (!user) return msg.reply("비로그인 상태입니다.");
        let name = msg.content.slice(4);
        if (!name) return msg.reply("!소모 <아이템명>");
        let item = Contents.items.find((i) => i.name == name && i.consume);
        if (!item) return msg.reply(name + "을(를) 찾을 수 없습니다.");
        item.consume(user, msg);
        break;
      case "도감":
        if (!user) return msg.reply("비로그인 상태입니다.");
        msg.reply(getContentInfo(user, msg));
        break;
      case "전환":
        if (!user) return msg.reply("비로그인 상태입니다.");
        let weapon = msg.content.split(/\s/).slice(1).join(" ");
        if (!weapon) msg.reply("!전환 <아이템>");
        else switchWeapon(user, msg, weapon);
        break;
    }

  if (user && user.status.callback && user.status.name == "selecting") {
    return user.status.callback(msg, user);
  }

  if (!msg.content.startsWith(prefix)) return;
  switch (msg.content.slice(1).split(/\s/)[0]) {
    case "돌아다니기":
      if (!user) return msg.reply("비로그인 상태입니다.");
      else if (user.energy < 7) {
        if (user.countover >= 3) {
          msg.reply("게임을 좀 여유롭게 플레이하세요.");
        } else {
          user.countover++;
          msg.reply("기력이 부족합니다. " + user.energy.toFixed(1) + "/7");
        }
      } else {
        user.countover = 0;
        search(msg, user);
      }
      save();
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
    case "언어":
      UserSecure.setLang(msg);
      users = read();
      break;
  }
}

bot.addListener(Event.MESSAGE, onMessage);
