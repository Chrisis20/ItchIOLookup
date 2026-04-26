// REPLACE THIS with your actual Cloudflare Worker URL
const proxyUrl = "https://itchiolookup.crismicuentadenuevo.workers.dev";

async function performSearch() {
    const searchTerm = document.getElementById("searchInput").value;
    const tag = document.getElementById("tagInput").value;
    const resultsDiv = document.getElementById("results");
    
    resultsDiv.innerHTML = "Searching...";

    try {
        // Send request to your Cloudflare Worker
        const response = await fetch(`${proxyUrl}?q=${searchTerm}&tag=${tag}`);
        const htmlText = await response.text();

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const assetCards = doc.querySelectorAll(".game_cell");
        
        resultsDiv.innerHTML = ""; // Clear the "Searching..." text

        if (assetCards.length === 0) {
            resultsDiv.innerHTML = "<p>No free assets found for that search.</p>";
            return;
        }

        // Loop through the results and build the UI
        assetCards.forEach(card => {
            const titleElement = card.querySelector(".title");
            const linkElement = card.querySelector(".title a");
            const imageElement = card.querySelector(".game_thumb img");

            if (titleElement && linkElement) {
                const title = titleElement.innerText;
                const url = linkElement.href;
                const imageUrl = imageElement ? (imageElement.getAttribute("data-lazy_src") || imageElement.src) : "";

                resultsDiv.innerHTML += `
                    <div class="card">
                        <h3><a href="${url}" target="_blank">${title}</a></h3>
                        ${imageUrl ? `<img src="${imageUrl}" alt="${title}">` : ""}
                    </div>
                `;
            }
        });
    } catch (error) {
        resultsDiv.innerHTML = "<p>Error fetching assets. Check the console.</p>";
        console.error("Search failed:", error);
    }
}