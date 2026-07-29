document.addEventListener("DOMContentLoaded", () => {
    
    // --- Theme Switcher ---
    const themeSelect = document.getElementById('theme-switcher');
    if(themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-theme', e.target.value);
            showToast(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, "fa-palette");
        });
    }

    // --- Global State ---
    let currentPlaylist = [];
    let currentTrackIndex = -1;
    let isPlaying = false;
    let currentlyPlayingId = null; 

    // --- Floating Toast Logic ---
    const toastContainer = document.getElementById('toast-container');
    function showToast(message, iconClass = "fa-check") {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = "toast-slide 0.4s reverse forwards";
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // --- Skeleton Pre-render ---
    const containers = [
        'weekly-top-container', 'new-songs-container', 'old-songs-container',
        'album-container', 'playlist-container', 'artist-container',
        'radio-container', 'podcast-container'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            for(let i=0; i<5; i++) {
                el.innerHTML += `
                <div class="media-card skel-card">
                    <div class="skel-img skeleton"></div>
                    <div class="skel-line skeleton"></div>
                    <div class="skel-line short skeleton"></div>
                </div>`;
            }
        }
    });

    // --- Initialize Slider Arrows ---
    document.querySelectorAll('.slider-wrapper').forEach(wrapper => {
        const scrollContainer = wrapper.querySelector('.horizontal-scroll');
        const leftBtn = wrapper.querySelector('.slider-arrow.left');
        const rightBtn = wrapper.querySelector('.slider-arrow.right');

        if(leftBtn && rightBtn && scrollContainer) {
            leftBtn.addEventListener('click', () => {
                scrollContainer.scrollBy({ left: -scrollContainer.clientWidth / 1.5, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                scrollContainer.scrollBy({ left: scrollContainer.clientWidth / 1.5, behavior: 'smooth' });
            });
        }
    });

    // --- Fetch Data ---
    setTimeout(() => { 
        fetch('data.json')
            .then(res => res.json())
            .then(data => {
                initHeroSlider(data.heroSlides);
                renderCards(data.weeklyTop, 'weekly-top-container');
                renderCards(data.newSongs, 'new-songs-container');
                renderCards(data.oldSongs, 'old-songs-container');
                renderCards(data.albums, 'album-container');
                
                renderCards(data.playlists, 'playlist-container');
                renderCards(data.artists, 'artist-container');
                renderCards(data.radios, 'radio-container');
                renderCards(data.podcasts, 'podcast-container');
                
                renderMoods(data.moods);
                renderDecades(data.decades);
            })
            .catch(err => console.error("Error loading JSON:", err));
    }, 800);

    // --- Hero Slider ---
    function initHeroSlider(slides) {
        const slider = document.getElementById('hero-slider');
        const dotsContainer = document.getElementById('slider-dots');
        if(!slider) return;
        
        slider.innerHTML = ''; dotsContainer.innerHTML = '';
        
        slides.forEach((slide, idx) => {
            const slideEl = document.createElement('div');
            slideEl.className = `hero-slide ${idx === 0 ? 'active' : ''}`;
            slideEl.innerHTML = `
                <div class="hero-text">
                    <span class="badge">${slide.badge}</span>
                    <h1>${slide.title}</h1>
                    <p>${slide.desc}</p>
                    <button class="btn-play-hero micro-btn" data-idx="${idx}" title="Play ${slide.title}" aria-label="Play ${slide.title}">
                        <i class="fa-solid fa-play" aria-hidden="true"></i> Listen Now
                    </button>
                </div>
                <img src="${slide.cover}" alt="${slide.title}">
            `;
            slider.appendChild(slideEl);

            slideEl.querySelector('.btn-play-hero').addEventListener('click', () => {
                currentPlaylist = slides;
                loadAndPlayTrack(idx);
            });

            const dot = document.createElement('button');
            dot.className = `dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('title', `Go to slide ${idx + 1}`);
            dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
            dot.addEventListener('click', () => goToSlide(idx));
            dotsContainer.appendChild(dot);
        });

        let currentSlide = 0;
        function goToSlide(idx) {
            slider.children[currentSlide].classList.remove('active');
            dotsContainer.children[currentSlide].classList.remove('active');
            currentSlide = idx;
            slider.children[currentSlide].classList.add('active');
            dotsContainer.children[currentSlide].classList.add('active');
        }

        setInterval(() => {
            goToSlide((currentSlide + 1) % slides.length);
        }, 5000); 
    }

    // Helper to determine the section SVG icon
    function getIconForContainer(id) {
        if(id.includes('album')) return 'fa-compact-disc';
        if(id.includes('playlist')) return 'fa-list-music';
        if(id.includes('artist')) return 'fa-microphone-lines';
        if(id.includes('radio')) return 'fa-radio';
        if(id.includes('podcast')) return 'fa-podcast';
        return 'fa-music';
    }

    // --- Universal Card Renderer (Supports Custom URLs and strictly shows max 10) ---
    function renderCards(items, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = ''; 

        const displayItems = items.slice(0, 10);

        displayItems.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'media-card';
            card.dataset.id = item.id; 
            card.setAttribute('title', item.link ? `Go to ${item.title}` : `Play ${item.title}`);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            
            card.addEventListener('click', () => {
                if (item.link) {
                    window.location.href = item.link;
                } else {
                    currentPlaylist = [...items]; 
                    loadAndPlayTrack(index);
                }
            });

            card.innerHTML = `
                <div class="img-box">
                    <img src="${item.cover}" alt="${item.title}">
                    <div class="play-btn-overlay"><i class="fa-solid ${item.link ? 'fa-arrow-right' : 'fa-play'}" aria-hidden="true"></i></div>
                </div>
                <div class="card-title">${item.title}</div>
                <div class="card-meta">${item.artist}</div>
            `;
            container.appendChild(card);
        });

        // Appends the View All Card directly grabbing the URL from the Header's .see-all tag
        if(items.length > 0) {
            const section = container.closest('.content-section');
            const seeAllAnchor = section ? section.querySelector('.see-all') : null;
            const viewAllUrl = seeAllAnchor ? seeAllAnchor.getAttribute('href') : '#';
            
            const iconClass = getIconForContainer(containerId);
            const viewAllCard = document.createElement('a');
            viewAllCard.href = viewAllUrl;
            viewAllCard.className = 'media-card view-all-link';
            viewAllCard.setAttribute('title', 'View All');
            
            viewAllCard.innerHTML = `
                <div class="img-box view-all-box">
                    <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
                </div>
                <div class="card-title">View All</div>
                <div class="card-meta">Explore more</div>
            `;
            container.appendChild(viewAllCard);
        }
    }

    // --- Moods ---
    function renderMoods(moods) {
        const container = document.getElementById('moods-container');
        if(!container) return;
        container.innerHTML = '';
        moods.forEach(mood => {
            container.innerHTML += `
                <a href="${mood.link}" class="bento-card" title="Browse ${mood.title}" aria-label="Browse ${mood.title}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18m-4-13v8m8-11v14m-12-6v2m16-4v6"/></svg>
                    <span>${mood.title}</span>
                </a>`;
        });
    }

    // --- Decades ---
    function renderDecades(decades) {
        const container = document.getElementById('decades-container');
        if(!container) return;
        container.innerHTML = '';
        decades.forEach(decade => {
            container.innerHTML += `
                <a href="${decade.link}" class="decade-node" title="Browse ${decade.year}" aria-label="Browse ${decade.year}">
                    <span class="decade-year">${decade.year}</span>
                    <div class="decade-dot"></div>
                </a>`;
        });
    }

    // --- Search UX ---
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    const searchStats = document.getElementById('search-stats');

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.media-card:not(.skel-card):not(.view-all-link)');
            let matchCount = 0;

            clearBtn.classList.toggle('is-hidden', val.length === 0);

            cards.forEach(card => {
                const txt = card.innerText.toLowerCase();
                if(txt.includes(val)) {
                    card.classList.remove('is-hidden');
                    matchCount++;
                } else {
                    card.classList.add('is-hidden');
                }
            });

            if(val.length > 0) {
                searchStats.innerText = matchCount > 0 ? `Found ${matchCount} results` : "No songs found";
            } else {
                searchStats.innerText = "Showing all tracks";
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input')); 
        });
    }

    // --- Smooth Reveal ---
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal-section').forEach(sec => revealObserver.observe(sec));

    // --- Audio Engine ---
    const audio = document.getElementById('main-audio');
    const playBtn = document.getElementById('master-play');
    const scrubberDesktop = document.getElementById('seek-bar');
    const scrubberMobile = document.getElementById('seek-bar-mobile');
    const miniEq = document.getElementById('main-equalizer');

    async function loadAndPlayTrack(index) {
        if (index < 0 || index >= currentPlaylist.length) return;
        currentTrackIndex = index;
        const track = currentPlaylist[currentTrackIndex];
        currentlyPlayingId = track.id;

        document.documentElement.style.setProperty('--dynamic-bg-img', `url('${track.cover}')`);

        audio.src = track.audioUrl;
        document.getElementById('player-title').innerText = track.title;
        document.getElementById('player-artist').innerText = track.artist;
        document.getElementById('player-img').src = track.cover;
        
        updateActiveCards();
        renderQueueUI(); 

        try {
            await audio.play();
            isPlaying = true;
            updatePlayUI();
            showToast(`Now Playing: ${track.title}`, "fa-music");
        } catch (e) {
            isPlaying = false; updatePlayUI();
        }
    }

    function updateActiveCards() {
        document.querySelectorAll('.media-card').forEach(c => c.classList.remove('is-playing'));
        if(currentlyPlayingId) {
            document.querySelectorAll(`.media-card[data-id="${currentlyPlayingId}"]`).forEach(c => c.classList.add('is-playing'));
        }
    }

    if(playBtn) {
        playBtn.addEventListener('click', () => {
            if(!audio.src) return; 
            if(audio.paused) { audio.play(); isPlaying = true; }
            else { audio.pause(); isPlaying = false; }
            updatePlayUI();
        });
    }

    function updatePlayUI() {
        if(playBtn) playBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>' : '<i class="fa-solid fa-play" style="margin-left:3px" aria-hidden="true"></i>';
        if(miniEq) miniEq.classList.toggle('is-hidden', !isPlaying);
        const vImg = document.getElementById('player-img');
        if(vImg) isPlaying ? vImg.classList.add('playing') : vImg.classList.remove('playing');
    }

    document.getElementById('btn-next')?.addEventListener('click', () => {
        if(!currentPlaylist.length) return;
        loadAndPlayTrack((currentTrackIndex + 1) % currentPlaylist.length);
    });
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if(!currentPlaylist.length) return;
        loadAndPlayTrack((currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length);
    });
    audio.addEventListener('ended', () => document.getElementById('btn-next')?.click());

    audio.addEventListener('timeupdate', () => {
        if(audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            if(scrubberDesktop) {
                scrubberDesktop.value = pct;
                scrubberDesktop.style.setProperty('--progress-value', `${pct}%`);
            }
            if(scrubberMobile) {
                scrubberMobile.value = pct;
                scrubberMobile.style.setProperty('--progress-value', `${pct}%`);
            }
            const curr = document.getElementById('current-time');
            const tot = document.getElementById('total-time');
            if(curr) curr.innerText = formatTime(audio.currentTime);
            if(tot) tot.innerText = formatTime(audio.duration);
        }
    });

    const handleScrub = (e) => {
        if(audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
    };
    if(scrubberDesktop) scrubberDesktop.addEventListener('input', handleScrub);
    if(scrubberMobile) scrubberMobile.addEventListener('input', handleScrub);

    function formatTime(s) {
        if(isNaN(s)) return "0:00";
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- Queue ---
    const queuePanel = document.getElementById('queue-panel');
    const queueList = document.getElementById('queue-list');
    
    document.getElementById('btn-queue')?.addEventListener('click', () => queuePanel.classList.toggle('open'));
    document.getElementById('close-queue')?.addEventListener('click', () => queuePanel.classList.remove('open'));

    function renderQueueUI() {
        if(!queueList) return;
        queueList.innerHTML = '';
        currentPlaylist.forEach((track, idx) => {
            const isPlayingNow = (idx === currentTrackIndex);
            const item = document.createElement('button');
            item.className = `queue-item ${isPlayingNow ? 'playing' : ''}`;
            item.setAttribute('title', `Play ${track.title}`);
            item.setAttribute('aria-label', `Play ${track.title}`);
            
            item.innerHTML = `
                <img src="${track.cover}" alt="Cover">
                <div class="queue-item-info">
                    <div class="queue-title">${track.title}</div>
                    <div class="queue-meta">
                        <span>${track.artist}</span>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => loadAndPlayTrack(idx));
            queueList.appendChild(item);
        });
    }

    // --- Nav Spy ---
    const categoryLinks = document.querySelectorAll('.category-track a');
    const sections = document.querySelectorAll('.content-section, #home');
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                categoryLinks.forEach(link => {
                    link.classList.remove('active');
                    if(link.getAttribute('href') === '#' + entry.target.id) {
                        link.classList.add('active');
                        link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(sec => navObserver.observe(sec));

    // --- Fixed Back to Top Button ---
    const backToTopBtn = document.getElementById('back-to-top');
    if(backToTopBtn) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 400) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});