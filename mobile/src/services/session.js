let token = null;
function setToken(value) { token = value; }
function getToken() { return token; }
function clearSession() { token = null; }
module.exports = { setToken, getToken, clearSession };
