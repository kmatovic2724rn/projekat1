const ITEMS_PER_PAGE = 10;
const SEARCH_API = "https://collectionapi.metmuseum.org/public/collection/v1.1/search";

document.addEventListener("DOMContentLoaded", loadArtworks);

async function loadArtworks() {
    const params = new URLSearchParams(window.location.search);

    const departmentId = params.get("departmentId");
    const departmentName = params.get("name");
    const query = params.get("q");
    const page = Math.max(1, Number(params.get("page")) || 1);

    const heading = document.getElementById("page-heading");
    const artworksContainer = document.getElementById("artworks");
    const resultsInfo = document.getElementById("results-info");
    const pagination = document.getElementById("pagination");

    if (!departmentId && !query) {
        heading.textContent = "Pretražite eksponate ili izaberite odeljenje";
        return;
    }

    // Ako postoji q prikazujemo pretragu, inače odeljenje
    if (query) {
        heading.textContent = `Rezultati pretrage: ${query}`;
        document.title = `Pretraga: ${query} - The Met`;
    } else {
        heading.textContent = departmentName || "Eksponati odeljenja";
        document.title = `${departmentName || "Odeljenje"} - The Met`;
    }

    try {
        // Met je 1. oktobra 2026. ukinuo /v1/search (vraća status 410).
        // Novi endpoint /v1.1/search sam deli rezultate na stranice (offset i limit).
        const searchParams = new URLSearchParams({
            hasImages: "true",
            limit: ITEMS_PER_PAGE,
            offset: (page - 1) * ITEMS_PER_PAGE
        });
        if (query) {
            searchParams.set("q", query);
        }
        if (departmentId) {
            searchParams.set("departmentId", departmentId);
        }

        const response = await fetchWithRetry(`${SEARCH_API}?${searchParams}`);
        if (!response.ok) {
            throw new Error(`Pretraga nije uspela (status ${response.status}).`);
        }

        const data = await response.json();
        const pageIds = data.objectIDs || [];

        if (pageIds.length === 0) {
            resultsInfo.textContent = "";
            artworksContainer.innerHTML = '<p class="col-12">Nema pronađenih eksponata.</p>';
            return;
        }

        // API dozvoljava samo prvih 10.000 rezultata (offset + limit <= 10000)
        const reachable = Math.min(data.total, 10000);
        const totalPages = Math.ceil(reachable / ITEMS_PER_PAGE);
        const currentPage = page;

        // Za svaki ID tražimo detalje eksponata
        const artworks = await loadObjects(pageIds);

        artworksContainer.innerHTML = "";
        artworks.forEach(artwork => {
            if (artwork) {
                artworksContainer.appendChild(createCard(artwork));
            }
        });

        resultsInfo.textContent = `Ukupno rezultata: ${data.total}`;
        createPagination(currentPage, totalPages, params);
    } catch (error) {
        console.error(error);
        artworksContainer.innerHTML =
            `<p class="col-12 text-danger">Greška pri učitavanju: ${error.message} <a href="" onclick="location.reload(); return false;">Pokušaj ponovo</a></p>`;
    }
}

// Detalje eksponata učitavamo po 5 odjednom da ne opteretimo API
async function loadObjects(ids) {
    const result = [];

    for (let i = 0; i < ids.length; i += 5) {
        const batch = ids.slice(i, i + 5);
        const loaded = await Promise.all(
            batch.map(async id => {
                try {
                    const response = await fetchWithRetry(`${API_BASE}/objects/${id}`);
                    return response.ok ? await response.json() : null;
                } catch (e) {
                    return null;
                }
            })
        );
        result.push(...loaded);
    }

    return result;
}

function createCard(artwork) {
    const column = document.createElement("div");
    column.className = "col";

    const link = document.createElement("a");
    link.href = `details.html?id=${artwork.objectID}`;
    link.className = "text-decoration-none text-reset";

    const card = document.createElement("div");
    card.className = "card h-100";

    if (artwork.primaryImageSmall) {
        const image = document.createElement("img");
        image.src = artwork.primaryImageSmall;
        image.alt = artwork.title || "Eksponat";
        image.className = "card-img-top";
        image.loading = "lazy";
        card.appendChild(image);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "card-img-top bg-secondary text-white d-flex align-items-center justify-content-center";
        placeholder.textContent = "Slika nije dostupna";
        card.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h5");
    title.className = "card-title";
    title.textContent = artwork.title || "Nepoznat naziv";

    const artist = document.createElement("p");
    artist.className = "card-text";
    artist.textContent = artwork.artistDisplayName || "Autor nije naveden";

    body.append(title, artist);
    card.appendChild(body);
    link.appendChild(card);
    column.appendChild(link);
    return column;
}

function createPagination(currentPage, totalPages, params) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }

    // Prikazujemo najviše pet brojeva stranica
    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);

    function addPage(label, pageNumber, disabled = false, active = false) {
        const li = document.createElement("li");
        li.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;

        const link = document.createElement("a");
        link.className = "page-link";
        link.textContent = label;

        const newParams = new URLSearchParams(params);
        newParams.set("page", pageNumber);
        link.href = `department.html?${newParams}`;

        li.appendChild(link);
        pagination.appendChild(li);
    }

    addPage("Prethodna", currentPage - 1, currentPage === 1);
    for (let i = startPage; i <= endPage; i++) {
        addPage(String(i), i, false, i === currentPage);
    }
    addPage("Sledeća", currentPage + 1, currentPage === totalPages);
}