
import "dotenv/config";

async function testChat() {
  try {
    const response = await fetch("http://localhost:5173/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I need headphones",
        testMode: true 
      }),
    });

    const status = response.status;
    const text = await response.text();

    console.log(`Status: ${status}`);
    console.log("Body:", text);

  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testChat();
