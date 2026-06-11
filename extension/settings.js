const $ = (id) => document.getElementById(id);

const API_URL = "https://backend-production-e4a61.up.railway.app/api";

// Load saved API key
chrome.storage.sync.get(["apiKey"], ({ apiKey }) => {
  if (apiKey) $("apiKey").value = apiKey;
});

$("saveBtn").addEventListener("click", () => {
  const apiKey = $("apiKey").value.trim();

  if (!apiKey) {
    showMsg("API key is required.", "error");
    return;
  }

  chrome.storage.sync.set({ apiKey }, () => {
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
