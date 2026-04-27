// The URL to your specific Cloudflare Worker
const proxyUrl = "https://itchiolookup.crismicuentadenuevo.workers.dev";

async function performSearch() {
    const searchType = document.getElementById("searchType").value;
    const searchValue = document.getElementById("searchInput").value.trim();
    const isFreeOnly = document.getElementById("freeOnlyCheck").checked;
    const resultsDiv = document.getElementById("results");
    
    if (!searchValue) {
        resultsDiv.innerHTML = "<div class='loading-text'>Loading Top Assets...</div>";
    } else {
        resultsDiv.innerHTML = "<div class='loading-text'>Searching Itch.io...</div>";
    }
    
    resultsDiv.style.display = "block"; 

    try {
        // Pass the isFree parameter to the worker
        const response = await fetch(`${proxyUrl}?type=${searchType}&value=${encodeURIComponent(searchValue)}&isFree=${isFreeOnly}`);
        
        if (!response.ok) {
            resultsDiv.innerHTML = `<p style="color:#fa5c5c;">Proxy Error: The server returned status ${response.status}.</p>`;
            return;
        }

        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const assetCards = doc.querySelectorAll(".game_cell");
        
        resultsDiv.innerHTML = ""; 
        resultsDiv.style.display = "grid"; 

        if (assetCards.length === 0) {
            resultsDiv.innerHTML = `<p>No assets found. Try something else.</p>`;
            resultsDiv.style.display = "block";
            return;
        }

        let displayedCount = 0;

        assetCards.forEach(card => {
            const titleElement = card.querySelector(".title");
            const linkElement = card.querySelector("a"); 
            const imageElement = card.querySelector(".game_thumb img");
            
            // Check if the asset is paid by looking for Itch.io's price tag element
            const priceElement = card.querySelector(".price_value");
            const isFree = priceElement === null; // If there is no price tag, it is free

            // ULTIMATE GATEKEEPER: If user wants ONLY free games, and this one is paid, skip it entirely
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

                // Generate the badge based on if it's free or paid
                let badgeHtml = "";
                if (isFree) {
                    badgeHtml = `<div class="badge free-badge">FREE</div>`;
                } else if (!isFreeOnly && priceElement) {
                    // If they want to see all assets, we show the actual price on the paid ones
                    badgeHtml = `<div class="badge paid-badge">${priceElement.innerText}</div>`;
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

        // If the frontend filtered out everything, let the user know
        if (displayedCount === 0) {
            resultsDiv.innerHTML = `<p>No free assets found for that search. Try unchecking "Free Only" or searching something else.</p>`;
            resultsDiv.style.display = "block";
        }

    } catch (error) {
        resultsDiv.innerHTML = "<p>Critical Error fetching assets. Check the console.</p>";
        resultsDiv.style.display = "block";
        console.error("Search failed:", error);
    }
}

// Allow pressing "Enter" in the search box
document.getElementById("searchInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") performSearch();
});

// Automatically load the assets as soon as the page opens
window.onload = () => {
    performSearch();
};