// Variáveis globais e cache
let offset = 0;
const limit = 20;
const pokemonCache = {}; // Cache dos detalhes dos pokémons já carregados
const lottieUrl = "https://lottie.host/ae299451-7ddf-4ef6-991e-c32b9a8ce196/d2D3mIUkmk.lottie";
let allPokemonList = []; // Lista de todos os pokémons (nome e id) para busca rápida
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
let currentType = 'all';
let typeOffset = 0;
const typeLimit = 40; // quantidade por página ao filtrar por tipo
let pokemonsTypeList = []; // lista de todos os pokémons do tipo selecionado
let lastSearchedNumber = null; // NOVO: guarda o último número pesquisado

// Converte um objeto Pokémon em HTML para a lista
function converPokemonToHtml(pokemon) {
  const id = pokemon.id;
  const types = pokemon.types.map((typeInfo) => typeInfo.type.name);
  const typesHtml = types.map((type) => `<li class="type">${type}</li>`).join("");
  const mainType = types[0];
  return `
    <li class="pokemon type-${mainType}">
      <span class="number">#${id.toString().padStart(3, "0")}</span>
      <span class="name">${pokemon.name}</span>
      <div class="detail">
        <ol class="types">
          ${typesHtml}
        </ol>
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" alt="${pokemon.name}">
      </div>
    </li>
  `;
}

// Elementos do DOM
const pokemonlist = document.getElementById("pokemonlist");
const loadMoreBtn = document.getElementById("loadmore");
const loadingDiv = document.getElementById("loading");
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const themeBtn = document.getElementById('toggle-theme');

// Mostra animação de loading no botão "Carregar mais"
function showLottie() {
  loadMoreBtn.classList.add("loading-active");
  Array.from(loadMoreBtn.childNodes).forEach(node => {
    if (node.nodeType === 3) node.textContent = "";
  });
  loadingDiv.innerHTML = `<dotlottie-player src="${lottieUrl}" background="transparent" speed="1" style="width:90px;height:90px;" loop autoplay></dotlottie-player>`;
  loadingDiv.style.display = "block";
}

// Esconde animação de loading
function hideLottie() {
  loadMoreBtn.classList.remove("loading-active");
  loadMoreBtn.childNodes[0].textContent = "Carregar mais pokémons";
  loadingDiv.style.display = "none";
  loadingDiv.innerHTML = "";
}

// Carrega uma página de pokémons (detalhes)
async function carregarPokemons(offsetAtual) {
  const url = `https://pokeapi.co/api/v2/pokemon?offset=${offsetAtual}&limit=${limit}`;
  const response = await fetch(url);
  const jsonBody = await response.json();
  const pokemons = jsonBody.results;

  // Busca detalhes de cada pokémon (usa cache se já tiver)
  const detailPromises = pokemons.map((pokemon) => {
    const parts = pokemon.url.split("/");
    const id = parts[parts.length - 2];
    if (pokemonCache[id]) {
      return Promise.resolve(pokemonCache[id]);
    } else {
      return fetch(pokemon.url)
        .then((res) => res.json())
        .then((detail) => {
          pokemonCache[id] = detail;
          return detail;
        });
    }
  });

  const pokemonDetails = await Promise.all(detailPromises);
  renderPokemons(pokemonDetails);
}

// Renderiza pokémons na tela
function renderPokemons(pokemons) {
  pokemons.forEach((pokemon) => {
    pokemonlist.innerHTML += converPokemonToHtml(pokemon);
  });
  addPokemonClickEvents();
}

