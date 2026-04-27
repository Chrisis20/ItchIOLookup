// The URL to your specific Cloudflare Worker
const proxyUrl = "https://itchiolookup.crismicuentadenuevo.workers.dev";

let currentPage = 1;
let isFetching = false;
let endOfResults = false;

async function performSearch(isLoadMore = false) {
    if (isFetching || (isLoadMore && endOfResults)) return;

    const searchType = document.getElementById("searchType").value;
    const searchValue = document.getElementById("searchInput").value.trim();
    const isFreeOnly = document.getElementById("freeOnlyCheck").checked;
    const resultsDiv = document.getElementById("results");
    const loadingMoreDiv = document.getElementById("loadingMore");
    
    if (!isLoadMore) {
        currentPage = 1;
        endOfResults = false;
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
            if (!isLoadMore) resultsDiv.innerHTML = `<p style="color:#fa5c5c;">Proxy Error: Status ${response.status}.</p>`;
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
            
            // SMARTER FREE DETECTION: We look for numbers or currency symbols
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
                displayedCount++;
                const title = titleElement.innerText;
                const url = linkElement.href;
                
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

        // SMART AUTO-LOAD
        if (displayedCount === 0 && !endOfResults) {
            currentPage++;
            isFetching = false;
            performSearch(true);
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