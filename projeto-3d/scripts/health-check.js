const url = "http://127.0.0.1:5173/";

async function checkSite() {
  try {
    const response = await fetch(url);

    console.log("JARV HEALTH CHECK (VITE SERVER)");
    console.log("--------------------------------");
    console.log(`URL: ${url}`);
    console.log(`STATUS: ${response.status}`);

    if (!response.ok) {
      console.error("FAIL: site retornou erro HTTP.");
      process.exitCode = 1;
      return;
    }

    console.log("PASS: J.A.R.V.I.S. Core está online e respondendo.");
  } catch (error) {
    console.error("FAIL: não foi possível acessar o J.A.R.V.I.S. Core.");
    console.error(error.message);

    process.exitCode = 1;
  }
}

checkSite();
