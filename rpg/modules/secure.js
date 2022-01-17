function Healthy(health) {
  this.health;
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
  this.stats = {
    health: 100,
    health_regen: 1,
    energy: 50,
    energy_regen: 1,
    strength: 10,
    defense: 0,
  };
  this.items = {
    weapon: {
      cooltime: 0,
      id: -1,
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
    msg.reply("다른 계정에서 자동 로그아웃 되었습니다.");
  }
  target.hash = hash;
  Database.writeObject("user_data", users);
  msg.reply("로그인 완료");
}

module.exports = {
  User: User,
  create: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(4).split(/\s/);
    if (!id || !pw) msg.reply("!가입 <id> <pw>");
    else if (users.find((u) => u.id == id))
      msg.reply(id + " 는 이미 존재하는 계정입니다.");
    else {
      const target = new User(id, pw, hash);
      users.push(target);
      login(users, target, msg);
      msg.reply("계정 생성 완료");
    }
  },
  remove: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(4).split(/\s/);
    const target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply("!탈퇴 <id> <pw>");
    else if (!target) msg.reply("탈퇴 대상을 찾을 수 없습니다.");
    else if (target.pw !== pw) msg.reply("비밀번호가 일치하지 않습니다.");
    else if (target.hash !== hash) msg.reply("로그인하지 않았습니다.");
    else {
      users.splice(users.indexOf(target), 1);
      Database.writeObject("user_data", users);
      msg.reply("탈퇴 완료");
    }
  },
  signin: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const [id, pw] = msg.content.slice(5).split(/\s/);
    const target = users.find((u) => u.id == id);
    if (!id || !pw) msg.reply("!로그인 <id> <pw>");
    else if (!target) msg.reply("로그인 대상을 찾을 수 없습니다.");
    else if (target.pw !== pw) msg.reply("비밀번호가 일치하지 않습니다.");
    else if (target.hash)
      msg.reply(
        "이미 " +
          (target.hash == hash ? "이 계정에" : "누군가가") +
          " 로그인했습니다."
      );
    else login(users, target, msg);
  },
  signout: (msg) => {
    const users = Database.readObject("user_data");
    const hash = java.lang.String(msg.author.avatar.getBase64()).hashCode();
    const target = users.find((u) => u.hash == hash);
    if (!target) msg.reply("로그인하지 않았습니다.");
    else {
      target.hash = "";
      Database.writeObject("user_data", users);
      msg.reply("로그아웃 완료");
    }
  },
  change: (msg) => {
    const users = Database.readObject("user_data");
    const [, type, id, pw, changeto] = msg.content.split(/\s/);
    const target = users.find((u) => u.id == id);
    if (!id || !pw || !(type == "아이디" || type == "비번") || !changeto)
      msg.reply("!변경 (아이디|비번) <id> <pw> <바꿀 id 또는 pw>");
    else if (!target) {
      msg.reply("계정 " + id + "를 찾을 수 없습니다.");
    } else if (type == "아이디") {
      if (users.find((u) => u.id == changeto))
        msg.reply(changeto + "(은)는 이미 존재하는 계정입니다.");
      else {
        msg.reply(
          "이전 아이디 " + target.id + "를 " + changeto + "로 변경했습니다."
        );
        target.id = changeto;
      }
    } else if (type == "비번") {
      msg.reply(
        "이전 비밀번호 " + target.id + "를 " + changeto + "로 변경했습니다."
      );
      target.pw = changeto;
    }

    Database.writeObject("user_data", users);
  },
};
