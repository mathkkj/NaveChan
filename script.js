import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://prffblgjpmyhspazhhvr.supabase.co",
  "sb_publishable_2dPZBezbL79SlLaDJIkKtA_HNI6AIIW"
);

async function carregarPosts() {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const div = document.getElementById("posts");
  div.innerHTML = "";

  data.forEach((post) => {
    const el = document.createElement("div");
    el.className = "post";
    
    const data = new Date(post.created_at);
    const dataFormatada = data.toLocaleString("pt-BR");
    el.textContent = `${post.conteudo} (${dataFormatada})`;
        

    div.appendChild(el);
    
  });
}

async function enviarPost() {
  const input = document.getElementById("input");
  const texto = input.value.trim();

  if (!texto) return;

  await supabase.from("posts").insert([{ conteudo: texto }]);

  input.value = "";
  carregarPosts();
}

document.getElementById("btnPostar").addEventListener("click", enviarPost);
window.addEventListener("DOMContentLoaded", carregarPosts);