const $ = (id) => document.getElementById(id);

function showMsg(text, type) {
  const el = $("msg");
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.display = "block";
  if (type === "success") setTimeout(() => (el.style.display = "none"), 3000);
}

const API_URL = "https://backend-production-e4a61.up.railway.app/api";

async function getToken() {
  return new Promise((resolve) =>
    chrome.storage.sync.get(["token"], ({ token }) => resolve(token))
  );
}

async function init() {
  const token = await getToken();

  if (!token) {
    $("noToken").style.display = "block";
    return;
  }

  $("main").style.display = "block";

  // Scrape job data from current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "SCRAPE_JOB" }, (data) => {
      if (chrome.runtime.lastError || !data) return;
      if (data.company) $("company").value = data.company;
      if (data.role) $("role").value = data.role;
      if (data.location) $("location").value = data.location;
      if (data.description) $("description").value = data.description;
    });
  });
}

$("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

$("openSettings")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

$("submitBtn").addEventListener("click", async () => {
  const company = $("company").value.trim();
  const role = $("role").value.trim();

  if (!company || !role) {
    showMsg("Company and role are required.", "error");
    return;
  }

  const token = await getToken();
  const btn = $("submitBtn");
  btn.disabled = true;
  btn.textContent = "Adding…";

  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const jobUrl = tabs[0]?.url || "";

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company,
          role,
          location: $("location").value.trim() || undefined,
          status: $("status").value,
          job_description: $("description").value.trim() || undefined,
          job_url: jobUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Token expired — go to Settings → Copy Token and update the extension.");
        throw new Error(err.error || `Error ${res.status}`);
      }

      showMsg("Added to Applied!", "success");
      btn.textContent = "Added ✓";
      setTimeout(() => {
        btn.textContent = "Add to Applied";
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      showMsg(err.message, "error");
      btn.textContent = "Add to Applied";
      btn.disabled = false;
    }
  });
});

init();
