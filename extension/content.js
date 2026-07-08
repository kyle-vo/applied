async function expandLinkedInDescription() {
  // The right-panel description is truncated behind a "…more" button — expand
  // it before scraping so we get the full text instead of the preview.
  const btn = [...document.querySelectorAll("button")].find((b) => {
    if (b.closest("footer, nav")) return false; // global "More" menu, not the description
    const label = (b.getAttribute("aria-label") || "").toLowerCase();
    const text = (b.innerText || "").trim().toLowerCase();
    return label.includes("see more") || /^(…|\.{3})?\s*more$/.test(text);
  });
  if (btn) {
    btn.click();
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function scrapeLinkedInSearchResults() {
  // LinkedIn search results pages use fully hashed class names and don't render
  // the job description panel in the DOM. Parse what we can from innerText.
  const url = window.location.href;
  const jobIdMatch = url.match(/currentJobId=(\d+)/);
  const currentJobId = jobIdMatch?.[1];

  // The /jobs/view/ link in the job card has the title as its innerText
  let role = "", company = "", location = "";
  if (currentJobId) {
    const jobViewLink = document.querySelector(`a[href*="/jobs/view/${currentJobId}"]`);
    if (jobViewLink) {
      role = jobViewLink.innerText?.trim().split("\n")[0] || "";

      // Walk up to find the job card container — stop at the smallest container
      // that has more than just the title but stay under 250 chars (the full right
      // panel is much larger and would give wrong results).
      let container = jobViewLink.parentElement;
      for (let i = 0; i < 8; i++) {
        const text = container?.innerText?.trim() || "";
        if (text.length > role.length + 3 && text.length < 250) {
          const lines = text.split("\n").map(l => l.trim()).filter(l => l);
          const titleIdx = lines.findIndex(l => l === role);
          if (titleIdx > -1) {
            // Older card layout puts the company on the line before the title
            company = lines[titleIdx - 1] || "";
            // The line after the title is either "City, ST · metadata" or the
            // combined "Company • City, ST (On-site)" form — split on both
            // separator characters and assign the pieces accordingly.
            const locRaw = lines[titleIdx + 1] || "";
            const parts = locRaw.split(/\s*[·•]\s*/).map(p => p.trim()).filter(Boolean);
            if (!company && parts.length >= 2) {
              company = parts[0];
              location = parts[1];
            } else {
              location = parts[0] || "";
            }
          }
          break;
        }
        container = container?.parentElement;
      }
    }
  }

  // Extract description from right panel via body innerText — "About the job" is the marker
  await expandLinkedInDescription();
  let description = "";
  const bodyText = document.body.innerText;
  const aboutIdx = bodyText.lastIndexOf("About the job");
  if (aboutIdx > -1) {
    const raw = bodyText.slice(aboutIdx + "About the job".length).trim();
    const cutoffs = ["About the company", "About the employer", "Show less", "Similar jobs", "Be an early applicant", "Job search faster with Premium", "Set alert for similar jobs", "Benefits found in job post"];
    let cutAt = raw.length;
    for (const c of cutoffs) {
      const idx = raw.indexOf(c);
      if (idx > 0 && idx < cutAt) cutAt = idx;
    }
    description = raw.slice(0, cutAt).trim();
  }

  return { role, company, location, description };
}

async function scrapeLinkedIn() {
  const isSearchResults = window.location.href.includes("/jobs/search-results") ||
    window.location.href.includes("/jobs/search/");
  if (isSearchResults) return scrapeLinkedInSearchResults();

  await expandLinkedInDescription();

  // LinkedIn hashes class names — use page title for role/company, innerText for location
  // Page title format: "Role | Company | LinkedIn"
  let role = "", company = "", location = "";
  const titleParts = (document.title || "").split(" | ").map(s => s.trim());
  role = titleParts[0] || "";
  company = titleParts[1] || "";

  // Location: in body text, appears after the role as "City, ST · metadata"
  const bodyText = document.body.innerText;
  if (role) {
    const roleIdx = bodyText.indexOf(role);
    if (roleIdx > -1) {
      const after = bodyText.slice(roleIdx + role.length).trim();
      const lines = after.split("\n").map(l => l.trim()).filter(l => l);
      for (const line of lines.slice(0, 6)) {
        if (line === company) continue;
        if (/remote|,\s*[A-Z]{2}|on-site|hybrid/i.test(line) || /[·•]/.test(line)) {
          location = line.split(/[·•]/)[0].trim();
          break;
        }
      }
    }
  }

  // Description: everything after "About the job", cut before noise sections
  let description = "";
  const aboutIdx = bodyText.indexOf("About the job");
  if (aboutIdx > -1) {
    const raw = bodyText.slice(aboutIdx + "About the job".length).trim();
    const cutoffs = ["Show less", "How you match", "About the company", "About the employer",
      "Job search faster with Premium", "Set alert for similar jobs", "Benefits found in job post"];
    let cutAt = raw.length;
    for (const c of cutoffs) {
      const idx = raw.indexOf(c);
      if (idx > 0 && idx < cutAt) cutAt = idx;
    }
    description = raw.slice(0, cutAt).trim();
  }

  return { role, company, location, description };
}

function scrapeIndeed() {
  const role =
    document.querySelector("h1.jobsearch-JobInfoHeader-title")?.innerText?.trim() ||
    document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']")?.innerText?.trim();

  const company =
    document.querySelector("[data-testid='inlineHeader-companyName'] a")?.innerText?.trim() ||
    document.querySelector("[data-testid='inlineHeader-companyName']")?.innerText?.trim() ||
    document.querySelector(".jobsearch-CompanyInfoWithoutHeaderImage a")?.innerText?.trim();

  const description =
    document.querySelector("#jobDescriptionText")?.innerText?.trim();

  return { role, company, description };
}

function scrapeGreenhouse() {
  const role =
    document.querySelector("h1.app-title")?.innerText?.trim() ||
    document.querySelector(".app-title")?.innerText?.trim();

  const company =
    document.querySelector(".company-name")?.innerText?.trim() ||
    document.querySelector("h2.company-name")?.innerText?.trim();

  const description =
    document.querySelector("#content")?.innerText?.trim() ||
    document.querySelector(".section-wrapper")?.innerText?.trim();

  return { role, company, description };
}

function scrapeLever() {
  const role =
    document.querySelector(".posting-headline h2")?.innerText?.trim() ||
    document.querySelector("h2.posting-headline")?.innerText?.trim();

  const company =
    document.querySelector(".main-header-text .large-category-label")?.innerText?.trim() ||
    document.title.split(" - ").pop()?.trim();

  const description =
    document.querySelector(".posting-description")?.innerText?.trim() ||
    document.querySelector(".section.page-centered")?.innerText?.trim();

  return { role, company, description };
}

function scrapeWorkday() {
  const role =
    document.querySelector("[data-automation-id='jobPostingHeader']")?.innerText?.trim();

  const company =
    document.querySelector("[data-automation-id='organisationLogo'] img")?.alt?.trim();

  const description =
    document.querySelector("[data-automation-id='jobPostingDescription']")?.innerText?.trim();

  return { role, company, description };
}

function scrapeAshby() {
  const role = document.querySelector("h1")?.innerText?.trim();
  const company = document.title.includes(" at ")
    ? document.title.split(" at ").slice(-1)[0]?.trim()
    : "";
  const description =
    document.querySelector(".ashby-job-posting-description")?.innerText?.trim() ||
    document.querySelector("[class*='description']")?.innerText?.trim();

  return { role, company, description };
}

function scrapeSimplify() {
  const role = document.querySelector("h1")?.innerText?.trim();

  // The first h2 is not always the company: job pages with a category subtitle
  // render it as an h2 above the company one (e.g. "Backend" before "Otter.ai").
  // The document title is always "Role @ Company | Simplify Jobs", so prefer the
  // h2 that matches it, then the title itself, then the first h2.
  const h2s = [...document.querySelectorAll("h2")]
    .map((h) => h.innerText?.trim())
    .filter(Boolean);
  const titleCompany = document.title.match(/@\s*([^|]+?)\s*\|/)?.[1]?.trim() || "";
  let company = h2s.find((t) => t === titleCompany) || titleCompany || h2s[0] || "";

  let description = "";
  let location = "";

  // __NEXT_DATA__ holds the jobPosting from the initial server render only.
  // Navigating between jobs client-side (search list, matches carousel) leaves
  // it pointing at the previously rendered job, so only trust it when its id
  // matches the job UUID in the current URL.
  const urlJobId = window.location.pathname.match(/\/p\/([0-9a-f-]{36})/i)?.[1];
  try {
    const raw = document.getElementById("__NEXT_DATA__")?.textContent;
    const nextData = JSON.parse(raw || "{}");
    const posting = nextData?.props?.pageProps?.jobPosting;
    if (posting && urlJobId && posting.id === urlJobId) {
      company = posting.job?.company?.name || company;
      const tmp = document.createElement("div");
      tmp.innerHTML = posting.description || "";
      description = tmp.innerText?.trim();
      const loc = posting.locations?.[0]?.value || "";
      location = loc.replace(/,\s*(USA|United States)$/, "").trim();
    }
  } catch (e) {}

  if (!description) {
    description =
      // Full job posting tab content (present in the DOM even while hidden)
      document.querySelector(".description")?.innerText?.trim() ||
      document.querySelector("[data-testid='job-description']")?.innerText?.trim() ||
      document.querySelector("[class*='JobDescription']")?.innerText?.trim() ||
      document.querySelector("[class*='job-description']")?.innerText?.trim() ||
      document.querySelector("article")?.innerText?.trim() ||
      "";
  }

  if (!location) {
    // The left panel renders the location as a bold <p> next to a map-pin icon,
    // e.g. "San Francisco, CA, USA" — take the first paragraph that looks like
    // "City, ST" (or "Remote") and strip the country suffix.
    for (const p of document.querySelectorAll("p")) {
      const text = (p.innerText || "").trim();
      if (/^Remote\b/i.test(text)) {
        location = "Remote";
        break;
      }
      const match = text.match(/^([A-Za-z][A-Za-z .'()-]*,\s*[A-Z]{2})(?![A-Za-z])/);
      if (match) {
        location = match[1];
        break;
      }
    }
  }

  return { role, company, location, description };
}

async function scrapeHandshake() {
  const url = window.location.href;
  const titleParts = document.title.split(" | ");

  // Use URL to determine page type — title is unreliable because it updates to
  // "Role | Company | Handshake" when a job is selected in search results, but
  // the DOM still has the search-page structure (no job-details-page hook).
  const isFullJobPage = /\/(jobs|postings)\/\d+/.test(new URL(url).pathname);

  let role, company;

  if (isFullJobPage) {
    role = titleParts[0]?.trim();
    company = titleParts[1]?.trim();
  } else {
    // Search page with job selected in the right panel
    const rightContent = document.querySelector("[data-hook='right-content']");
    role = rightContent?.querySelector("h1")?.innerText?.trim();

    // Company is always the first line of right-content; role appears after a category line
    const contentLines = rightContent?.innerText?.trim().split("\n").map(l => l.trim()).filter(Boolean) || [];
    company = contentLines[0] || "";
    if (company === role) company = contentLines[1] || "";

    // If the right panel h1 isn't found yet, fall back to title if it has job info
    if (!role && titleParts.length >= 3) {
      role = titleParts[0]?.trim();
      company = titleParts[1]?.trim();
    }
  }

  // Expand truncated description
  const moreBtn = Array.from(document.querySelectorAll("button"))
    .find((b) => b.innerText?.trim().startsWith("More"));
  if (moreBtn) {
    moreBtn.click();
    await new Promise((r) => setTimeout(r, 600));
  }

  // Full job page uses job-details-page; search page uses right-content
  const container =
    document.querySelector("[data-hook='job-details-page']") ||
    document.querySelector("[data-hook='right-content']");

  const allText = container?.innerText || "";
  const start = allText.indexOf("Job description");
  const cutoffs = [
    "What they're looking for", "What this job offers",
    "About the employer", "About the Employer",
    "Similar Jobs", "Similar jobs",
    "You match", "Matching is based", "Summary",
  ];
  let end = -1;
  for (const marker of cutoffs) {
    const idx = allText.indexOf(marker, start + 1);
    if (idx !== -1 && (end === -1 || idx < end)) end = idx;
  }
  let description = "";
  if (start !== -1) {
    description = allText.slice(start + "Job description".length, end !== -1 ? end : undefined).trim();
  }

  const locationMatch = allText.match(/(Remote|Hybrid|Onsite,\s*based in\s*[^\n]+)/);
  const location = locationMatch ? locationMatch[1].trim() : "";

  return { role, company, location, description };
}

async function scrape() {
  const url = window.location.href;
  let data = { role: "", company: "", description: "", url };

  if (url.includes("linkedin.com")) {
    Object.assign(data, await scrapeLinkedIn());
  } else if (url.includes("indeed.com")) {
    Object.assign(data, scrapeIndeed());
  } else if (url.includes("greenhouse.io")) {
    Object.assign(data, scrapeGreenhouse());
  } else if (url.includes("lever.co")) {
    Object.assign(data, scrapeLever());
  } else if (url.includes("myworkdayjobs.com")) {
    Object.assign(data, scrapeWorkday());
  } else if (url.includes("ashbyhq.com")) {
    Object.assign(data, scrapeAshby());
  } else if (url.includes("simplify.jobs")) {
    Object.assign(data, scrapeSimplify());
  } else if (url.includes("joinhandshake.com")) {
    Object.assign(data, await scrapeHandshake());
  }

  return data;
}

async function scrapeWithRetry() {
  const url = window.location.href;
  const isLinkedInSearch = url.includes("/jobs/search-results") || url.includes("/jobs/search/");
  const isHandshakeSearch = url.includes("joinhandshake.com") && !/\/(jobs|postings)\/\d+/.test(new URL(url).pathname);
  const isSearchPage = isLinkedInSearch || isHandshakeSearch;

  // Search pages render the job panel async — wait before first scrape
  if (isSearchPage) {
    await new Promise((r) => setTimeout(r, 1500));
  }

  const result = await scrape();
  // Retry if role/company are missing, OR if on a search page where the description
  // panel can load slower than the job card metadata
  if ((!result.role && !result.company) || (isSearchPage && !result.description)) {
    await new Promise((r) => setTimeout(r, 1500));
    return scrape();
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCRAPE_JOB") {
    scrapeWithRetry().then(sendResponse);
  }
  return true;
});
