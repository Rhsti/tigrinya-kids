const VISUAL_BY_ID = {
  a1: "/img/letter-words/inside.svg",
  b1: "/img/letter-words/sheep.svg",
  t1: "/img/letter-words/person.svg",
  h1: "/img/letter-words/book.svg",
  h2: "/img/letter-words/health.svg",
  n1: "/img/letter-words/king.svg",
  a2: "/img/letter-words/faith.svg",
  s1: "/img/letter-words/person.svg",
  d1: "/img/letter-words/monastery.svg",
  k1: "/img/letter-words/church.svg",
  f1: "/img/letter-words/horse.svg",
  g1: "/img/letter-words/money.svg"
};

const VISUAL_BY_MEANING = {
  sheep: "/img/letter-words/sheep.svg",
  friend: "/img/letter-words/friend.svg",
  word: "/img/letter-words/book.svg",
  sickness: "/img/letter-words/health.svg",
  king: "/img/letter-words/king.svg",
  god: "/img/letter-words/faith.svg",
  person: "/img/letter-words/person.svg",
  monastery: "/img/letter-words/monastery.svg",
  church: "/img/letter-words/church.svg",
  horse: "/img/letter-words/horse.svg",
  money: "/img/letter-words/money.svg"
};

export function getLetterVisual(letter) {
  if (!letter) {
    return "/img/letter-words/default.svg";
  }

  if (letter.img) {
    return letter.img;
  }

  const byId = VISUAL_BY_ID[letter.id];
  if (byId) {
    return byId;
  }

  const meaning = String(letter.meaning || "").toLowerCase().trim();
  if (meaning && VISUAL_BY_MEANING[meaning]) {
    return VISUAL_BY_MEANING[meaning];
  }

  return "/img/letter-words/default.svg";
}