// Busca o resumo do pokémon (em português, senão em inglês)
async function getPokemonSummary(pokemon) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`);
  const data = await res.json();
  let entry = data.flavor_text_entries.find(e => e.language.name === "pt");
  if (entry) return entry.flavor_text.replace(/\f/g, ' ');
  entry = data.flavor_text_entries.find(e => e.language.name === "en");
  if (entry) return entry.flavor_text.replace(/\f/g, ' ');
  return "Sem descrição disponível.";
}

// Monta o HTML do modal de detalhes do pokémon
async function pokemonModalHtml(pokemon) {
  const summary = await getPokemonSummary(pokemon);
  const moves = pokemon.moves.slice(0, 8).map(m => `<li>${m.move.name.replace(/-/g, ' ')}</li>`).join('');
  const sprites = [
    pokemon.sprites.other?.['official-artwork']?.front_default,
    pokemon.sprites.front_default,
    pokemon.sprites.back_default,
    pokemon.sprites.front_shiny,
    pokemon.sprites.back_shiny
  ].filter(Boolean);
  const types = pokemon.types.map(t =>
    `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`
  ).join(' ');
  const mainType = pokemon.types[0].type.name;
  const typeColors = {
    grass:    "#7ee44b",
    fire:     "#e47f36",
    water:    "#78a0fe",
    bug:      "#d0e421",
    normal:   "#baba93",
    poison:   "#c84dc8",
    electric: "#f2c922",
    ground:   "#E0C068",
    fairy:    "#f57a95",
    fighting: "#e4362d",
    psychic:  "#ee4a7b",
    rock:     "#c4a931",
    ghost:    "#705898",
    ice:      "#9cf6f6",
    dragon:   "#7038F8"
  };
  const accent = typeColors[mainType] || "#2a75bb";
  return `
    <div class="poke-modal-header" style="background:linear-gradient(90deg,${accent} 60%,#fff 100%);">
      <span class="modal-close" id="modal-close" title="Fechar">&times;</span>
      <img src="${sprites[0]}" alt="${pokemon.name}" class="poke-main-img">
    </div>
    <div class="poke-modal-body">
      <h2 class="poke-name">${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} <span class="poke-id">#${pokemon.id}</span></h2>
      <div class="poke-types">${types}</div>
      <p class="poke-summary">${summary}</p>
      <div class="poke-gallery">
        ${sprites.slice(1).map(src => `<img src="${src}" alt="${pokemon.name}" class="poke-sprite">`).join('')}
      </div>
      <div class="poke-moves-section">
        <b>Principais movimentos:</b>
        <ul class="poke-moves-list">${moves}</ul>
      </div>
      <div class="poke-evolutions" id="poke-evolutions"></div>
    </div>
  `;
}

// Abre o modal de detalhes
async function openModal(pokemon) {
  const modal = document.getElementById('pokemon-modal');
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `<div style="padding:2em;text-align:center;"><dotlottie-player src="${lottieUrl}" background="transparent" speed="1" style="width:80px;height:80px;" loop autoplay></dotlottie-player></div>`;
  modal.style.display = 'flex';
  modalContent.innerHTML = await pokemonModalHtml(pokemon);
  document.getElementById('modal-close').onclick = closeModal;
  await loadEvolutions(pokemon);

  // Troca a imagem principal ao clicar em uma miniatura
  const sprites = [
    pokemon.sprites.other?.['official-artwork']?.front_default,
    pokemon.sprites.front_default,
    pokemon.sprites.back_default,
    pokemon.sprites.front_shiny,
    pokemon.sprites.back_shiny
  ].filter(Boolean);

  const mainImg = modalContent.querySelector('.poke-main-img');
  modalContent.querySelectorAll('.poke-sprite').forEach((img, i) => {
    img.onclick = () => {
      mainImg.src = img.src;
      // Destaque visual na miniatura selecionada (opcional)
      modalContent.querySelectorAll('.poke-sprite').forEach(s => s.classList.remove('selected'));
      img.classList.add('selected');
    };
  });
}

// Fecha o modal
function closeModal() {
  document.getElementById('pokemon-modal').style.display = 'none';
}

// Fecha o modal ao clicar fora do conteúdo
document.getElementById('pokemon-modal').onclick = function(e) {
  if (e.target === this) closeModal();
};

// Adiciona evento de clique nos cards dos pokémons
function addPokemonClickEvents() {
  document.querySelectorAll('.pokemon').forEach(card => {
    card.onclick = async () => {
      const id = card.querySelector('.number').textContent.replace('#','');
      const pokemon = Object.values(pokemonCache).find(p => p.id == id);
      if (pokemon) await openModal(pokemon);
    };
  });
}

// Carrega todos os pokémons (apenas nome e id) para busca rápida
async function carregarTodosPokemons() {
  const url = `https://pokeapi.co/api/v2/pokemon?offset=0&limit=10000`;
  const response = await fetch(url);
  const jsonBody = await response.json();
  allPokemonList = jsonBody.results.map(p => {
    const parts = p.url.split("/");
    return { name: p.name, id: parts[parts.length - 2] };
  });
}
carregarTodosPokemons();

// Carrega os primeiros pokémons ao iniciar
carregarPokemons(offset);

