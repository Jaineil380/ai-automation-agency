const supabase = supabase.createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY"
);

async function loadLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Error loading leads");
    return;
  }

  const tbody = document.getElementById("leads");
  tbody.innerHTML = "";

  data.forEach(lead => {
    tbody.innerHTML += `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.email}</td>
        <td>${lead.message}</td>
        <td>${lead.qualification}</td>
        <td>${lead.ai_reply}</td>
        <td>${new Date(lead.created_at).toLocaleString()}</td>
      </tr>
    `;
  });
}

loadLeads();
