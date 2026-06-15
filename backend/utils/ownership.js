function isSameAuthor(record, actor) {
  if (!record || !actor?.nickname) return false;

  const recordEmail = (record.authorEmail || record.participantEmail || '').trim().toLowerCase();
  const actorEmail = (actor.email || '').trim().toLowerCase();

  if (recordEmail && actorEmail) {
    return recordEmail === actorEmail;
  }

  const recordAuthor = (record.author || record.participant || record.userId || '').trim();
  return recordAuthor === actor.nickname.trim();
}

function isTierListOwner(tierList, actor) {
  return isSameAuthor(tierList, actor);
}

function isCommentOwner(comment, actor) {
  return isSameAuthor(comment, actor);
}

function getVoterKey(actor) {
  if (!actor?.nickname) return '';
  const email = (actor.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  if (actor.isAdmin) return `admin:${actor.nickname}`;
  return `nick:${actor.nickname}`;
}

module.exports = {
  isSameAuthor,
  isTierListOwner,
  isCommentOwner,
  getVoterKey,
};