
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    "https://prffblgjpmyhspazhhvr.supabase.co",
    "sb_publishable_2dPZBezbL79SlLaDJIkKtA_HNI6AIIW"
);

const divPosts = document.getElementById("posts");
const input = document.getElementById("input");
const btnPostar = document.getElementById("btnPostar");

let carregamentoInicial = true;
let postsPendentes = [];

// cria o elemento visual de uma postagem
function criarPost(post) {
    const el = document.createElement("div");

    el.className = "post";

    if (post.id !== undefined && post.id !== null) {
        el.dataset.postId = String(post.id);
    }

    const dataPost = post.created_at
        ? new Date(post.created_at).toLocaleString("pt-BR")
        : "data desconhecida";

    el.textContent = `${post.conteudo} (${dataPost})`;

    return el;
}

// adiciona uma postagem no topo sem duplicar
function adicionarPost(post) {

    if (post.id !== undefined && post.id !== null) {

        const duplicado = Array.from(divPosts.children).some(
            (el) => el.dataset.postId === String(post.id)
        );

        if (duplicado) return;
    }

    divPosts.prepend(criarPost(post));
}

// carrega todas as postagens do banco
async function carregarPosts() {

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar postagens:", error);
        return;
    }

    const fragmento = document.createDocumentFragment();

    data.forEach((post) => {
        fragmento.appendChild(criarPost(post));
    });

    divPosts.replaceChildren(fragmento);
}

// recebe novas postagens em tempo real
supabase
    .channel("posts-em-tempo-real")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "posts"
        },
        (payload) => {

            const novoPost = payload.new;

            // guarda eventos recebidos durante o carregamento inicial
            if (carregamentoInicial) {
                postsPendentes.push(novoPost);
                return;
            }

            adicionarPost(novoPost);

        }
    )
    .subscribe((status) => {

        console.log("Status do Realtime:", status);

        if (status === "SUBSCRIBED") {
            console.log("Conectado ao Realtime!");
        }

    });

// envia uma nova postagem
async function enviarPost() {

    const texto = input.value.trim();

    if (!texto) return;

    btnPostar.disabled = true;

    const { error } = await supabase
        .from("posts")
        .insert([
            {
                conteudo: texto
            }
        ]);

    if (error) {

        console.error("Erro ao enviar postagem:", error);
        alert("Não foi possível enviar sua postagem.");

        btnPostar.disabled = false;
        return;
    }

    input.value = "";

    // atualiza imediatamente a lista de quem publicou
    await carregarPosts();

    btnPostar.disabled = false;
}

// inicializacao
async function iniciar() {

    await carregarPosts();

    carregamentoInicial = false;

    // processa os eventos recebidos durante o carregamento
    postsPendentes.sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
    });

    postsPendentes.forEach((post) => {
        adicionarPost(post);
    });

    postsPendentes = [];
}

btnPostar.addEventListener("click", enviarPost);

iniciar();
