document.addEventListener("DOMContentLoaded", loadDetails);

async function loadDetails() {
    const id = new URLSearchParams(window.location.search).get("id");
    const status = document.getElementById("status");

    if (!id) {
        status.textContent = "Eksponat nije izabran.";
        return;
    }

    try {
        const response = await fetchWithRetry(`${API_BASE}/objects/${id}`);
        if (!response.ok) {
            throw new Error("Eksponat nije pronađen.");
        }

        const artwork = await response.json();

        const imageUrl = artwork.primaryImage || artwork.primaryImageSmall;
        const image = document.getElementById("artwork-image");
        if (imageUrl) {
            image.src = imageUrl;
            image.alt = artwork.title || "Eksponat";
        } else {
            image.hidden = true;
        }

        document.getElementById("artwork-title").textContent = artwork.title || "Nepoznat naziv";
        document.title = `${artwork.title || "Eksponat"} - The Met`;

        const fields = [
            ["Autor", artwork.artistDisplayName],
            ["Datum", artwork.objectDate],
            ["Odeljenje", artwork.department],
            ["Klasifikacija", artwork.classification],
            ["Medijum", artwork.medium],
            ["Dimenzije", artwork.dimensions],
            ["Kultura", artwork.culture],
            ["Period", artwork.period],
            ["Zemlja", artwork.country],
            ["Poreklo", artwork.creditLine]
        ];

        const info = document.getElementById("artwork-info");
        fields.forEach(([label, value]) => {
            if (!value) {
                return;
            }
            const dt = document.createElement("dt");
            dt.className = "col-sm-4";
            dt.textContent = label;

            const dd = document.createElement("dd");
            dd.className = "col-sm-8";
            dd.textContent = value;

            info.append(dt, dd);
        });

        if (artwork.objectURL) {
            const link = document.getElementById("artwork-link");
            link.href = artwork.objectURL;
            link.hidden = false;
        }

        status.hidden = true;
        document.getElementById("artwork").hidden = false;
    } catch (error) {
        console.error(error);
        status.textContent = "Došlo je do greške pri učitavanju eksponata.";
    }
}