const API_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Rezervna lista odeljenja, ako API privremeno ne odgovori
const FALLBACK_DEPARTMENTS = [
    { departmentId: 1, displayName: "American Decorative Arts" },
    { departmentId: 3, displayName: "Ancient Near Eastern Art" },
    { departmentId: 4, displayName: "Arms and Armor" },
    { departmentId: 5, displayName: "Arts of Africa, Oceania, and the Americas" },
    { departmentId: 6, displayName: "Asian Art" },
    { departmentId: 7, displayName: "The Cloisters" },
    { departmentId: 8, displayName: "The Costume Institute" },
    { departmentId: 9, displayName: "Drawings and Prints" },
    { departmentId: 10, displayName: "Egyptian Art" },
    { departmentId: 11, displayName: "European Paintings" },
    { departmentId: 12, displayName: "European Sculpture and Decorative Arts" },
    { departmentId: 13, displayName: "Greek and Roman Art" },
    { departmentId: 14, displayName: "Islamic Art" },
    { departmentId: 15, displayName: "The Robert Lehman Collection" },
    { departmentId: 16, displayName: "The Libraries" },
    { departmentId: 17, displayName: "Medieval Art" },
    { departmentId: 18, displayName: "Musical Instruments" },
    { departmentId: 19, displayName: "Photographs" },
    { departmentId: 21, displayName: "Modern Art" }
];

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// fetch koji ponovo pokušava kad API privremeno ne odgovori
// (mrežna greška, 403, 429 ili 5xx). Za ostale statuse (npr. 404, 410) odmah vraća odgovor.
async function fetchWithRetry(url, tries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            const response = await fetch(url);
            const retryable = response.status === 403 || response.status === 429 || response.status >= 500;

            if (!retryable || attempt === tries) {
                return response;
            }
        } catch (error) {
            lastError = error;
            if (attempt === tries) {
                throw error;
            }
        }

        await wait(500 * attempt);
    }

    throw lastError;
}

function renderDepartments(departments) {
    const menu = document.getElementById("departments-menu");
    menu.innerHTML = "";

    departments.forEach(department => {
        const params = new URLSearchParams({
            departmentId: department.departmentId,
            name: department.displayName
        });

        const li = document.createElement("li");
        const link = document.createElement("a");
        link.className = "dropdown-item";
        link.href = `department.html?${params}`;
        link.textContent = department.displayName;

        li.appendChild(link);
        menu.appendChild(li);
    });
}

// Učitava listu odeljenja u padajući meni (isto na svim stranicama)
async function loadDepartments() {
    if (!document.getElementById("departments-menu")) {
        return;
    }

    // Lista odeljenja se retko menja, pa je čuvamo u sessionStorage
    try {
        const cached = sessionStorage.getItem("departments");
        if (cached) {
            renderDepartments(JSON.parse(cached));
            return;
        }
    } catch (e) {
        // ako sessionStorage nije dostupan, samo nastavljamo
    }

    try {
        const response = await fetchWithRetry(`${API_BASE}/departments`);
        if (!response.ok) {
            throw new Error("Odeljenja nisu učitana.");
        }

        const data = await response.json();
        renderDepartments(data.departments);

        try {
            sessionStorage.setItem("departments", JSON.stringify(data.departments));
        } catch (e) {}
    } catch (error) {
        console.error(error);
        renderDepartments(FALLBACK_DEPARTMENTS);
    }
}

document.addEventListener("DOMContentLoaded", loadDepartments);