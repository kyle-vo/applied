const $ = (id) => document.getElementById(id);

const API_URL = "https://backend-production-ab8c.up.railway.app/api";

// Load saved token
chrome.storage.sync.get(["token"], ({ token }) => {
  if (token) $("token").value = token;
});

$("saveBtn").addEventListener("click", () => {
  const token = $("token").value.trim();

  if (!token) {
    showMsg("Token is required.", "error");
    return;
  }

  chrome.storage.sync.set({ token }, () => {
    showMsg("Settings saved!", "success");
  });
});

function showMsg(text, type) {
  const el = $("msg");
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.display = "block";
  if (type === "success") setTimeout(() => (el.style.display = "none"), 2000);
}
