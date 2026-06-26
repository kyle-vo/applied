function scrapeLinkedInSearchResults() {
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
          const lines = text.split("\n").map(l => l.trim()).filter(l => l && l !== role);
          // Company is the first non-title, non-metadata line (short, no "·" or numbers)
          company = lines.find(l => l.length > 1 && l.length < 60 && !l.includes("·") && !/^\d/.test(l)) || "";
          // Location is the next line after company
          const compIdx = lines.indexOf(company);
          location = compIdx > -1 ? (lines[compIdx + 1] || "") : "";
          break;
        }
        container = container?.parentElement;
      }
    }
  }

  // Description is not available on search results pages — right panel doesn't render in DOM
  return { role, company, location, description: "" };
}

function scrapeLinkedIn() {
  const isSearchResults = window.location.href.includes("/jobs/search-results") ||
    window.location.href.includes("/jobs/search/");
  if (isSearchResults) return scrapeLinkedInSearchResults();

  const role =
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.innerText?.trim() ||
    document.querySelector(".jobs-unified-top-card__job-title h1")?.innerText?.trim() ||
    document.querySelector("h1.t-24")?.innerText?.trim() ||
    document.querySelector("h1.jobs-unified-top-card__job-title")?.innerText?.trim();

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.innerText?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name a")?.innerText?.trim() ||
    document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name")?.innerText?.trim();

  // Prefer narrow selectors that skip LinkedIn's "How you match" / profile sections
  let description =
    document.querySelector(".jobs-description__content .jobs-box__html-content")?.innerText?.trim() ||
    document.querySelector(".jobs-description-content__text")?.innerText?.trim();

  if (!description) {
    const raw = document.querySelector("#job-details")?.innerText?.trim() || "";
    const cutoffs = ["Show less", "How you match", "What they're looking for", "About the company", "About the employer"];
    let cutAt = raw.length;
    for (const cutoff of cutoffs) {
      const idx = raw.indexOf(cutoff);
      if (idx > 0 && idx < cutAt) cutAt = idx;
    }
    description = raw.slice(0, cutAt).trim();
  }

  return { role, company, description };
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
  const company = document.querySelector("h2")?.innerText?.trim();

  let description = "";
  let location = "";

  // __NEXT_DATA__ only has jobPosting on the initial server render of a job page.
  // Client-side navigation from the search list leaves it stale, so fall back to DOM.
  try {
    const raw = document.getElementById("__NEXT_DATA__")?.textContent;
    const nextData = JSON.parse(raw || "{}");
    const posting = nextData?.props?.pageProps?.jobPosting;
    if (posting) {
      const tmp = document.createElement("div");
      tmp.innerHTML = posting.description || "";
      description = tmp.innerText?.trim();
      const loc = posting.locations?.[0]?.value || "";
      location = loc.replace(/,\s*(USA|United States)$/, "").trim();
    }
  } catch (e) {}

  if (!description) {
    description =
      document.querySelector("[data-testid='job-description']")?.innerText?.trim() ||
      document.querySelector("[class*='JobDescription']")?.innerText?.trim() ||
      document.querySelector("[class*='job-description']")?.innerText?.trim() ||
      document.querySelector("article")?.innerText?.trim() ||
      "";
  }

  return { role, company, location, description };
}

async function scrapeHandshake() {
  const url = window.location.href;
  const titleParts = document.title.split(" | ");
  // Full job page: title is "Role | Company | Handshake" (3 parts)
  // Search page:   title is "Jobs | Handshake" (2 parts — no job info in title)
  const titleHasJobInfo = titleParts.length >= 3;

  let role, company;

  if (titleHasJobInfo) {
    role = titleParts[0]?.trim();
    company = titleParts[1]?.trim();
  } else {
    // Search page: the right panel has data-hook="right-content"
    // First line of right-content is the company name; h1 inside it is the job title
    const rightContent = document.querySelector("[data-hook='right-content']");
    role = rightContent?.querySelector("h1")?.innerText?.trim();
    company = rightContent?.innerText?.trim().split("\n")[0]?.trim();

    // Fallback: pull from the selected job card using the job ID in the URL
    if (!company) {
      const jobIdMatch = url.match(/\/job-search\/(\d+)/);
      if (jobIdMatch) {
        const card = document.querySelector(`[data-hook='job-result-card | ${jobIdMatch[1]}']`);
        company = card?.innerText?.trim().split("\n")[0]?.trim();
      }
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
    Object.assign(data, scrapeLinkedIn());
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
  // Search results pages render the job panel async — wait longer before first scrape
  const isSearchResults = window.location.href.includes("/jobs/search-results") ||
    window.location.href.includes("/jobs/search/");
  if (isSearchResults) {
    await new Promise((r) => setTimeout(r, 1200));
  }

  const result = await scrape();
  // Retry once more if still empty (panel may still be loading)
  if (!result.role && !result.company) {
    await new Promise((r) => setTimeout(r, 1000));
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
