const Bundle = require("bundle");

function Healthy(health) {
  this.health = health;
}

function User(id, pw, hash) {
  Object.assign(this, new Healthy(100));
  this.id = id;
  this.pw = pw;
  this.hash = hash;
  this.money = 0;
  this.energy = 50;
  this.level = 1;
  this.exp = 0;
  this.countover = 0;
  this.lang = "ko";
  this.stats = {
    health: 100,
    health_regen: 0.1,
    energy: 50,
    energy_regen: 0.5,
    strength: 10,
    defense: 0,
  };
  this.items = {
    weapon: {
      cooltime: 0,
      id: 2,
      health: 0,
    },
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
    found: [],
  };
  this.status = {
    name: "",
    callback: () => {},
  };
}
function login(users, target, msg) {
  const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
  const others = users.filter((u) => u !== target && u.hash == hash);
  if (others.length) {
    users = users.map((u) => {
      if (u == target || u.hash !== hash) return u;
      u.hash = "";
      return u;
    });
    msg.reply(Bundle.find(target.lang, "auto_logout"));
  }
  target.hash = hash;
  Database.writeObject("user_data", users);
  msg.reply(Bundle.find(target.lang, "login_success"));
}

module.exports = {
  User: User,
  create: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(4).split(/\s/);
    if (!id || !pw) msg.reply(Bundle.find("ko", "create_help"));
    else if (users.find((u) => u.id == id))
      msg.reply(
        Bundle.find(users.find((u) => u.id == id).lang, "account_exist").format(
          id
        )
      );
    else {
      const target = new User(id, pw, hash);
      users.push(target);
      login(users, target, msg);
      msg.reply(Bundle.find(target.lang, "create_success"));
    }
  },
  remove: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(4).split(/\s/);
    const target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply(Bundle.find("ko", "remove_help"));
    else if (!target) msg.reply(Bundle.find("ko", "account_notFound"));
    else if (target.pw !== pw)
      msg.reply(Bundle.find(target.lang, "account_incorrect"));
    else if (target.hash !== hash)
      msg.reply(Bundle.find(target.lang, "account_notLogin"));
    else {
      users.splice(users.indexOf(target), 1);
      Database.writeObject("user_data", users);
      msg.reply(Bundle.find(target.lang, "remove_success"));
    }
  },
  signin: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(5).split(/\s/);
    const target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply(Bundle.find("ko", "login_help"));
    else if (!target) msg.reply(Bundle.find("ko", "account_notFound"));
    else if (target.pw !== pw)
      msg.reply(Bundle.find(target.lang, "account_incorrect"));
    else if (target.hash)
      msg.reply(
        target.hash == hash
          ? Bundle.find(target.lang, "account_have")
          : Bundle.find(target.lang, "account_has")
      );
    else login(users, target, msg);
  },
  signout: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const target = users.find((u) => u.hash == hash);
    if (!target) msg.reply(Bundle.find("ko", "account_notLogin"));
    else {
      target.hash = "";
      Database.writeObject("user_data", users);
      msg.reply(Bundle.find(target.lang, "logout_success"));
    }
  },
  change: (msg) => {
    const users = Database.readObject("user_data");
    const [, type, id, pw, changeto] = msg.content.split(/\s/);
    const target = users.find((u) => u.id == id);
    if (
      !id ||
      !pw ||
      !type ||
      !(type.toLowerCase() == "id" || typet.toLowerCase() == "pw") ||
      !changeto
    )
      msg.reply(Bundle.find("ko", "change_help"));
    else if (!target) {
      msg.reply(Bundle.find("ko", "account_notFound"));
    } else if (type.toLowerCase() == "pw") {
      if (users.find((u) => u.id == changeto))
        msg.reply(Bundle.find(target.lang, "account_exist").format(id));
      else {
        msg.reply(
          Bundle.find(target.lang, "change_id").format(target.id, changeto)
        );
        target.id = changeto;
      }
    } else if (type.toLowerCase() == "id") {
      msg.reply(
        Bundle.find(target.lang, "change_pw").format(target.id, changeto)
      );
      target.pw = changeto;
    }

    Database.writeObject("user_data", users);
  },
  setLang: (msg) => {
    const [, langto] = msg.content.split(/\s/);
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const user = users.find((u) => u.hash == hash);

    if (!user) return msg.reply(Bundle.find("ko", "account_notLogin"));
    if (!langto || !Bundle.langs.includes(langto))
      return msg.reply(
        Bundle.find(user.lang, "lang_help").format(Bundle.langs.join(" | "))
      );

    msg.reply(Bundle.find(user.lang, "lang_success").format(user.lang, langto));
    user.lang = langto;
    Database.writeObject("user_data", users);
  },
};
