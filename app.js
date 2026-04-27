// Keep your specific Cloudflare Worker URL
const proxyUrl = "https://itchiolookup.crismicuentadenuevo.workers.dev";

let currentPage = 1;
let isFetching = false;
let endOfResults = false;
let displayedUrls = new Set();
let displayedTitles = new Set();

async function performSearch(isLoadMore = false) {
    if (isFetching || (isLoadMore && endOfResults)) return;

    // Fixed search type: only name search is supported now
    const searchType = "name";
    const searchValue = document.getElementById("searchInput").value.trim();
    const isFreeOnly = document.getElementById("freeOnlyCheck").checked;
    const resultsDiv = document.getElementById("results");
    const loadingMoreDiv = document.getElementById("loadingMore");
    
    if (!isLoadMore) {
        currentPage = 1;
        endOfResults = false;
        displayedUrls.clear();
        displayedTitles.clear();
        resultsDiv.innerHTML = "";
        resultsDiv.style.display = "block";
        resultsDiv.innerHTML = `<div class='loading-text'>${searchValue ? 'Searching Itch.io...' : 'Loading Top Assets...'}</div>`;
    } else {
        loadingMoreDiv.style.display = "block";
    }

    isFetching = true;

    try {
        const response = await fetch(`${proxyUrl}?type=${searchType}&value=${encodeURIComponent(searchValue)}&isFree=${isFreeOnly}&page=${currentPage}`);
        
        if (!response.ok) {
            if (!isLoadMore) resultsDiv.innerHTML = `<p style="color:#fa5c5c;">Proxy Error: Status ${response.status}. Itch.io may be blocking the request.</p>`;
            isFetching = false;
            loadingMoreDiv.style.display = "none";
            return;
        }

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const assetCards = doc.querySelectorAll(".game_cell");
        
        if (!isLoadMore) {
            resultsDiv.innerHTML = ""; 
            resultsDiv.style.display = "grid"; 
        }

        if (assetCards.length === 0) {
            endOfResults = true;
            if (!isLoadMore) {
                resultsDiv.innerHTML = `<p>No assets found. Try something else.</p>`;
                resultsDiv.style.display = "block";
            }
            loadingMoreDiv.style.display = "none";
            isFetching = false;
            return;
        }

        let displayedCount = 0;

        assetCards.forEach(card => {
            const titleElement = card.querySelector(".title");
            const linkElement = card.querySelector("a"); 
            const imageElement = card.querySelector(".game_thumb img");
            
            const priceElement = card.querySelector(".price_value");
            let isFree = true;
            let priceText = "";

            if (priceElement) {
                priceText = priceElement.innerText.trim();
                if (priceText.match(/[\$\€\£\¥\d]/)) {
                    isFree = false;
                }
            }

            if (isFreeOnly && !isFree) {
                return; 
            }

            if (titleElement && linkElement) {
                const title = titleElement.innerText;
                const url = linkElement.href;
                
                if (displayedUrls.has(url) || displayedTitles.has(title)) {
                    return; // Skip duplicate
                }
                displayedUrls.add(url);
                displayedTitles.add(title);
                
                let imageUrl = "";
                if (imageElement) {
                    imageUrl = imageElement.getAttribute("data-lazy_src") || imageElement.getAttribute("src") || "";
                }

                let badgeHtml = "";
                if (isFree) {
                    badgeHtml = `<div class="badge free-badge">FREE</div>`;
                } else if (!isFreeOnly && priceText) {
                    badgeHtml = `<div class="badge paid-badge">${priceText}</div>`;
                }

                displayedCount++;
                resultsDiv.innerHTML += `
                    <a href="${url}" target="_blank" class="card">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${title}">` : `<div style="height: 160px; display: flex; align-items: center; justify-content: center; background: #2a2a2a; color: #777;">No Image</div>`}
                        <div class="card-info">
                            <h3>${title}</h3>
                        </div>
                        ${badgeHtml}
                    </a>
                `;
            }
        });

        if (displayedCount === 0) {
            if (isLoadMore) {
                endOfResults = true;
                loadingMoreDiv.style.display = "none";
                isFetching = false;
                return;
            }

            // THE SAFETY BRAKE: If the first page had 0 visible assets (for example, free-only filtering)
            // we allow one more page load before stopping.
            currentPage++;
            setTimeout(() => {
                isFetching = false;
                performSearch(true);
            }, 500);
            return;
        }

        currentPage++;
        loadingMoreDiv.style.display = "none";

    } catch (error) {
        if (!isLoadMore) {
            resultsDiv.innerHTML = "<p>Critical Error fetching assets. Check the console.</p>";
            resultsDiv.style.display = "block";
        }
        console.error("Search failed:", error);
        loadingMoreDiv.style.display = "none";
    }

    isFetching = false;
}

document.getElementById("searchInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") performSearch();
});

window.onload = () => {
    performSearch();
};

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        performSearch(true);
    }
});