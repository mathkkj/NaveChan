import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";



const supabase = createClient(
  "https://prffblgjpmyhspazhhvr.supabase.co",
  "sb_publishable_2dPZBezbL79SlLaDJIkKtA_HNI6AIIW"
);

supabase
  .channel("posts")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "posts"
    },
    () => {
      carregarPosts();
    }
  )
  .subscribe();

async function carregarPosts() {
  const { data } = await supabase //lembrar de colocar o await supabase toda hora antes de carregar algo
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false }); 
    (payload) => {window.location.reload()}

  const div = document.getElementById("posts");
  div.innerHTML = "";

  // aqui q coloca os post com foreach
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




  if (!texto) return; //pra nao bugar caso n tenha texto

  await supabase.from("posts").insert([{ conteudo: texto }]); //esperar o supabase carregar

  input.value = "";
  carregarPosts();
}

document.getElementById("btnPostar").addEventListener("click", enviarPost);
window.addEventListener("DOMContentLoaded", carregarPosts);



let count = 0
setInterval(function() {
    count = count + 1

    if(count === 600){
        window.location.reload()
    }
        
}, 1000)
