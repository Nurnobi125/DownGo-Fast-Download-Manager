(() => {
  const form = document.getElementById("supportTicketForm");
  if (!form) return;
  const submit = document.getElementById("ticketSubmit");
  const status = document.getElementById("ticketStatus");
  const supabase = window.downGoSupabase;

  if (!supabase) {
    submit.disabled = true;
    status.textContent = "The support form is not available yet. Please check back later.";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    if (String(fields.get("website") || "").trim()) return;
    submit.disabled = true;
    status.textContent = "Sending your ticket…";
    const ticket = {
      name: String(fields.get("name")).trim(),
      email: String(fields.get("email")).trim(),
      category: String(fields.get("category")),
      subject: String(fields.get("subject")).trim(),
      message: String(fields.get("message")).trim()
    };
    try {
      const { error } = await supabase.from("tickets").insert(ticket);
      if (error) throw error;
      form.reset();
      status.textContent = "Your support ticket was sent. Keep an eye on your email for a response.";
    } catch (error) {
      console.error("Support ticket submission failed", error);
      status.textContent = "We couldn't send your ticket. Please try again later or use the Help Center.";
    } finally {
      submit.disabled = false;
    }
  });
})();
