// The URL to your specific Cloudflare Worker
const proxyUrl = "https://itchiolookup.crismicuentadenuevo.workers.dev";

async function performSearch() {
    const searchType = document.getElementById("searchType").value;
    const searchValue = document.getElementById("searchInput").value.trim();
    const resultsDiv = document.getElementById("results");
    
    if (!searchValue) {
        resultsDiv.innerHTML = "<div class='loading-text'>Loading Top Free Assets...</div>";
    } else {
        resultsDiv.innerHTML = "<div class='loading-text'>Searching Itch.io...</div>";
    }
    
    resultsDiv.style.display = "block"; 

    try {
        // We now send the TYPE (name or tag) and the VALUE to the worker
        const response = await fetch(`${proxyUrl}?type=${searchType}&value=${encodeURIComponent(searchValue)}`);
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const assetCards = doc.querySelectorAll(".game_cell");
        
        resultsDiv.innerHTML = ""; 
        resultsDiv.style.display = "grid"; 

        if (assetCards.length === 0) {
            resultsDiv.innerHTML = `<p>No free assets found for that ${searchType}. Try something else.</p>`;
            resultsDiv.style.display = "block";
            return;
        }

        assetCards.forEach(card => {
            const titleElement = card.querySelector(".title");
            const linkElement = card.querySelector("a"); 
            const imageElement = card.querySelector(".game_thumb img");

            if (titleElement && linkElement) {
                const title = titleElement.innerText;
                const url = linkElement.href;
                
                let imageUrl = "";
                if (imageElement) {
                    imageUrl = imageElement.getAttribute("data-lazy_src") || imageElement.getAttribute("src") || "";
                }

                resultsDiv.innerHTML += `
                    <a href="${url}" target="_blank" class="card">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${title}">` : `<div style="height: 160px; display: flex; align-items: center; justify-content: center; background: #2a2a2a; color: #777;">No Image</div>`}
                        <div class="card-info">
                            <h3>${title}</h3>
                        </div>
                    </a>
                `;
            }
        });
    } catch (error) {
        resultsDiv.innerHTML = "<p>Error fetching assets. Check if your Cloudflare Worker is deployed properly.</p>";
        resultsDiv.style.display = "block";
        console.error("Search failed:", error);
    }
}

// Allow pressing "Enter" in the search box
document.getElementById("searchInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") performSearch();
});

// Automatically load the top assets as soon as the page opens
window.onload = () => {
    performSearch();
};