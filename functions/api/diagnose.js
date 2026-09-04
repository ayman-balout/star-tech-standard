/*
  Star Tech Standard Ltd — Generator DoctorAI
  Secure Gemini proxy (Cloudflare Pages Function)

  This file runs on Cloudflare's servers, NOT in the visitor's browser.
  Your Gemini API key is read from an environment variable you set in
  the Cloudflare dashboard (Settings > Environment variables), so it
  never appears in any file, and never reaches the public website.

  This automatically becomes a live endpoint at:
    https://yoursite.pages.dev/api/diagnose
  (or https://startechstandard.com/api/diagnose once your domain is
  connected to Cloudflare Pages)
*/

const GEMINI_MODEL = "gemini-3.5-flash";

export async function onRequestPost(context) {

  try {

    const { request, env } = context;

    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server is missing GEMINI_API_KEY. Add it in Cloudflare Pages > Settings > Environment variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const report = body.report;

    if (!report) {
      return new Response(
        JSON.stringify({ error: "No report data received." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt =
      "You are an expert diesel generator technician assisting a generator sales, repair and fuel-systems company " +
      "(Star Tech Standard Ltd, servicing Perkins, Cummins and Caterpillar generators). " +
      "A customer submitted the following case through a diagnostic tool. " +
      "Give a deeper technical analysis than a basic checklist: reason about how the symptoms relate to each other, " +
      "rank the most likely root cause first, explain WHY, and give a clear step-by-step troubleshooting order a field technician should follow. " +
      "Keep it practical and specific to diesel generators. Keep the whole answer under 250 words. " +
      "Do not use markdown formatting like asterisks or hash symbols, just plain text with line breaks.\n\n" +
      "Brand: " + (report.equipment?.brand || "not specified") + "\n" +
      "Model: " + (report.equipment?.model || "not specified") + "\n" +
      "Capacity: " + (report.equipment?.kva || "not specified") + " kVA\n" +
      "Controller: " + (report.equipment?.controller || "not specified") + "\n" +
      "Running hours: " + (report.equipment?.hours || "not specified") + "\n" +
      "Voltage: " + (report.equipment?.voltage || "not specified") + "\n" +
      "Frequency: " + (report.equipment?.frequency || "not specified") + "\n" +
      "Main problem selected: " + (report.problem || "not specified") + "\n" +
      "Customer's description of symptoms: " + (report.symptoms || "none provided");

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: "Gemini request failed: " + geminiResponse.status + " " + errText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await geminiResponse.json();

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text: aiText }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({ error: "Server error: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

  }

}
