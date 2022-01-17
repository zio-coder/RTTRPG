function Consumable(callback, amount) {
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
}

function Item(name, description, details, health) {
  this.name = name;
  this.description = description;
  this.details = details;
  this.health = Number(health || -1); //infinity
  this.id = items.length;
}

/**
 * buff obj
 * ---------------------
 * @health: recover health instantly
 * @energy: recover energy instantly
 **/
function Potion(name, description, details, health, buff) {
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
}

function Weapon(
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
}

function Armor(name, description, details, health, armor, type) {
  Object.assign(this, new Item(name, description, details, health));
  this.armor = Number(armor);
  this.type = type || "others";
}

function Shield(name, description, details, health, armor) {
  Object.assign(
    this,
    new Armor(name, description, details, health, armor, "shield")
  );
  this.def = 0.1;
}

function Accessory(name, description, details, health, buff) {
  Object.assign(this, new Item(name, description, details, health));
  this.buff = buff;

  this.addBuff = (name, amount) => {
    this.buff[name] = Number(amount);
    return this;
  };
}

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

const units = [];
units.push(
  new Item(
    "장애물",
    "누가 이런 거대한 장애물을 길바닥에 버려둔 걸까요?",
    "한밤중, 가끔 이 장애물에서 반짝거림을 느낀다.",
    5
  )
);
module.exports = {
  items: items,
  units: units,
};
