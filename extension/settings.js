const $ = (id) => document.getElementById(id);

// Load saved settings
chrome.storage.sync.get(["apiUrl", "token"], ({ apiUrl, token }) => {
  if (apiUrl) $("apiUrl").value = apiUrl;
  if (token) $("token").value = token;
});

$("saveBtn").addEventListener("click", () => {
  const apiUrl = $("apiUrl").value.trim().replace(/\/$/, "");
  const token = $("token").value.trim();

  if (!apiUrl || !token) {
    showMsg("Both fields are required.", "error");
    return;
  }

  chrome.storage.sync.set({ apiUrl, token }, () => {
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