// Evento do botão "Carregar mais"
loadMoreBtn.addEventListener("click", async () => {
  showLottie();
  await new Promise(requestAnimationFrame);

  if (lastSearchedNumber !== null && currentType === 'all') {
    offset += limit;
    await carregarPokemons(offset);
  } else if (currentType === 'all') {
    offset += limit;
    await carregarPokemons(offset);
  } else {
    await carregarPokemonsTipo();
  }
  hideLottie();
});

// Funções de histórico de busca
function addToHistory(term) {
  if (!term) return;
  searchHistory = [term, ...searchHistory.filter(t => t !== term)].slice(0, 8);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  renderHistory();
}

function renderHistory() {
  let hist = document.getElementById('search-history');
  if (!hist) {
    hist = document.createElement('div');
    hist.id = 'search-history';
    hist.className = 'search-history';
    searchForm.parentNode.insertBefore(hist, searchForm.nextSibling);
  }
  hist.innerHTML = searchHistory.map(t => `<span class="hist-item">${t}</span>`).join('');
  hist.querySelectorAll('.hist-item').forEach(item => {
    item.onclick = () => {
      searchInput.value = item.textContent;
      searchForm.dispatchEvent(new Event('submit'));
    };
  });
}

renderHistory();

// Busca Pokémon por nome, parte do nome ou número (submit)
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const termo = searchInput.value.trim().toLowerCase();
  if (!termo) return;

  if (!isNaN(termo) && termo !== "") {
    lastSearchedNumber = parseInt(termo, 10);
    offset = lastSearchedNumber;
    await carregarPokemons(offset);
    return;
  } else {
    lastSearchedNumber = null;
    // Mostra loading
    pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; padding:2em;"><dotlottie-player src="${lottieUrl}" background="transparent" speed="1" style="width:60px;height:60px;" loop autoplay></dotlottie-player></li>`;

    try {
      let resultados = [];

      // Busca na lista completa por nome parcial ou número
      if (isNaN(termo)) {
        resultados = allPokemonList.filter(p =>
          p.name.includes(termo)
        );
        lastSearchedNumber = null; // Não é número, limpa
      } else {
        resultados = allPokemonList.filter(p =>
          p.id === termo
        );
        lastSearchedNumber = resultados.length > 0 ? parseInt(termo, 10) : null; // Salva o número pesquisado
      }

      // Limita para não travar (ex: mostra só os 20 primeiros)
      resultados = resultados.slice(0, 20);

      if (resultados.length === 0) {
        pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; color:#e4362d; font-size:1.2em; padding:2em;">Pokémon não encontrado.</li>`;
        return;
      }

      // Busca detalhes de cada resultado (usa cache se já tiver)
      const detalhes = await Promise.all(resultados.map(async p => {
        if (pokemonCache[p.id]) return pokemonCache[p.id];
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
        const detail = await res.json();
        pokemonCache[p.id] = detail;
        return detail;
      }));

      pokemonlist.innerHTML = '';
      detalhes.forEach(pokemon => {
        pokemonlist.innerHTML += converPokemonToHtml(pokemon);
      });
      addPokemonClickEvents();
    } catch (err) {
      pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; color:#e4362d; font-size:1.2em; padding:2em;">Pokémon não encontrado.</li>`;
    }
  }
});

// Busca dinâmica enquanto digita (busca parcial)
searchInput.addEventListener('input', async () => {
  const termo = searchInput.value.trim().toLowerCase();
  if (!termo) {
    pokemonlist.innerHTML = '';
    offset = 0;
    carregarPokemons(offset);
    return;
  }
  let resultados;
  if (isNaN(termo)) {
    resultados = allPokemonList.filter(p =>
      p.name.includes(termo)
    );
  } else {
    resultados = allPokemonList.filter(p =>
      p.id === termo
    );
  }
  resultados = resultados.slice(0, 20);

  if (resultados.length === 0) {
    pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; color:#e4362d; font-size:1.2em; padding:2em;">Pokémon não encontrado.</li>`;
    return;
  }

  const detalhes = await Promise.all(resultados.map(async p => {
    if (pokemonCache[p.id]) return pokemonCache[p.id];
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
    const detail = await res.json();
    pokemonCache[p.id] = detail;
    return detail;
  }));

  pokemonlist.innerHTML = '';
  detalhes.forEach(pokemon => {
    pokemonlist.innerHTML += converPokemonToHtml(pokemon);
  });
  addPokemonClickEvents();
});

