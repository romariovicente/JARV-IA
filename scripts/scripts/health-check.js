const SITE_URL =
    process.env.JARV_SITE_URL ||
    "http://127.0.0.1:5500/";

async function checkSite() {
    console.log("================================");
    console.log("JARV I.A. HEALTH CHECK");
    console.log("================================");
    console.log(`Target: ${SITE_URL}`);

    try {
        const response = await fetch(SITE_URL);

        console.log(`HTTP Status: ${response.status}`);

        if (!response.ok) {
            console.error("STATUS: FAIL");
            console.error("Cause: HTTP response is not successful.");
            process.exitCode = 1;
            return;
        }

        const body = await response.text();

        if (!body.includes("JARV")) {
            console.error("STATUS: FAIL");
            console.error("Cause: expected JARV content was not found.");
            process.exitCode = 1;
            return;
        }

        console.log("STATUS: PASS");
        console.log("JARV site is responding correctly.");

    } catch (error) {
        console.error("STATUS: FAIL");
        console.error(`Cause: ${error.message}`);
        process.exitCode = 1;
    }
}

checkSite();
