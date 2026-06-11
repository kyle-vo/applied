function scrapeLinkedIn() {
  const role =
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.innerText?.trim() ||
    document.querySelector("h1.t-24")?.innerText?.trim() ||
    document.querySelector(".jobs-unified-top-card__job-title h1")?.innerText?.trim();

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.innerText?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name a")?.innerText?.trim();

  const description =
    document.querySelector(".jobs-description__content .jobs-box__html-content")?.innerText?.trim() ||
    document.querySelector("#job-details")?.innerText?.trim() ||
    document.querySelector(".jobs-description-content__text")?.innerText?.trim();

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
  const role =
    document.querySelector("h1")?.innerText?.trim() ||
    document.querySelector("[class*='job-title']")?.innerText?.trim();

  const company =
    document.querySelector("[class*='company-name']")?.innerText?.trim() ||
    document.querySelector("[class*='employer']")?.innerText?.trim() ||
    document.querySelector("h2")?.innerText?.trim();

  const description =
    document.querySelector("[class*='job-description']")?.innerText?.trim() ||
    document.querySelector("[class*='description']")?.innerText?.trim() ||
    document.querySelector("main")?.innerText?.trim();

  return { role, company, description };
}

function scrapeHandshake() {
  const role =
    document.querySelector("h1[class*='job']")?.innerText?.trim() ||
    document.querySelector("[data-hook='job-name']")?.innerText?.trim() ||
    document.querySelector("h1")?.innerText?.trim();

  const company =
    document.querySelector("[data-hook='employer-name']")?.innerText?.trim() ||
    document.querySelector("[class*='employer-name']")?.innerText?.trim() ||
    document.querySelector("[class*='company']")?.innerText?.trim();

  const description =
    document.querySelector("[data-hook='job-description']")?.innerText?.trim() ||
    document.querySelector("[class*='job-description']")?.innerText?.trim() ||
    document.querySelector("[class*='description']")?.innerText?.trim();

  return { role, company, description };
}

function scrape() {
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
    Object.assign(data, scrapeHandshake());
  }

  return data;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCRAPE_JOB") {
    sendResponse(scrape());
  }
  return true;
});