document.getElementById('type-filter').onclick = async function(e) {
  if (!e.target.classList.contains('type-btn')) return;
  document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  const type = e.target.getAttribute('data-type');
  currentType = type;
  typeOffset = 0;
  pokemonsTypeList = [];
  pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; padding:2em;">
    <dotlottie-player src="${lottieUrl}" background="transparent" speed="1" style="width:60px;height:60px;" loop autoplay></dotlottie-player>
  </li>`;

  if (type === 'all') {
    pokemonlist.innerHTML = '';
    offset = 0;
    carregarPokemons(offset);
    return;
  }

  // Busca todos os pokémons do tipo na API (apenas uma vez)
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
    const data = await res.json();
    pokemonsTypeList = data.pokemon.map(p => p.pokemon);
    await carregarPokemonsTipo();
  } catch (err) {
    pokemonlist.innerHTML = `<li style="grid-column: 1/-1; text-align:center; color:#e4362d; font-size:1.2em; padding:2em;">Erro ao buscar pokémons desse tipo.</li>`;
  }
};

themeBtn.onclick = () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeBtn.textContent = isDark ? '☀️' : '🌙';
};

// Ao carregar a página, já define o emoji correto
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeBtn.textContent = '☀️';
} else {
  themeBtn.textContent = '🌙';
}

// Carrega tema salvo
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

async function loadEvolutions(pokemon) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`);
  const data = await res.json();
  const evoUrl = data.evolution_chain.url;
  const evoRes = await fetch(evoUrl);
  const evoData = await evoRes.json();

  // Função recursiva para pegar toda a cadeia evolutiva
  function getEvoChain(chain) {
    let arr = [];
    arr.push(chain.species);
    if (chain.evolves_to && chain.evolves_to.length > 0) {
      chain.evolves_to.forEach(evo => {
        arr = arr.concat(getEvoChain(evo));
      });
    }
    return arr;
  }

  const evoSpecies = getEvoChain(evoData.chain);

  // Monta HTML com imagem e nome
  const evoHtml = evoSpecies.map(species => {
    const urlParts = species.url.split('/');
    const evoId = urlParts[urlParts.length - 2];
    return `
      <div class="evo-card evo-click" data-id="${evoId}" style="cursor:pointer;">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evoId}.png" alt="${species.name}" class="evo-img">
        <div class="evo-name">${species.name.charAt(0).toUpperCase() + species.name.slice(1)}</div>
      </div>
    `;
  }).join('<span class="evo-arrow">➔</span>');

  document.getElementById('poke-evolutions').innerHTML =
    '<b>Evoluções:</b><div class="evo-list">' + evoHtml + '</div>';

  // Adiciona evento de clique para cada evolução
  document.querySelectorAll('.evo-click').forEach(card => {
    card.onclick = async (e) => {
      const id = card.getAttribute('data-id');
      // Busca no cache ou na API
      let poke = pokemonCache[id];
      if (!poke) {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        poke = await res.json();
        pokemonCache[id] = poke;
      }
      openModal(poke);
    };
  });
}

/* Estilos CSS em JavaScript (para histórico de busca) */
const style = document.createElement('style');
style.textContent = `
  .search-history {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    margin: 0.5em 0 1em 0;
    justify-content: center;
  }
  .hist-item {
    background: #eee;
    color: #2a75bb;
    border-radius: 1em;
    padding: 0.3em 1em;
    cursor: pointer;
    font-size: 0.95em;
    transition: background 0.2s;
  }
  .hist-item:hover {
    background: #2a75bb;
    color: #fff;
  }
`;
document.head.appendChild(style);

async function carregarPokemonsTipo() {
  // Pega o próximo "pedaço" da lista do tipo
  const pokemonsShow = pokemonsTypeList.slice(typeOffset, typeOffset + typeLimit);

  // Busca detalhes de cada pokémon (usa cache se já tiver)
  const detalhes = await Promise.all(pokemonsShow.map(async p => {
    const urlParts = p.url.split("/");
    const id = urlParts[urlParts.length - 2];
    if (pokemonCache[id]) return pokemonCache[id];
    const res = await fetch(p.url);
    const detail = await res.json();
    pokemonCache[id] = detail;
    return detail;
  }));

  // Se for a primeira página, limpa a lista
  if (typeOffset === 0) {
    pokemonlist.innerHTML = '';
  }
  detalhes.forEach(pokemon => {
    pokemonlist.innerHTML += converPokemonToHtml(pokemon);
  });
  addPokemonClickEvents();
  typeOffset += typeLimit;
}