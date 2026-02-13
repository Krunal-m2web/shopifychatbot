async function testChatApi() {
  const url = "http://localhost:5173/api/chat";
  const payload = {
    message: "hello",
    testMode: true,
    sessionId: "test-session-" + Date.now()
  };

  console.log(`Sending POST request to ${url}...`);
  console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const text = await response.text();
    
    console.log(`\nResponse Status: ${status}`);
    console.log(`Response Body:`);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(text);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testChatApi();
